import { ReportStatus, CoverageReport } from '../types';
export declare function canTransition(from: ReportStatus, to: ReportStatus): boolean;
export declare function getReportById(id: number): CoverageReport | undefined;
export declare function listReports(page?: number, pageSize?: number, status?: ReportStatus): {
    items: any[];
    total: any;
    page: number;
    pageSize: number;
};
export declare function createReport(name: string, evaluationSetId: number, vocabularyId: number, createdBy?: string): number;
export declare function generateReport(reportId: number): void;
export declare function transitionStatus(reportId: number, targetStatus: ReportStatus, operator?: string): CoverageReport;
export declare function getReportSummary(reportId: number): {
    report: CoverageReport;
    annotationStats: {
        none: number;
        partial: number;
        full: number;
    };
    coverageStats: {
        covered: number;
        uncovered: number;
    };
};
export declare function listReportItems(reportId: number, page?: number, pageSize?: number, filters?: {
    isCovered?: number;
    annotationStatus?: string;
    reviewed?: boolean;
}): {
    items: any[];
    total: any;
    page: number;
    pageSize: number;
};
export declare function updateReportItemAnnotation(reportId: number, reportItemId: number, annotationStatus: 'none' | 'partial' | 'full', annotationNote?: string, reviewer?: string): void;
export declare function reviewReportItem(reportId: number, reportItemId: number, action: 'confirm' | 'reject' | 'supplement', comment?: string, reviewer?: string, annotationData?: {
    annotationStatus?: 'none' | 'partial' | 'full';
    annotationNote?: string;
}): void;
export declare function listReviewRecords(reportId: number, page?: number, pageSize?: number): {
    items: any[];
    total: any;
    page: number;
    pageSize: number;
};
export declare function markAsExported(reportId: number): void;
