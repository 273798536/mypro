import { MetricsSupplement } from '../types';
export interface SupplementInput {
    runId: string;
    suggestionId: string;
    metricName: string;
    metricValue: number;
    source: string;
    supplementedBy: string;
}
export declare function supplementMetrics(input: SupplementInput): MetricsSupplement;
export declare function listSupplements(runId: string, suggestionId?: string): MetricsSupplement[];
export declare function triggerSchemaRecheckAfterSupplement(runId: string, operator: string): Promise<string[]>;
