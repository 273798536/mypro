import { AnomalyRecord, AnomalyType, AnomalySeverity, NextAction, NEXT_ACTION_LABELS } from '../types';
export type { AnomalyRecord, AnomalyType, AnomalySeverity, NextAction };
export { NEXT_ACTION_LABELS };
export interface AnomalyInput {
    runId: string;
    suggestionId?: string;
    type: AnomalyType;
    severity: AnomalySeverity;
    title: string;
    description: string;
    sourceRef: string;
    nextAction: NextAction;
    handlingOpinion: string;
    materialsRequired?: string[];
    operator: string;
}
export declare function createAnomaly(input: AnomalyInput): AnomalyRecord;
export declare function getAnomaly(id: string): AnomalyRecord | null;
export interface AnomalyFilters {
    runId?: string;
    type?: AnomalyType;
    severity?: AnomalySeverity;
    nextAction?: NextAction;
    isResolved?: boolean;
    suggestionId?: string;
}
export declare function listAnomalies(filters?: AnomalyFilters): AnomalyRecord[];
export declare function resolveAnomaly(id: string, operator: string, resolutionNote: string): AnomalyRecord | null;
export declare function getAnomalyStats(runId: string): {
    total: number;
    bySeverity: Record<AnomalySeverity, number>;
    byAction: Record<NextAction, number>;
    byType: Record<AnomalyType, number>;
    resolved: number;
    unresolved: number;
};
export declare function buildIndexInvalidAnomaly(runId: string, suggestionId: string, tableName: string, indexName: string, invalidReason: string, sourceSystem: string, operator: string): AnomalyRecord;
export declare function buildLockWaitAnomaly(runId: string, tableName: string, waitSeconds: number, threshold: number, sourceSystem: string, operator: string, suggestionId?: string): AnomalyRecord;
