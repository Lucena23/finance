import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    generateFinancialReport(user: any, startDateStr: string, endDateStr: string, type: 'sintetico' | 'analitico'): Promise<PDFKit.PDFDocument>;
    generateCsvExport(familyAccountId: string): Promise<string>;
}
