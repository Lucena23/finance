import { AdminLead } from './admin.service';
export type LeadExportFormat = 'pdf' | 'csv';
export interface LeadExportResult {
    buffer: Buffer;
    contentType: string;
    filename: string;
}
export declare class LeadExportService {
    export(leads: AdminLead[], format: LeadExportFormat): Promise<LeadExportResult>;
    private buildCsv;
    private formatCsvCell;
    private buildPdf;
    private formatPdfCell;
    private computeColumnWidths;
    private buildFilename;
    private formatDate;
    private formatDateTime;
}
