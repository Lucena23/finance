import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import PDFDocument = require('pdfkit');
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateFinancialReport(
    user: any,
    startDateStr: string,
    endDateStr: string,
    type: 'sintetico' | 'analitico',
  ): Promise<PDFKit.PDFDocument> {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException('Datas inicial e final são obrigatórias.');
    }

    // CORREÇÃO DO TIMEZONE: Construção manual a partir da string AAAA-MM-DD
    // Isso garante que a data local (ex: 20/09) não sofra offset de UTC virando 19/09
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const startDate = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));

    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const endDate = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

    const familyId = user.familyAccountId;

    const paymentItems = await this.prisma.paymentItem.findMany({
      where: {
        dueDate: { gte: startDate, lte: endDate },
        expense: { familyAccountId: familyId },
        OR: [
          { expense: { deletedAt: null } },
          { status: PaymentStatus.PAID },
        ],
      },
      include: {
        expense: { include: { category: true, createdBy: true } },
        paidBy: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });

    // Cores Premium
    const colors = {
      primary: '#06777F',
      primaryLight: '#E6F2F3',
      dark: '#131517',
      gray: '#6B7280',
      lightGray: '#F3F4F6',
      border: '#E5E7EB',
      danger: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B',
      user1: '#8B5CF6',
      user2: '#EC4899',
      user3: '#3B82F6',
      user4: '#F97316',
    };

    const formatCurrency = (val: number) =>
      (val / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

    // Formata DD/MM/AAAA preservando a string original perfeitamente para o cabeçalho
    const formatBRDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const margin = 50;
    const contentWidth = 595.28 - margin * 2;

    // ==========================================
    // 1. CABEÇALHO PREMIUM
    // ==========================================
    doc.rect(0, 0, 595.28, 12).fill(colors.primary);
    doc.rect(0, 12, 595.28, 110).fill('#FAFAFA');

    let currentY = 40;

    const logoPath = path.join(
      process.cwd(),
      '../frontend/public/logo-dark.png',
    );
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin, currentY, { height: 28 });
    } else {
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(colors.primary)
        .text('AKSURIM', margin, currentY);
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(colors.dark)
      .text('RELATÓRIO FINANCEIRO', margin, currentY, {
        align: 'right',
        width: contentWidth,
      });

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(colors.gray)
      .text(
        `Período analisado: ${formatBRDate(startDateStr)} a ${formatBRDate(endDateStr)}`,
        margin,
        currentY + 22,
        { align: 'right', width: contentWidth },
      )
      .text(
        `Visão: ${type === 'analitico' ? 'Analítica (Detalhada)' : 'Sintética (Resumo Estratégico)'}`,
        margin,
        currentY + 36,
        { align: 'right', width: contentWidth },
      )
      .text(
        `Emitido em: ${new Date().toLocaleDateString('pt-BR')}`,
        margin,
        currentY + 50,
        { align: 'right', width: contentWidth },
      );

    doc
      .moveTo(0, 122)
      .lineTo(595.28, 122)
      .lineWidth(1)
      .strokeColor(colors.border)
      .stroke();

    currentY = 155;

    // ==========================================
    // 2. CÁLCULOS E TOTALIZADORES
    // ==========================================
    const paidList = paymentItems.filter((p) => p.status === PaymentStatus.PAID);
    const pendingList = paymentItems.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );

    const totalPaid = paidList.reduce(
      (acc, curr) => acc + (curr.paidAmount || curr.expectedAmount),
      0,
    );
    const totalPending = pendingList.reduce(
      (acc, curr) => acc + curr.expectedAmount,
      0,
    );
    const grandTotal = totalPaid + totalPending;

    let totalInterest = 0;
    let interestCount = 0;
    let totalDiscount = 0;
    let discountCount = 0;

    for (const item of paidList) {
      const expected = item.expectedAmount ?? 0;
      const paid = item.paidAmount ?? expected;
      const isReadjustment = Boolean(item.notes?.startsWith('[Reajuste:'));

      if (paid > expected && !isReadjustment) {
        totalInterest += paid - expected;
        interestCount += 1;
      } else if (paid < expected) {
        totalDiscount += expected - paid;
        discountCount += 1;
      }
    }

    // ==========================================
    // 3. CARDS DE RESUMO PREMIUM
    // ==========================================
    const cardWidth = (contentWidth - 30) / 3;

    const drawPremiumCard = (
      x: number,
      y: number,
      title: string,
      value: string,
      accentColor: string,
    ) => {
      doc
        .roundedRect(x, y, cardWidth, 72, 8)
        .lineWidth(1)
        .strokeColor(colors.border)
        .stroke();
      doc.roundedRect(x, y, cardWidth, 72, 8).fill('#FFFFFF');
      doc.roundedRect(x, y, 6, 72, 6).fill(accentColor);
      doc.rect(x + 3, y, 3, 72).fill(accentColor);
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(colors.gray)
        .text(title, x + 20, y + 16);
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor(colors.dark)
        .text(value, x + 20, y + 40);
    };

    drawPremiumCard(
      margin,
      currentY,
      'Total Pago',
      formatCurrency(totalPaid),
      colors.success,
    );
    drawPremiumCard(
      margin + cardWidth + 15,
      currentY,
      'Total a Pagar',
      formatCurrency(totalPending),
      colors.warning,
    );
    drawPremiumCard(
      margin + (cardWidth + 15) * 2,
      currentY,
      'Total do Período',
      formatCurrency(grandTotal),
      colors.primary,
    );

    currentY += 95;

    // ==========================================
    // 3.1. DEMONSTRATIVO DE JUROS E ECONOMIA (Exibido apenas quando há dados)
    // ==========================================
    if (totalInterest > 0 || totalDiscount > 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(colors.dark)
        .text('Diagnóstico de Juros, Encargos e Economia', margin, currentY);
      currentY += 18;

      const halfWidth = (contentWidth - 15) / 2;

      // Card de Juros/Multas
      doc
        .roundedRect(margin, currentY, halfWidth, 54, 6)
        .lineWidth(1)
        .strokeColor(colors.border)
        .stroke();
      doc
        .roundedRect(margin, currentY, halfWidth, 54, 6)
        .fill(totalInterest > 0 ? '#FEF2F2' : '#F8FAFC');
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(totalInterest > 0 ? colors.danger : colors.gray)
        .text(
          totalInterest > 0
            ? `Perda com Juros e Multas (${interestCount} conta${interestCount > 1 ? 's' : ''})`
            : 'Perda com Juros e Multas (0 contas)',
          margin + 12,
          currentY + 10,
        );
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(totalInterest > 0 ? colors.danger : colors.dark)
        .text(
          totalInterest > 0 ? `+${formatCurrency(totalInterest)}` : 'R$ 0,00',
          margin + 12,
          currentY + 28,
        );

      // Card de Descontos/Economia
      const secondX = margin + halfWidth + 15;
      doc
        .roundedRect(secondX, currentY, halfWidth, 54, 6)
        .lineWidth(1)
        .strokeColor(colors.border)
        .stroke();
      doc
        .roundedRect(secondX, currentY, halfWidth, 54, 6)
        .fill(totalDiscount > 0 ? '#ECFDF5' : '#F8FAFC');
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(totalDiscount > 0 ? colors.success : colors.gray)
        .text(
          totalDiscount > 0
            ? `Economia com Descontos (${discountCount} conta${discountCount > 1 ? 's' : ''})`
            : 'Economia com Descontos (0 contas)',
          secondX + 12,
          currentY + 10,
        );
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(totalDiscount > 0 ? colors.success : colors.dark)
        .text(
          totalDiscount > 0 ? `-${formatCurrency(totalDiscount)}` : 'R$ 0,00',
          secondX + 12,
          currentY + 28,
        );

      currentY += 74;
    }

    // ==========================================
    // 4. GRÁFICO DE DISTRIBUIÇÃO POR CATEGORIA
    // ==========================================
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(colors.dark)
      .text('Distribuição de Gastos por Categoria', margin, currentY);
    currentY += 25;

    const categoryTotals: Record<string, number> = {};
    for (const item of paymentItems) {
      const catName = item.expense.category.name;
      categoryTotals[catName] =
        (categoryTotals[catName] || 0) +
        (item.status === PaymentStatus.PAID
          ? item.paidAmount || item.expectedAmount
          : item.expectedAmount);
    }
    const sortedCategories = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1],
    );

    if (sortedCategories.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(colors.gray)
        .text(
          'Nenhum dado financeiro encontrado neste período.',
          margin,
          currentY,
        );
      currentY += 30;
    } else {
      for (const [catName, total] of sortedCategories) {
        if (currentY > 700) {
          doc.addPage();
          currentY = margin + 20;
        }
        const percentage = grandTotal > 0 ? total / grandTotal : 0;
        const barMaxWidth = contentWidth - 210;
        const barWidth = percentage * barMaxWidth;

        let displayCatName = catName;
        if (displayCatName.length > 18)
          displayCatName = displayCatName.substring(0, 18) + '...';

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(colors.dark)
          .text(displayCatName, margin, currentY + 3);
        doc
          .roundedRect(margin + 130, currentY + 4, barMaxWidth, 10, 5)
          .fill(colors.primaryLight);
        if (barWidth > 0) {
          doc
            .roundedRect(
              margin + 130,
              currentY + 4,
              Math.max(barWidth, 10),
              10,
              5,
            )
            .fill(colors.primary);
        }
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(colors.gray)
          .text(
            formatCurrency(total),
            margin + 130 + barMaxWidth + 10,
            currentY + 3,
            { width: 70, align: 'right' },
          );

        currentY += 28;
      }
    }

    // ==========================================
    // 5. VISÃO ANALÍTICA
    // ==========================================
    if (type === 'analitico') {
      doc.addPage();
      currentY = margin;

      // -- GRÁFICO: PROPORÇÃO POR FAMILIAR --
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(colors.dark)
        .text('Proporção de Pagamentos por Familiar', margin, currentY);
      currentY += 25;

      const userTotals: Record<string, number> = {};
      let totalPaidByUsers = 0;
      for (const item of paymentItems) {
        if (item.status === PaymentStatus.PAID) {
          const userName = item.paidBy?.name || 'Não Identificado';
          const val = item.paidAmount || item.expectedAmount;
          userTotals[userName] = (userTotals[userName] || 0) + val;
          totalPaidByUsers += val;
        }
      }

      const sortedUsers = Object.entries(userTotals).sort(
        (a, b) => b[1] - a[1],
      );

      if (sortedUsers.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(colors.gray)
          .text('Nenhum pagamento registrado no período.', margin, currentY);
        currentY += 40;
      } else {
        const barColors = [
          colors.primary,
          colors.user1,
          colors.user2,
          colors.user3,
          colors.user4,
          colors.warning,
        ];

        doc
          .roundedRect(margin, currentY, contentWidth, 16, 8)
          .fill(colors.lightGray);

        let startX = margin;
        for (let i = 0; i < sortedUsers.length; i++) {
          const [, uTotal] = sortedUsers[i];
          const pct = uTotal / totalPaidByUsers;
          const w = pct * contentWidth;
          if (w > 0) {
            doc
              .rect(startX, currentY, w, 16)
              .fill(barColors[i % barColors.length]);
            startX += w;
          }
        }
        doc
          .roundedRect(margin, currentY, contentWidth, 16, 8)
          .lineWidth(3)
          .strokeColor('#FFFFFF')
          .stroke();

        currentY += 30;

        let legendX = margin;
        let legendY = currentY;

        for (let i = 0; i < sortedUsers.length; i++) {
          const [uName, uTotal] = sortedUsers[i];
          const pct = (uTotal / totalPaidByUsers) * 100;

          if (legendX > margin + contentWidth - 120) {
            legendX = margin;
            legendY += 20;
          }

          doc
            .circle(legendX + 5, legendY + 5, 5)
            .fill(barColors[i % barColors.length]);
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(colors.dark)
            .text(`${uName}: `, legendX + 15, legendY + 1, { continued: true });
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(colors.gray)
            .text(` ${formatCurrency(uTotal)} (${pct.toFixed(1)}%)`);

          legendX += 160;
        }
        currentY = legendY + 40;
      }

      // -- TABELA DE TRANSAÇÕES DETALHADA --
      if (currentY > 700) {
        doc.addPage();
        currentY = margin;
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(colors.dark)
        .text('Detalhamento de Transações', margin, currentY);
      currentY += 25;

      const cols = {
        date: margin,
        desc: margin + 65,
        payer: margin + 180,
        cat: margin + 270,
        status: margin + 345,
        val: margin + 425,
      };

      doc
        .roundedRect(margin, currentY, contentWidth, 26, 4)
        .fill(colors.primary);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#FFFFFF')
        .text('Vencimento', cols.date + 10, currentY + 8)
        .text('Descrição', cols.desc, currentY + 8)
        .text('Membro / Pagador', cols.payer, currentY + 8)
        .text('Categoria', cols.cat, currentY + 8)
        .text('Status', cols.status, currentY + 8)
        .text('Valor (R$)', cols.val, currentY + 8);

      currentY += 34;

      if (paymentItems.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(colors.gray)
          .text('Nenhuma transação encontrada.', margin, currentY + 10, {
            align: 'center',
            width: contentWidth,
          });
      }

      for (let i = 0; i < paymentItems.length; i++) {
        const item = paymentItems[i];

        const hasDesc = !!item.expense.description;
        const hasNotes = !!item.notes;
        let extraLines = 0;
        if (hasDesc) extraLines++;
        if (hasNotes) extraLines++;
        const rowHeight = 24 + extraLines * 12;

        if (currentY + rowHeight > 740) {
          doc.addPage();
          currentY = margin;

          doc
            .roundedRect(margin, currentY, contentWidth, 26, 4)
            .fill(colors.primary);
          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#FFFFFF')
            .text('Vencimento', cols.date + 10, currentY + 8)
            .text('Descrição', cols.desc, currentY + 8)
            .text('Membro / Pagador', cols.payer, currentY + 8)
            .text('Categoria', cols.cat, currentY + 8)
            .text('Status', cols.status, currentY + 8)
            .text('Valor (R$)', cols.val, currentY + 8);
          currentY += 34;
        }

        if (i % 2 === 0) {
          doc
            .rect(margin, currentY - 4, contentWidth, rowHeight)
            .fill('#F8FAFC');
        }

        const dateStr = item.dueDate.toLocaleDateString('pt-BR', {
          timeZone: 'UTC',
        });
        let title = item.expense.title;
        if (title.length > 25) title = title.substring(0, 25) + '...';

        let payerName =
          item.status === PaymentStatus.PAID && item.paidBy
            ? item.paidBy.name
            : '--';
        if (payerName.length > 15)
          payerName = payerName.substring(0, 15) + '...';

        let catStr = item.expense.category.name;
        if (catStr.length > 13) catStr = catStr.substring(0, 13) + '...';

        let statusText = 'Pendente';
        let statusColor = colors.warning;
        let valStr = formatCurrency(item.expectedAmount);

        if (item.status === PaymentStatus.PAID) {
          const paidVal = item.paidAmount || item.expectedAmount;
          valStr = formatCurrency(paidVal);
          statusColor = colors.success;

          if (item.notes?.startsWith('[Pagamento Parcial')) {
            statusText = 'Pago (Parcial)';
          } else if (item.notes?.startsWith('[Reajuste:')) {
            statusText = 'Pago (Reajust.)';
          } else if (paidVal > item.expectedAmount) {
            statusText = 'Pago (c/ Juros)';
            statusColor = colors.danger;
          } else if (paidVal < item.expectedAmount) {
            statusText = 'Pago (Desconto)';
          } else {
            statusText = 'Pago';
          }
        } else {
          const isOverdue =
            item.dueDate.getTime() <
            new Date(
              Date.UTC(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate(),
              ),
            ).getTime();

          if (isOverdue) {
            statusText = item.notes?.startsWith('[Saldo Restante')
              ? 'Atraso (Saldo)'
              : 'Atrasado';
            statusColor = colors.danger;
          } else if (item.notes?.startsWith('[Saldo Restante')) {
            statusText = 'Saldo Restante';
          }
        }

        const textY = currentY + 2;

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(colors.dark)
          .text(title, cols.desc, textY);

        let descY = textY + 12;
        if (hasDesc) {
          let descText = item.expense.description as string;
          if (descText.length > 42)
            descText = descText.substring(0, 42) + '...';
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(colors.gray)
            .text(descText, cols.desc, descY);
          descY += 12;
        }
        if (hasNotes) {
          let notesText = `Obs: ${item.notes}`;
          if (notesText.length > 48)
            notesText = notesText.substring(0, 48) + '...';
          doc
            .font('Helvetica-Oblique')
            .fontSize(8)
            .fillColor(colors.gray)
            .text(notesText, cols.desc, descY);
        }

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.dark)
          .text(dateStr, cols.date + 5, textY)
          .text(payerName, cols.payer, textY)
          .text(catStr, cols.cat, textY);

        doc
          .font('Helvetica-Bold')
          .fillColor(statusColor)
          .text(statusText, cols.status, textY);
        doc
          .font('Helvetica')
          .fillColor(colors.dark)
          .text(valStr, cols.val, textY);

        doc
          .moveTo(margin, currentY + rowHeight - 4)
          .lineTo(margin + contentWidth, currentY + rowHeight - 4)
          .lineWidth(0.5)
          .strokeColor('#F1F5F9')
          .stroke();
        currentY += rowHeight;
      }
    }

    // ==========================================
    // 6. RODAPÉ GLOBAL
    // ==========================================
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      const footerY = 800;

      doc
        .moveTo(margin, footerY - 10)
        .lineTo(margin + contentWidth, footerY - 10)
        .lineWidth(1)
        .strokeColor(colors.border)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          `Gerado automaticamente por Aksurim Software - Documento de uso restrito e pessoal`,
          margin,
          footerY,
          { align: 'left' },
        );

      doc
        .font('Helvetica-Bold')
        .text(`Página ${i + 1} de ${pages.count}`, margin, footerY, {
          align: 'right',
          width: contentWidth,
        });
    }

    return doc;
  }

  /**
   * Exportação simples em CSV de todos os lançamentos da família (LGPD — portabilidade).
   * Disponível para todos os planos (Free e Premium).
   */
  async generateCsvExport(familyAccountId: string): Promise<string> {
    const items = await this.prisma.paymentItem.findMany({
      where: {
        expense: { familyAccountId },
        OR: [
          { expense: { deletedAt: null } },
          { status: PaymentStatus.PAID },
        ],
      },
      include: {
        expense: {
          select: {
            title: true,
            type: true,
            category: { select: { name: true } },
          },
        },
        paidBy: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const escapeCsv = (val: string | number | null | undefined): string => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = [
      'Data Vencimento',
      'Despesa',
      'Categoria',
      'Tipo',
      'Parcela',
      'Valor Previsto (R$)',
      'Status',
      'Valor Pago (R$)',
      'Diferença / Juros / Desconto (R$)',
      'Data Pagamento',
      'Pago Por',
      'Observações',
    ].join(';');

    const rows = items.map((item) => {
      const dueStr = item.dueDate.toISOString().slice(0, 10);
      const paidAtStr = item.paidAt
        ? item.paidAt.toISOString().slice(0, 10)
        : '';
      const expectedBrl = (item.expectedAmount / 100)
        .toFixed(2)
        .replace('.', ',');
      const paidBrl =
        item.paidAmount !== null && item.paidAmount !== undefined
          ? (item.paidAmount / 100).toFixed(2).replace('.', ',')
          : '';
      const diffCents =
        item.status === 'PAID' && item.paidAmount !== null
          ? item.paidAmount - item.expectedAmount
          : 0;
      const diffBrl =
        diffCents !== 0
          ? (diffCents / 100).toFixed(2).replace('.', ',')
          : '0,00';
      const installmentStr = `${item.installmentNumber}/${item.totalInstallments}`;

      return [
        escapeCsv(dueStr),
        escapeCsv(item.expense.title),
        escapeCsv(item.expense.category.name),
        escapeCsv(item.expense.type),
        escapeCsv(installmentStr),
        escapeCsv(expectedBrl),
        escapeCsv(item.status === 'PAID' ? 'PAGO' : 'PENDENTE'),
        escapeCsv(paidBrl),
        escapeCsv(diffBrl),
        escapeCsv(paidAtStr),
        escapeCsv(item.paidBy?.name ?? ''),
        escapeCsv(item.notes ?? ''),
      ].join(';');
    });

    return '\uFEFF' + [header, ...rows].join('\r\n');
  }
}
