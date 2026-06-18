import { ExportOptions } from '../types';
export interface ExportResult {
    filePath: string;
    sheets: string[];
    summary: {
        totalSuggestions: number;
        totalAnomalies: number;
        unresolvedAnomalies: number;
        invalidIndexes: number;
        schemaDiffs: number;
    };
}
export declare function exportRunReport(runId: string, options?: Partial<ExportOptions>): Promise<ExportResult>;
export declare function getExportHistory(outputDir?: string): Array<{
    fileName: string;
    filePath: string;
    size: number;
    modifiedAt: number;
}>;
