"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const PDFDocument = require("pdfkit");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateFinancialReport(user, startDateStr, endDateStr, type) {
        if (!startDateStr || !endDateStr) {
            throw new common_1.BadRequestException('Datas inicial e final são obrigatórias.');
        }
        const [sy, sm, sd] = startDateStr.split('-').map(Number);
        const startDate = new Date(sy, sm - 1, sd, 0, 0, 0);
        const [ey, em, ed] = endDateStr.split('-').map(Number);
        const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        const familyId = user.familyAccountId;
        const paymentItems = await this.prisma.paymentItem.findMany({
            where: {
                dueDate: { gte: startDate, lte: endDate },
                expense: { familyAccountId: familyId },
            },
            include: {
                expense: { include: { category: true, createdBy: true } },
                paidBy: true,
            },
            orderBy: { dueDate: 'asc' }
        });
        const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
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
            user4: '#F97316'
        };
        const formatCurrency = (val) => (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formatBRDate = (dateStr) => {
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        };
        const margin = 50;
        const contentWidth = 595.28 - (margin * 2);
        doc.rect(0, 0, 595.28, 12).fill(colors.primary);
        doc.rect(0, 12, 595.28, 110).fill('#FAFAFA');
        let currentY = 40;
        const logoPath = path.join(process.cwd(), '../frontend/public/logo-dark.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, currentY, { height: 28 });
        }
        else {
            doc.font('Helvetica-Bold').fontSize(24).fillColor(colors.primary).text('AKSURIM', margin, currentY);
        }
        doc.font('Helvetica-Bold').fontSize(16).fillColor(colors.dark)
            .text('RELATÓRIO FINANCEIRO', margin, currentY, { align: 'right', width: contentWidth });
        doc.font('Helvetica').fontSize(10).fillColor(colors.gray)
            .text(`Período analisado: ${formatBRDate(startDateStr)} a ${formatBRDate(endDateStr)}`, margin, currentY + 22, { align: 'right', width: contentWidth })
            .text(`Visão: ${type === 'analitico' ? 'Analítica (Detalhada)' : 'Sintética (Resumo Estratégico)'}`, margin, currentY + 36, { align: 'right', width: contentWidth })
            .text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, margin, currentY + 50, { align: 'right', width: contentWidth });
        doc.moveTo(0, 122).lineTo(595.28, 122).lineWidth(1).strokeColor(colors.border).stroke();
        currentY = 160;
        const totalPaid = paymentItems.filter(p => p.status === client_1.PaymentStatus.PAID).reduce((acc, curr) => acc + (curr.paidAmount || curr.expectedAmount), 0);
        const totalPending = paymentItems.filter(p => p.status === client_1.PaymentStatus.PENDING).reduce((acc, curr) => acc + curr.expectedAmount, 0);
        const grandTotal = totalPaid + totalPending;
        const cardWidth = (contentWidth - 30) / 3;
        const drawPremiumCard = (x, y, title, value, accentColor) => {
            doc.roundedRect(x, y, cardWidth, 75, 8).lineWidth(1).strokeColor(colors.border).stroke();
            doc.roundedRect(x, y, cardWidth, 75, 8).fill('#FFFFFF');
            doc.roundedRect(x, y, 6, 75, 6).fill(accentColor);
            doc.rect(x + 3, y, 3, 75).fill(accentColor);
            doc.font('Helvetica').fontSize(11).fillColor(colors.gray).text(title, x + 20, y + 18);
            doc.font('Helvetica-Bold').fontSize(16).fillColor(colors.dark).text(value, x + 20, y + 42);
        };
        drawPremiumCard(margin, currentY, 'Total Pago', formatCurrency(totalPaid), colors.success);
        drawPremiumCard(margin + cardWidth + 15, currentY, 'Total a Pagar', formatCurrency(totalPending), colors.warning);
        drawPremiumCard(margin + (cardWidth + 15) * 2, currentY, 'Total do Período', formatCurrency(grandTotal), colors.primary);
        currentY += 110;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.dark).text('Distribuição de Gastos por Categoria', margin, currentY);
        currentY += 25;
        const categoryTotals = {};
        for (const item of paymentItems) {
            const catName = item.expense.category.name;
            categoryTotals[catName] = (categoryTotals[catName] || 0) + (item.status === client_1.PaymentStatus.PAID ? (item.paidAmount || item.expectedAmount) : item.expectedAmount);
        }
        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
        if (sortedCategories.length === 0) {
            doc.font('Helvetica').fontSize(10).fillColor(colors.gray).text('Nenhum dado financeiro encontrado neste período.', margin, currentY);
            currentY += 30;
        }
        else {
            for (const [catName, total] of sortedCategories) {
                if (currentY > 700) {
                    doc.addPage();
                    currentY = margin + 20;
                }
                const percentage = grandTotal > 0 ? (total / grandTotal) : 0;
                const barMaxWidth = contentWidth - 210;
                const barWidth = percentage * barMaxWidth;
                let displayCatName = catName;
                if (displayCatName.length > 18)
                    displayCatName = displayCatName.substring(0, 18) + '...';
                doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.dark).text(displayCatName, margin, currentY + 3);
                doc.roundedRect(margin + 130, currentY + 4, barMaxWidth, 10, 5).fill(colors.primaryLight);
                if (barWidth > 0) {
                    doc.roundedRect(margin + 130, currentY + 4, Math.max(barWidth, 10), 10, 5).fill(colors.primary);
                }
                doc.font('Helvetica').fontSize(10).fillColor(colors.gray).text(formatCurrency(total), margin + 130 + barMaxWidth + 10, currentY + 3, { width: 70, align: 'right' });
                currentY += 28;
            }
        }
        if (type === 'analitico') {
            doc.addPage();
            currentY = margin;
            doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.dark).text('Proporção de Pagamentos por Familiar', margin, currentY);
            currentY += 25;
            const userTotals = {};
            let totalPaidByUsers = 0;
            for (const item of paymentItems) {
                if (item.status === client_1.PaymentStatus.PAID) {
                    const userName = item.paidBy?.name || 'Não Identificado';
                    const val = (item.paidAmount || item.expectedAmount);
                    userTotals[userName] = (userTotals[userName] || 0) + val;
                    totalPaidByUsers += val;
                }
            }
            const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1] - a[1]);
            if (sortedUsers.length === 0) {
                doc.font('Helvetica').fontSize(10).fillColor(colors.gray).text('Nenhum pagamento registrado no período.', margin, currentY);
                currentY += 40;
            }
            else {
                const barColors = [colors.primary, colors.user1, colors.user2, colors.user3, colors.user4, colors.warning];
                doc.roundedRect(margin, currentY, contentWidth, 16, 8).fill(colors.lightGray);
                let startX = margin;
                for (let i = 0; i < sortedUsers.length; i++) {
                    const [uName, uTotal] = sortedUsers[i];
                    const pct = (uTotal / totalPaidByUsers);
                    const w = pct * contentWidth;
                    if (w > 0) {
                        doc.rect(startX, currentY, w, 16).fill(barColors[i % barColors.length]);
                        startX += w;
                    }
                }
                doc.roundedRect(margin, currentY, contentWidth, 16, 8).lineWidth(3).strokeColor('#FFFFFF').stroke();
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
                    doc.circle(legendX + 5, legendY + 5, 5).fill(barColors[i % barColors.length]);
                    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.dark).text(`${uName}: `, legendX + 15, legendY + 1, { continued: true });
                    doc.font('Helvetica').fontSize(9).fillColor(colors.gray).text(` ${formatCurrency(uTotal)} (${pct.toFixed(1)}%)`);
                    legendX += 160;
                }
                currentY = legendY + 40;
            }
            if (currentY > 700) {
                doc.addPage();
                currentY = margin;
            }
            doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.dark).text('Detalhamento de Transações', margin, currentY);
            currentY += 25;
            const cols = {
                date: margin,
                desc: margin + 65,
                payer: margin + 180,
                cat: margin + 270,
                status: margin + 350,
                val: margin + 420
            };
            doc.roundedRect(margin, currentY, contentWidth, 26, 4).fill(colors.primary);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
                .text('Vencimento', cols.date + 10, currentY + 8)
                .text('Descrição', cols.desc, currentY + 8)
                .text('Membro / Pagador', cols.payer, currentY + 8)
                .text('Categoria', cols.cat, currentY + 8)
                .text('Status', cols.status, currentY + 8)
                .text('Valor (R$)', cols.val, currentY + 8);
            currentY += 34;
            if (paymentItems.length === 0) {
                doc.font('Helvetica').fontSize(10).fillColor(colors.gray).text('Nenhuma transação encontrada.', margin, currentY + 10, { align: 'center', width: contentWidth });
            }
            for (let i = 0; i < paymentItems.length; i++) {
                const item = paymentItems[i];
                const hasDesc = !!item.expense.description;
                const hasNotes = !!item.notes;
                let extraLines = 0;
                if (hasDesc)
                    extraLines++;
                if (hasNotes)
                    extraLines++;
                const rowHeight = 24 + (extraLines * 12);
                if (currentY + rowHeight > 740) {
                    doc.addPage();
                    currentY = margin;
                    doc.roundedRect(margin, currentY, contentWidth, 26, 4).fill(colors.primary);
                    doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
                        .text('Vencimento', cols.date + 10, currentY + 8)
                        .text('Descrição', cols.desc, currentY + 8)
                        .text('Membro / Pagador', cols.payer, currentY + 8)
                        .text('Categoria', cols.cat, currentY + 8)
                        .text('Status', cols.status, currentY + 8)
                        .text('Valor (R$)', cols.val, currentY + 8);
                    currentY += 34;
                }
                if (i % 2 === 0) {
                    doc.rect(margin, currentY - 4, contentWidth, rowHeight).fill('#F8FAFC');
                }
                const dateStr = item.dueDate.toLocaleDateString('pt-BR');
                let title = item.expense.title;
                if (title.length > 25)
                    title = title.substring(0, 25) + '...';
                let payerName = item.status === client_1.PaymentStatus.PAID && item.paidBy ? item.paidBy.name : '--';
                if (payerName.length > 15)
                    payerName = payerName.substring(0, 15) + '...';
                let catStr = item.expense.category.name;
                if (catStr.length > 14)
                    catStr = catStr.substring(0, 14) + '...';
                let statusText = 'Pendente';
                let statusColor = colors.warning;
                let valStr = formatCurrency(item.expectedAmount);
                if (item.status === client_1.PaymentStatus.PAID) {
                    statusText = 'Pago';
                    statusColor = colors.success;
                    valStr = formatCurrency(item.paidAmount || item.expectedAmount);
                }
                else if (item.status === client_1.PaymentStatus.PENDING && item.dueDate < new Date()) {
                    statusText = 'Atrasado';
                    statusColor = colors.danger;
                }
                const textY = currentY + 2;
                doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.dark)
                    .text(title, cols.desc, textY);
                let descY = textY + 12;
                if (hasDesc) {
                    let descText = item.expense.description;
                    if (descText.length > 35)
                        descText = descText.substring(0, 35) + '...';
                    doc.font('Helvetica').fontSize(8).fillColor(colors.gray).text(descText, cols.desc, descY);
                    descY += 12;
                }
                if (hasNotes) {
                    let notesText = `Obs: ${item.notes}`;
                    if (notesText.length > 35)
                        notesText = notesText.substring(0, 35) + '...';
                    doc.font('Helvetica-Oblique').fontSize(8).fillColor(colors.gray).text(notesText, cols.desc, descY);
                }
                doc.font('Helvetica').fontSize(9).fillColor(colors.dark)
                    .text(dateStr, cols.date + 5, textY)
                    .text(payerName, cols.payer, textY)
                    .text(catStr, cols.cat, textY);
                doc.font('Helvetica-Bold').fillColor(statusColor).text(statusText, cols.status, textY);
                doc.font('Helvetica').fillColor(colors.dark).text(valStr, cols.val, textY);
                doc.moveTo(margin, currentY + rowHeight - 4).lineTo(margin + contentWidth, currentY + rowHeight - 4).lineWidth(0.5).strokeColor('#F1F5F9').stroke();
                currentY += rowHeight;
            }
        }
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            const footerY = 800;
            doc.moveTo(margin, footerY - 10).lineTo(margin + contentWidth, footerY - 10).lineWidth(1).strokeColor(colors.border).stroke();
            doc.font('Helvetica').fontSize(8).fillColor(colors.gray)
                .text(`Gerado automaticamente por Aksurim Software - Documento de uso restrito e pessoal`, margin, footerY, { align: 'left' });
            doc.font('Helvetica-Bold').text(`Página ${i + 1} de ${pages.count}`, margin, footerY, { align: 'right', width: contentWidth });
        }
        return doc;
    }
    async generateCsvExport(familyAccountId) {
        const items = await this.prisma.paymentItem.findMany({
            where: {
                expense: { familyAccountId, deletedAt: null },
            },
            include: {
                expense: { select: { title: true, type: true, category: { select: { name: true } } } },
                paidBy: { select: { name: true } },
            },
            orderBy: { dueDate: 'asc' },
        });
        const escapeCsv = (val) => {
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
            'Data Pagamento',
            'Pago Por',
        ].join(';');
        const rows = items.map((item) => {
            const dueStr = item.dueDate.toISOString().slice(0, 10);
            const paidAtStr = item.paidAt ? item.paidAt.toISOString().slice(0, 10) : '';
            const expectedBrl = (item.expectedAmount / 100).toFixed(2).replace('.', ',');
            const paidBrl = item.paidAmount !== null && item.paidAmount !== undefined
                ? (item.paidAmount / 100).toFixed(2).replace('.', ',')
                : '';
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
                escapeCsv(paidAtStr),
                escapeCsv(item.paidBy?.name ?? ''),
            ].join(';');
        });
        return '\uFEFF' + [header, ...rows].join('\r\n');
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map