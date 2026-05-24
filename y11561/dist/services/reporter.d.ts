import { AuditReport, User } from '../types';
export declare class ReportGenerator {
    private db;
    generateReport(batchId: string, generatedBy: User): AuditReport;
    exportToCSV(batchId: string, outputDir: string): {
        files: string[];
    };
    private exportDirtyRecordsToCSV;
    private exportCheckinToCSV;
    private exportDepositToCSV;
    private generateSummaryReport;
}
