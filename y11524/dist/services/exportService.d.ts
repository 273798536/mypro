import { LedgerStatus, RoleType } from '../types';
export interface ExportParams {
    status?: LedgerStatus;
    area?: string;
    role: RoleType;
    exportType: 'summary' | 'detail';
}
export declare function exportToCSV(params: ExportParams): Promise<string>;
export declare function exportDetailToCSV(ledgerId: string, role: RoleType): Promise<string>;
export declare function getStatistics(params: {
    area?: string;
    role: RoleType;
}): Record<string, number>;
