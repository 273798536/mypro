import { IndexSuggestion } from '../types';
export interface IndexSuggestionInput {
    runId: string;
    tableName: string;
    databaseName: string;
    indexName: string;
    indexColumns: string[];
    coveredColumns: string[];
    coverageRate: number;
    executionCount?: number;
    avgLatencyMs?: number;
    isInvalid?: boolean;
    invalidReason?: string;
    sourceSystem: string;
    operator: string;
}
export declare function createSuggestion(input: IndexSuggestionInput): IndexSuggestion;
export declare function getSuggestion(id: string): IndexSuggestion | null;
export declare function listSuggestions(runId: string, filters?: {
    onlyInvalid?: boolean;
    minCoverage?: number;
    tableName?: string;
}): IndexSuggestion[];
export declare function updateSuggestionMetrics(id: string, metrics: {
    executionCount?: number;
    avgLatencyMs?: number;
    coverageRate?: number;
}, operator: string): IndexSuggestion | null;
