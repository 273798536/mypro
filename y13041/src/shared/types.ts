export type PlaybackStatus = 'pending' | 'rejudged' | 'confirmed';

export type ConclusionType = 'normal' | 'abnormal' | 'pending_review';

export type HistoryActionType = 'create' | 'rejudge' | 'add_note' | 'confirm' | 'run_batch' | 'generate_report';

export interface ApprovalEmail {
  id: string;
  playbackId: string;
  sentAt: string;
  approverName: string;
  approverNameOriginal?: string;
  subject: string;
  content: string;
  isAnomaly: boolean;
  anomalyNote?: string;
}

export interface NormalPaymentRecord {
  id: string;
  playbackId: string;
  enterpriseName: string;
  paymentMonth: string;
  amount: number;
  paidAt: string;
}

export interface Note {
  id: string;
  playbackId: string;
  content: string;
  operatorName: string;
  createdAt: string;
}

export interface HistoryRecord {
  id: string;
  playbackId: string;
  actionType: HistoryActionType;
  operatorName: string;
  createdAt: string;
  fieldChanges: Array<{
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
}

export interface MarkdownReport {
  id: string;
  playbackId: string;
  content: string;
  generatedAt: string;
  generatedBy: string;
  version: number;
}

export interface Playback {
  id: string;
  enterpriseName: string;
  batchNo: string;
  runCount: number;
  status: PlaybackStatus;
  conclusion: ConclusionType;
  conclusionReason: string;
  lastOperator: string;
  lastUpdatedAt: string;
  createdAt: string;
  emails: ApprovalEmail[];
  normalRecords: NormalPaymentRecord[];
  notes: Note[];
  history: HistoryRecord[];
  reports: MarkdownReport[];
}
