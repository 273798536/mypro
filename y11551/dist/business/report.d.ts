import { ReportSummary } from '../types';
export declare function getAllCabinets(): Promise<string[]>;
export declare function getCabinetDetail(cabinetId: string): Promise<{
    summary: ReportSummary;
    inventoryRecords: any[];
    restockRecords: any[];
    refundRecords: any[];
    exceptionRecords: any[];
    smsRecords: any[];
}>;
export declare function generateReport(city?: string): Promise<ReportSummary[]>;
export declare function recalculateHotSkuFullStatus(): Promise<{
    updated: number;
    total: number;
}>;
export declare function applyNetworkRecoveryDeduction(cabinetId: string, deductionAmount: number): Promise<boolean>;
export declare function getDataConsistencyReport(): Promise<{
    isConsistent: boolean;
    issues: {
        type: string;
        count: number;
        description: string;
    }[];
}>;
//# sourceMappingURL=report.d.ts.map