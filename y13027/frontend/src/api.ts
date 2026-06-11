import type {
  ReconciliationRecord,
  ReconciliationStatus,
  AppropriatenessCaliber,
  ReviewConclusion,
  ExceptionQueueItem,
  HistoryChangeLog,
  ManagerSummary,
} from './types';

const BASE = '/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health(): Promise<{ ok: boolean }> {
    return fetch(`${BASE}/health`).then((r) => handle<{ ok: boolean }>(r));
  },

  listRecords(params?: {
    status?: ReconciliationStatus;
    caliber?: AppropriatenessCaliber;
    conflictOnly?: boolean;
  }): Promise<ReconciliationRecord[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.caliber) q.set('caliber', params.caliber);
    if (params?.conflictOnly) q.set('conflictOnly', 'true');
    const qs = q.toString();
    return fetch(`${BASE}/reconciliation${qs ? '?' + qs : ''}`).then((r) =>
      handle<ReconciliationRecord[]>(r),
    );
  },

  getRecord(id: string): Promise<{
    record: ReconciliationRecord;
    history: HistoryChangeLog[];
    exception?: ExceptionQueueItem;
  }> {
    return fetch(`${BASE}/reconciliation/${id}`).then((r) =>
      handle<{ record: ReconciliationRecord; history: HistoryChangeLog[]; exception?: ExceptionQueueItem }>(r),
    );
  },

  reviewRecord(
    id: string,
    body: {
      conclusion: ReviewConclusion;
      remark: string;
      changeReason: string;
      supplementaryMaterials?: string[];
    },
  ): Promise<ReconciliationRecord> {
    return fetch(`${BASE}/reconciliation/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handle<ReconciliationRecord>(r));
  },

  listExceptionQueue(): Promise<
    Array<{ exception: ExceptionQueueItem; record: ReconciliationRecord }>
  > {
    return fetch(`${BASE}/exception-queue`).then((r) =>
      handle<Array<{ exception: ExceptionQueueItem; record: ReconciliationRecord }>>(r),
    );
  },

  getManagerSummary(): Promise<ManagerSummary> {
    return fetch(`${BASE}/manager-summary`).then((r) => handle<ManagerSummary>(r));
  },

  exportData(params?: {
    status?: ReconciliationStatus;
    caliber?: AppropriatenessCaliber;
    conflictOnly?: boolean;
  }): Promise<{ generatedAt: string; generatedBy: string; rowCount: number; data: any[] }> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.caliber) q.set('caliber', params.caliber);
    if (params?.conflictOnly) q.set('conflictOnly', 'true');
    const qs = q.toString();
    return fetch(`${BASE}/export${qs ? '?' + qs : ''}`).then((r) =>
      handle<{ generatedAt: string; generatedBy: string; rowCount: number; data: any[] }>(r),
    );
  },
};

export const LABELS = {
  calibers: {
    investor_rating: '投资者评级',
    product_risk_level: '产品风险等级',
    investment_term: '投资期限',
    financial_status: '财务状况',
    investment_experience: '投资经验',
  } as Record<AppropriatenessCaliber, string>,

  statuses: {
    pending: '待复核',
    reviewing: '复核中',
    passed: '正常通过',
    split_passed: '回款拆分-通过',
    rejected: '复核驳回',
    supplement_required: '待补材料',
    conflict: '双口径冲突',
    split_repayment: '回款拆分',
  } as Record<ReconciliationStatus, string>,

  conclusions: {
    pass: '放行',
    reject: '驳回',
    supplement: '待补材料',
    escalate: '上报升级',
  } as Record<ReviewConclusion, string>,

  statusColor: {
    pending: '#8c8c8c',
    reviewing: '#1890ff',
    passed: '#52c41a',
    split_passed: '#722ed1',
    rejected: '#f5222d',
    supplement_required: '#faad14',
    conflict: '#eb2f96',
    split_repayment: '#722ed1',
  } as Record<ReconciliationStatus, string>,

  severityColor: {
    high: '#f5222d',
    medium: '#faad14',
    low: '#52c41a',
  },
};
