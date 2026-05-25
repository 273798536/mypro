import { Database } from '../database';
import { DailyCost, CostImportRequest } from '../types';
export declare class CostService {
    private db;
    constructor(db?: Database);
    private validateCostData;
    importCost(request: CostImportRequest): Promise<{
        success: boolean;
        data?: DailyCost;
        error?: string;
    }>;
    private recordFailedImport;
    getCostsByMaterial(materialId: string, includeInvalid?: boolean): Promise<DailyCost[]>;
    getCostSummary(materialId: string): Promise<{
        totalCost: number;
        totalImpressions: number;
        totalClicks: number;
        avgCtr: string;
        avgCpc: string;
        dayCount: number;
    }>;
    bulkImportCosts(requests: CostImportRequest[]): Promise<{
        successCount: number;
        failCount: number;
        errors: {
            index: number;
            error: string;
        }[];
    }>;
}
export declare const costService: CostService;
