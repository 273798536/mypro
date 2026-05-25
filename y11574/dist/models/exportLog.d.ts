import { ExportLog } from '../types';
interface CreateExportLogDto {
    exportedBy: string;
    exportedByName: string;
    exportType: 'csv' | 'excel';
    recordCount: number;
    totalAmount: number;
    isMasked: boolean;
    maskedFields: string[];
    filters: Record<string, unknown>;
    checksum: string;
}
export declare const exportLogModel: {
    create(dto: CreateExportLogDto): Promise<ExportLog>;
    findById(id: string): Promise<ExportLog | null>;
    list(limit?: number): Promise<ExportLog[]>;
    getRecentByUser(userId: string, limit?: number): Promise<ExportLog[]>;
};
export {};
