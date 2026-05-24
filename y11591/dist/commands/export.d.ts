import { RecordStatus } from '../types';
export interface ExportOptions {
    wave?: string;
    status?: RecordStatus;
    sourceType?: string;
    format?: 'csv' | 'json';
    output?: string;
}
export declare function exportData(workspacePath: string, options?: ExportOptions): Promise<void>;
