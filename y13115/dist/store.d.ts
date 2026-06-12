import { WrongQuestion, JudgmentRecord, Note, ExtrapolationAlert, RecalculationResult, AuditEntry } from './types';
export interface DataStore {
    wrongQuestions: WrongQuestion[];
    judgments: JudgmentRecord[];
    notes: Note[];
    extrapolationAlerts: ExtrapolationAlert[];
    recalculationResults: RecalculationResult[];
    auditLog: AuditEntry[];
}
export declare const store: DataStore;
export declare const genId: (prefix: string) => string;
export declare const now: () => string;
