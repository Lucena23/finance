"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lead_export_service_1 = require("./lead-export.service");
describe('LeadExportService', () => {
    let service;
    const sampleLeads = [
        {
            familyAccountId: 'fam-1',
            familyName: 'Família Silva',
            ownerCpfMasked: '***.***.123-45',
            userName: 'Maria Silva',
            userEmail: 'maria@example.com',
            userWhatsapp: '+5581999999999',
            userRole: 'ADMIN',
            isEmailVerified: true,
            createdAt: '2026-09-17T12:00:00.000Z',
        },
        {
            familyAccountId: 'fam-1',
            familyName: 'Família Silva',
            ownerCpfMasked: '***.***.123-45',
            userName: 'João; "Silva"',
            userEmail: 'joao@example.com',
            userWhatsapp: null,
            userRole: 'MEMBER',
            isEmailVerified: false,
            createdAt: '2026-09-18T15:30:00.000Z',
        },
    ];
    beforeEach(() => {
        service = new lead_export_service_1.LeadExportService();
    });
    describe('export — CSV', () => {
        it('deve gerar CSV com cabeçalho e BOM UTF-8', async () => {
            const result = await service.export(sampleLeads, 'csv');
            expect(result.contentType).toBe('text/csv; charset=utf-8');
            expect(result.filename).toMatch(/^aksurim-leads-.*\.csv$/);
            const text = result.buffer.toString('utf-8');
            expect(text.startsWith('\uFEFF')).toBe(true);
            expect(text).toContain('Nome;E-mail;WhatsApp;CPF;Data;Status');
        });
        it('deve conter os campos obrigatórios de cada lead', async () => {
            const result = await service.export(sampleLeads, 'csv');
            const text = result.buffer.toString('utf-8');
            expect(text).toContain('Maria Silva');
            expect(text).toContain('maria@example.com');
            expect(text).toContain('***.***.123-45');
            expect(text).toContain('Verificado');
            expect(text).toContain('Pendente');
        });
        it('deve escapar células com separador e aspas', async () => {
            const result = await service.export(sampleLeads, 'csv');
            const text = result.buffer.toString('utf-8');
            expect(text).toContain('"João; ""Silva"""');
        });
        it('NUNCA deve expor o CPF integral', async () => {
            const result = await service.export(sampleLeads, 'csv');
            const text = result.buffer.toString('utf-8');
            expect(text).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
        });
    });
    describe('export — PDF', () => {
        it('deve gerar um PDF com assinatura binária válida', async () => {
            const result = await service.export(sampleLeads, 'pdf');
            expect(result.contentType).toBe('application/pdf');
            expect(result.filename).toMatch(/^aksurim-leads-.*\.pdf$/);
            expect(result.buffer.length).toBeGreaterThan(0);
            expect(result.buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
        });
        it('deve gerar PDF mesmo com lista vazia', async () => {
            const result = await service.export([], 'pdf');
            expect(result.buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
        });
    });
    describe('export — formato padrão', () => {
        it('deve gerar PDF quando o formato não for reconhecido', async () => {
            const result = await service.export(sampleLeads, 'xlsx');
            expect(result.contentType).toBe('application/pdf');
        });
    });
});
//# sourceMappingURL=lead-export.service.spec.js.map