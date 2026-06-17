export type TicketStatus = 'pending' | 'processing' | 'need_evidence' | 'completed' | 'locked';

export type EvidenceSource = 'import' | 'supplement' | 'auto' | 'manual';

export interface Ticket {
  id: string;
  ticketNo: string;
  customerIssue: string;
  customerName: string;
  status: TicketStatus;
  currentVersion: number;
  latestVersion: number;
  lockedVersion: number | null;
  hasSampleLeak: boolean;
  hasManualMark: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketVersion {
  id: string;
  ticketId: string;
  version: number;
  modelVersion: string;
  summary: string;
  status: TicketStatus;
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  evidences: Evidence[];
  createdAt: string;
  createdBy: string;
  changeNote: string;
}

export interface Evidence {
  id: string;
  versionId: string;
  ticketId: string;
  content: string;
  source: EvidenceSource;
  isSampleLeak: boolean;
  importBatch: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  ticketId: string;
  version: number;
  action: string;
  operator: string;
  detail: string;
  createdAt: string;
}

export interface DiffResult {
  added: Evidence[];
  removed: Evidence[];
  modified: Evidence[];
  unchanged: Evidence[];
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

export interface DashboardStats {
  pending: number;
  processing: number;
  needEvidence: number;
  completed: number;
  locked: number;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  need_evidence: '需补充证据',
  completed: '已完成',
  locked: '已锁定',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  need_evidence: 'bg-orange-500',
  completed: 'bg-emerald-500',
  locked: 'bg-violet-500',
};

export const SOURCE_LABELS: Record<EvidenceSource, string> = {
  import: '导入',
  supplement: '补充',
  auto: '自动生成',
  manual: '人工录入',
};

export const SOURCE_COLORS: Record<EvidenceSource, string> = {
  import: 'bg-slate-100 text-slate-700',
  supplement: 'bg-sky-100 text-sky-700',
  auto: 'bg-purple-100 text-purple-700',
  manual: 'bg-emerald-100 text-emerald-700',
};
