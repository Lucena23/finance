import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import { AdminLead } from './admin.service';

/**
 * Formatos de exportação de leads suportados (TAREFA 27 / RN-15).
 */
export type LeadExportFormat = 'pdf' | 'csv';

/**
 * Resultado binário de uma exportação de leads.
 * O `contentType` e o `filename` são consumidos pelo controller para
 * montar os headers HTTP de download.
 */
export interface LeadExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

/**
 * Paleta oficial Aksurim (RN-13) — usada no PDF para apresentação a
 * parceiros de crédito (BLUEPRINT §6 — "PDF bonito e legível").
 */
const AKSURIM_COLORS = {
  primary: '#06777F',
  warning: '#FB4629',
  highlight: '#DAF043',
  dark: '#282828',
  light: '#F5F7F8',
  border: '#D9DEE2',
} as const;

/**
 * Colunas obrigatórias do relatório de leads (TAREFA 27):
 * Nome, E-mail, CPF mascarado, Data e Status.
 */
const LEAD_COLUMNS: readonly { key: keyof AdminLead; label: string }[] = [
  { key: 'userName', label: 'Nome' },
  { key: 'userEmail', label: 'E-mail' },
  { key: 'ownerCpfMasked', label: 'CPF' },
  { key: 'createdAt', label: 'Data' },
  { key: 'isEmailVerified', label: 'Status' },
] as const;

/**
 * LeadExportService — geração de relatórios de leads em PDF e CSV.
 * TAREFA 27 / RN-15.
 *
 * ATENÇÃO: este service NÃO acessa o banco. Ele recebe a lista de leads já
 * extraída pelo AdminService (único ponto autorizado a consultar dados
 * cross-tenant) e apenas serializa o conteúdo para download.
 */
@Injectable()
export class LeadExportService {
  /**
   * Serializa a lista de leads no formato solicitado.
   */
  async export(
    leads: AdminLead[],
    format: LeadExportFormat,
  ): Promise<LeadExportResult> {
    if (format === 'csv') {
      return this.buildCsv(leads);
    }

    return this.buildPdf(leads);
  }

  /**
   * Gera o CSV (UTF-8 com BOM para compatibilidade com Excel pt-BR).
   */
  private buildCsv(leads: AdminLead[]): LeadExportResult {
    const header = LEAD_COLUMNS.map((column) => column.label).join(';');

    const rows = leads.map((lead) =>
      LEAD_COLUMNS.map((column) => this.formatCsvCell(lead, column.key)).join(
        ';',
      ),
    );

    const csv = [header, ...rows].join('\r\n');
    // BOM (\uFEFF) garante acentuação correta ao abrir no Excel.
    const buffer = Buffer.from(`\uFEFF${csv}`, 'utf-8');

    return {
      buffer,
      contentType: 'text/csv; charset=utf-8',
      filename: this.buildFilename('csv'),
    };
  }

  /**
   * Formata uma célula do CSV, aplicando escape e conversão de status.
   */
  private formatCsvCell(lead: AdminLead, key: keyof AdminLead): string {
    if (key === 'isEmailVerified') {
      return lead.isEmailVerified ? 'Verificado' : 'Pendente';
    }

    if (key === 'createdAt') {
      return this.formatDate(lead.createdAt);
    }

    const raw = lead[key];
    const value = raw === null || raw === undefined ? '' : String(raw);

    // Escape: aspas duplicadas e encapsulamento quando há separador.
    const escaped = value.replace(/"/g, '""');
    return /[;"\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  /**
   * Gera o PDF de leads com identidade visual Aksurim (RN-13).
   * Layout tabular com cabeçalho, zebra striping e rodapé paginado.
   *
   * O PDFKit emite os chunks de forma assíncrona; aguardamos o evento `end`
   * do stream para garantir que o buffer esteja completo antes de retornar.
   */
  private buildPdf(leads: AdminLead[]): Promise<LeadExportResult> {
    return new Promise<LeadExportResult>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        info: {
          Title: 'Relatório de Leads — Finanças Aksurim',
          Author: 'Aksurim Software',
          Subject: 'Extração de leads comerciais',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: 'application/pdf',
          filename: this.buildFilename('pdf'),
        });
      });
      doc.on('error', (error: Error) => reject(error));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // ── Cabeçalho institucional ──────────────────────────────
      doc.rect(0, 0, pageWidth, 70).fill(AKSURIM_COLORS.dark);

      doc
        .fillColor(AKSURIM_COLORS.highlight)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('AKSURIM', margin, 22, { continued: true })
        .fillColor('#FFFFFF')
        .font('Helvetica')
        .text('  ·  Painel Administrativo');

      doc
        .fillColor('#C9D1D6')
        .fontSize(9)
        .font('Helvetica')
        .text('Relatório de Leads Comerciais', margin, 48);

      doc
        .fillColor('#C9D1D6')
        .fontSize(9)
        .text(
          `Gerado em ${this.formatDateTime(new Date().toISOString())}`,
          margin,
          48,
          { align: 'right', width: contentWidth },
        );

      // ── Resumo ───────────────────────────────────────────────
      let cursorY = 92;
      doc
        .fillColor(AKSURIM_COLORS.dark)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Total de leads: ${leads.length}`, margin, cursorY);

      cursorY += 24;

      // ── Cabeçalho da tabela ──────────────────────────────────
      const columnWidths = this.computeColumnWidths(contentWidth);
      const rowHeight = 22;

      const drawTableHeader = (y: number): number => {
        doc
          .rect(margin, y, contentWidth, rowHeight)
          .fill(AKSURIM_COLORS.primary);

        let x = margin;
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

        LEAD_COLUMNS.forEach((column, index) => {
          doc.text(column.label, x + 6, y + 7, {
            width: columnWidths[index] - 12,
            ellipsis: true,
          });
          x += columnWidths[index];
        });

        return y + rowHeight;
      };

      let y = drawTableHeader(cursorY);

      // ── Linhas ───────────────────────────────────────────────
      leads.forEach((lead, rowIndex) => {
        // Quebra de página quando o cursor ultrapassa o rodapé.
        if (y + rowHeight > pageHeight - margin - 20) {
          doc.addPage();
          y = drawTableHeader(margin);
        }

        if (rowIndex % 2 === 1) {
          doc
            .rect(margin, y, contentWidth, rowHeight)
            .fill(AKSURIM_COLORS.light);
        }

        let x = margin;
        doc.fillColor(AKSURIM_COLORS.dark).fontSize(9).font('Helvetica');

        LEAD_COLUMNS.forEach((column, index) => {
          const value = this.formatPdfCell(lead, column.key);

          if (column.key === 'isEmailVerified') {
            doc
              .fillColor(
                lead.isEmailVerified
                  ? AKSURIM_COLORS.primary
                  : AKSURIM_COLORS.warning,
              )
              .font('Helvetica-Bold');
          } else {
            doc.fillColor(AKSURIM_COLORS.dark).font('Helvetica');
          }

          doc.text(value, x + 6, y + 7, {
            width: columnWidths[index] - 12,
            ellipsis: true,
          });
          x += columnWidths[index];
        });

        // Linha divisória inferior.
        doc
          .moveTo(margin, y + rowHeight)
          .lineTo(margin + contentWidth, y + rowHeight)
          .strokeColor(AKSURIM_COLORS.border)
          .lineWidth(0.5)
          .stroke();

        y += rowHeight;
      });

      // ── Rodapé ───────────────────────────────────────────────
      doc
        .fillColor('#8A949B')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Documento confidencial — Aksurim Software. CPF exibido de forma mascarada (LGPD).',
          margin,
          pageHeight - margin,
          { align: 'center', width: contentWidth },
        );

      doc.end();
    });
  }

  /**
   * Formata uma célula do PDF (status legível + data formatada).
   */
  private formatPdfCell(lead: AdminLead, key: keyof AdminLead): string {
    if (key === 'isEmailVerified') {
      return lead.isEmailVerified ? 'Verificado' : 'Pendente';
    }

    if (key === 'createdAt') {
      return this.formatDate(lead.createdAt);
    }

    const raw = lead[key];
    return raw === null || raw === undefined ? '—' : String(raw);
  }

  /**
   * Distribui a largura útil entre as colunas obrigatórias.
   * Nome e E-mail recebem mais espaço; CPF, Data e Status são fixos.
   */
  private computeColumnWidths(contentWidth: number): number[] {
    const weights: Record<keyof AdminLead, number> = {
      userName: 0.24,
      userEmail: 0.3,
      ownerCpfMasked: 0.16,
      createdAt: 0.16,
      isEmailVerified: 0.14,
      familyAccountId: 0,
      familyName: 0,
      userWhatsapp: 0,
      userRole: 0,
    };

    return LEAD_COLUMNS.map((column) =>
      Math.floor(contentWidth * weights[column.key]),
    );
  }

  /**
   * Nome de arquivo padronizado com timestamp (sem caracteres inválidos).
   */
  private buildFilename(extension: LeadExportFormat): string {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    return `aksurim-leads-${stamp}.${extension}`;
  }

  /**
   * Formata data ISO para o padrão brasileiro (dd/mm/aaaa).
   */
  private formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  /**
   * Formata data/hora ISO para o padrão brasileiro (dd/mm/aaaa hh:mm).
   */
  private formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}
