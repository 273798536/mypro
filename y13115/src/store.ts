import {
  WrongQuestion,
  JudgmentRecord,
  Note,
  ExtrapolationAlert,
  RecalculationResult,
  AuditEntry,
} from './types';

export interface DataStore {
  wrongQuestions: WrongQuestion[];
  judgments: JudgmentRecord[];
  notes: Note[];
  extrapolationAlerts: ExtrapolationAlert[];
  recalculationResults: RecalculationResult[];
  auditLog: AuditEntry[];
}

export const store: DataStore = {
  wrongQuestions: [],
  judgments: [],
  notes: [],
  extrapolationAlerts: [],
  recalculationResults: [],
  auditLog: [],
};

export const genId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const now = (): string => new Date().toISOString();
