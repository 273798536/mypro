import { Database } from '../database';
import { MaterialStatus, UserRole } from '../types';
export declare class ExportService {
    private db;
    constructor(db?: Database);
    exportToCSV(status?: MaterialStatus, role?: UserRole): Promise<string>;
    exportMaterialDetail(materialId: string, role: UserRole): Promise<string>;
}
export declare const exportService: ExportService;
