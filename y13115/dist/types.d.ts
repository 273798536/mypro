export type JudgmentStatus = 'pending' | 'correct' | 'wrong' | 'rejudged' | 'withdrawn';
export type OperationType = 'create' | 'judge' | 'rejudge' | 'add_note' | 'update_note' | 'withdraw' | 'recalculate' | 'extrapolation_check';
export type Operator = 'system' | 'teacher_ye' | 'auto_grader';
export interface SourceRef {
    type: 'formula' | 'unit_conversion' | 'extrapolation' | 'manual' | 'note';
    id: string;
    description: string;
    lineNumber?: number;
}
export interface WrongQuestion {
    id: string;
    studentId: string;
    studentName: string;
    questionId: string;
    questionText: string;
    studentAnswer: string;
    formulaUsed: string;
    unitInAnswer: string;
    standardUnit: string;
    standardAnswer: number;
    studentNumericAnswer: number;
    createdAt: string;
}
export interface JudgmentRecord {
    id: string;
    wrongQuestionId: string;
    status: JudgmentStatus;
    previousStatus?: JudgmentStatus;
    score: number;
    previousScore?: number;
    operator: Operator;
    operatedAt: string;
    sources: SourceRef[];
    noteIds: string[];
    isTemporary: boolean;
    comment?: string;
}
export interface Note {
    id: string;
    wrongQuestionId: string;
    content: string;
    operator: Operator;
    createdAt: string;
    updatedAt: string;
    affectedJudgmentIds: string[];
}
export interface ExtrapolationAlert {
    id: string;
    wrongQuestionId: string;
    judgmentId: string;
    sourceLine: number;
    formula: string;
    inputRange: [number, number];
    actualInput: number;
    impactScope: string[];
    severity: 'warning' | 'critical';
    detectedAt: string;
    resolved: boolean;
}
export interface RecalculationResult {
    recalculationId: string;
    withdrawnJudgmentId: string;
    chartConsistent: boolean;
    detailConsistent: boolean;
    chartTotals: {
        correct: number;
        wrong: number;
        pending: number;
    };
    detailTotals: {
        correct: number;
        wrong: number;
        pending: number;
    };
    discrepancies: string[];
    recalculatedAt: string;
}
export interface AuditEntry {
    id: string;
    operationType: OperationType;
    operator: Operator;
    wrongQuestionId: string;
    targetId?: string;
    timestamp: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    note?: string;
}
