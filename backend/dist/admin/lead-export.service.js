"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadExportService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const AKSURIM_COLORS = {
    primary: '#06777F',
    warning: '#FB4629',
    highlight: '#DAF043',
    dark: '#282828',
    light: '#F5F7F8',
    border: '#D9DEE2',
};
const LEAD_COLUMNS = [
    { key: 'userName', label: 'Nome' },
    { key: 'userEmail', label: 'E-mail' },
    { key: 'userWhatsapp', label: 'WhatsApp' },
    { key: 'ownerCpfMasked', label: 'CPF' },
    { key: 'createdAt', label: 'Data' },
    { key: 'isEmailVerified', label: 'Status' },
];
let LeadExportService = class LeadExportService {
    async export(leads, format) {
        if (format === 'csv') {
            return this.buildCsv(leads);
        }
        return this.buildPdf(leads);
    }
    buildCsv(leads) {
        const header = LEAD_COLUMNS.map((column) => column.label).join(';');
        const rows = leads.map((lead) => LEAD_COLUMNS.map((column) => this.formatCsvCell(lead, column.key)).join(';'));
        const csv = [header, ...rows].join('\r\n');
        const buffer = Buffer.from(`\uFEFF${csv}`, 'utf-8');
        return {
            buffer,
            contentType: 'text/csv; charset=utf-8',
            filename: this.buildFilename('csv'),
        };
    }
    formatCsvCell(lead, key) {
        if (key === 'isEmailVerified') {
            return lead.isEmailVerified ? 'Verificado' : 'Pendente';
        }
        if (key === 'createdAt') {
            return this.formatDate(lead.createdAt);
        }
        const raw = lead[key];
        const value = raw === null || raw === undefined ? '' : String(raw);
        const escaped = value.replace(/"/g, '""');
        return /[;"\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }
    buildPdf(leads) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                size: 'A4',
                layout: 'landscape',
                margin: 40,
                info: {
                    Title: 'Relatório de Leads — Aksurim Controle',
                    Author: 'Aksurim Software',
                    Subject: 'Extração de leads comerciais',
                },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: 'application/pdf',
                    filename: this.buildFilename('pdf'),
                });
            });
            doc.on('error', (error) => reject(error));
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = 40;
            const contentWidth = pageWidth - margin * 2;
            doc.rect(0, 0, pageWidth, 70).fill(AKSURIM_COLORS.dark);
            const logoPath = require('path').join(process.cwd(), '../frontend/public/logo-full.png');
            try {
                doc.image(logoPath, margin, 20, { height: 24 });
                doc
                    .fillColor('#FFFFFF')
                    .fontSize(18)
                    .font('Helvetica')
                    .text('  ·  Painel Administrativo', margin + 120, 23);
            }
            catch (e) {
                doc
                    .fillColor(AKSURIM_COLORS.highlight)
                    .fontSize(20)
                    .font('Helvetica-Bold')
                    .text('AKSURIM', margin, 22, { continued: true })
                    .fillColor('#FFFFFF')
                    .font('Helvetica')
                    .text('  ·  Painel Administrativo');
            }
            doc
                .fillColor('#C9D1D6')
                .fontSize(9)
                .font('Helvetica')
                .text('Relatório de Leads Comerciais', margin, 48);
            doc
                .fillColor('#C9D1D6')
                .fontSize(9)
                .text(`Gerado em ${this.formatDateTime(new Date().toISOString())}`, margin, 48, { align: 'right', width: contentWidth });
            let cursorY = 92;
            doc
                .fillColor(AKSURIM_COLORS.dark)
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(`Total de leads: ${leads.length}`, margin, cursorY);
            cursorY += 24;
            const columnWidths = this.computeColumnWidths(contentWidth);
            const rowHeight = 22;
            const drawTableHeader = (y) => {
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
            leads.forEach((lead, rowIndex) => {
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
                            .fillColor(lead.isEmailVerified
                            ? AKSURIM_COLORS.primary
                            : AKSURIM_COLORS.warning)
                            .font('Helvetica-Bold');
                    }
                    else {
                        doc.fillColor(AKSURIM_COLORS.dark).font('Helvetica');
                    }
                    doc.text(value, x + 6, y + 7, {
                        width: columnWidths[index] - 12,
                        ellipsis: true,
                    });
                    x += columnWidths[index];
                });
                doc
                    .moveTo(margin, y + rowHeight)
                    .lineTo(margin + contentWidth, y + rowHeight)
                    .strokeColor(AKSURIM_COLORS.border)
                    .lineWidth(0.5)
                    .stroke();
                y += rowHeight;
            });
            doc
                .fillColor('#8A949B')
                .fontSize(8)
                .font('Helvetica')
                .text('Documento confidencial — Aksurim Software. CPF exibido de forma mascarada (LGPD).', margin, pageHeight - margin, { align: 'center', width: contentWidth });
            doc.end();
        });
    }
    formatPdfCell(lead, key) {
        if (key === 'isEmailVerified') {
            return lead.isEmailVerified ? 'Verificado' : 'Pendente';
        }
        if (key === 'createdAt') {
            return this.formatDate(lead.createdAt);
        }
        const raw = lead[key];
        return raw === null || raw === undefined ? '—' : String(raw);
    }
    computeColumnWidths(contentWidth) {
        const weights = {
            userName: 0.20,
            userEmail: 0.24,
            userWhatsapp: 0.16,
            ownerCpfMasked: 0.14,
            createdAt: 0.14,
            isEmailVerified: 0.12,
            familyAccountId: 0,
            familyName: 0,
            userRole: 0,
            planStatus: 0,
            planDaysLeft: 0,
            billingCycle: 0,
        };
        return LEAD_COLUMNS.map((column) => Math.floor(contentWidth * weights[column.key]));
    }
    buildFilename(extension) {
        const stamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);
        return `aksurim-leads-${stamp}.${extension}`;
    }
    formatDate(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
    formatDateTime(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
};
exports.LeadExportService = LeadExportService;
exports.LeadExportService = LeadExportService = __decorate([
    (0, common_1.Injectable)()
], LeadExportService);
//# sourceMappingURL=lead-export.service.js.map