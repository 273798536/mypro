import { AttendanceDatabase } from './database';
import { ReportData } from './types';
export declare class ReportService {
    private db;
    constructor(db: AttendanceDatabase);
    generateReport(): Promise<ReportData>;
    exportToCSV(outputPath: string, includeFrozen?: boolean): Promise<string>;
    exportWithSources(outputPath: string): Promise<string>;
    exportFailures(outputPath: string): Promise<string>;
}
