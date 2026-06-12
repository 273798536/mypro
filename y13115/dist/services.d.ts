import { WrongQuestion, JudgmentRecord, JudgmentStatus, Note, AuditEntry, OperationType, Operator, SourceRef, RecalculationResult, ExtrapolationAlert } from './types';
export declare function getLatestJudgment(wrongQuestionId: string): JudgmentRecord | undefined;
export declare function getJudgmentHistory(wrongQuestionId: string): JudgmentRecord[];
export interface JudgmentTrace {
    judgment: JudgmentRecord;
    sources: SourceRef[];
    linkedNotes: Note[];
    operatorLabel: string;
    statusChange?: {
        from: JudgmentStatus;
        to: JudgmentStatus;
    };
    scoreChange?: {
        from: number;
        to: number;
    };
}
export declare function traceJudgment(judgmentId: string): JudgmentTrace | null;
export declare function addAudit(operationType: OperationType, operator: Operator, wrongQuestionId: string, targetId?: string, beforeState?: Record<string, unknown>, afterState?: Record<string, unknown>, note?: string): AuditEntry;
export declare function rejudge(wrongQuestionId: string, newStatus: JudgmentStatus, newScore: number, operator: Operator, sources: SourceRef[], comment?: string, isTemporary?: boolean, noteIds?: string[]): JudgmentRecord;
export interface NoteImpact {
    note: Note;
    changedJudgments: Array<{
        before: {
            status: JudgmentStatus;
            score: number;
        };
        after: JudgmentRecord;
    }>;
    affectedStudents: string[];
    affectedQuestions: string[];
    summary: string;
}
export declare function addNote(wrongQuestionId: string, content: string, operator: Operator): Note;
export declare function getNoteImpact(noteId: string): NoteImpact | null;
export declare function withdrawJudgment(judgmentId: string, operator: Operator): JudgmentRecord | null;
export declare function computeTotals(scope: 'chart' | 'detail'): {
    correct: number;
    wrong: number;
    pending: number;
    rejudged: number;
};
export declare function recalculateWithWithdrawal(withdrawnJudgmentId: string): RecalculationResult;
export declare function checkExtrapolation(wrongQuestionId: string, judgmentId: string): ExtrapolationAlert | null;
export interface WrongQuestionSummary {
    wrongQuestion: WrongQuestion;
    latestJudgment?: JudgmentRecord;
    judgmentCount: number;
    hasTemporaryDecision: boolean;
    notes: Note[];
    extrapolationAlerts: ExtrapolationAlert[];
}
export declare function listWrongQuestions(): WrongQuestionSummary[];
