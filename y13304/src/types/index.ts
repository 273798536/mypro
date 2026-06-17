export type TicketStatus = 'pending' | 'processed' | 'need_evidence' | 'duplicate';

export type EvaluationType = 'normal' | 'supplementary' | 'duplicate' | 'version_update';

export type JudgmentResult = 'correct' | 'incorrect' | 'uncertain';

export interface Evidence {
  id: string;
  ticketId: string;
  type: 'screenshot' | 'log' | 'document' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface Evaluation {
  id: string;
  ticketId: string;
  modelVersion: string;
  summaryContent: string;
  judgment: JudgmentResult;
  judgeNotes?: string;
  evaluatedAt: string;
  evaluatedBy: string;
  type: EvaluationType;
  isDuplicate: boolean;
  parentEvaluationId?: string;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  originalContent: string;
  supplementaryNote?: string;
  isSupplementary: boolean;
  createdAt: string;
  status: TicketStatus;
  evaluations: Evaluation[];
  evidence: Evidence[];
}

export interface DashboardMetrics {
  totalEvaluations: number;
  validEvaluations: number;
  duplicateRate: number;
  supplementaryRate: number;
  correctRate: number;
  processedCount: number;
  pendingCount: number;
  needEvidenceCount: number;
  duplicateCount: number;
}

export interface DuplicateRecord {
  ticketId: string;
  ticketNo: string;
  originalContent: string;
  evaluations: Evaluation[];
  detectedAt: string;
}

export interface ExportRecord {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  filters: {
    dateRange?: [string, string];
    modelVersion?: string;
    status?: TicketStatus;
  };
  status: 'completed' | 'processing' | 'failed';
}

export type PageRoute = '/' | '/tickets' | '/exceptions' | '/export';
