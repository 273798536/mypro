import { ReportData } from '../types';
export declare class ReportService {
    generateReport(): ReportData;
    generateTextReport(): string;
    saveReportToFile(filePath?: string): string;
}
export declare const reportService: ReportService;
