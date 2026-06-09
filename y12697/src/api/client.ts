import type {
  Snapshot,
  ProcessingRecord,
  HistoryRecord,
  ReviewSubmission,
  ReportData,
  TraceResult,
  SnapshotStatus,
  RiskLevel,
  FieldChange,
} from '../../shared/types';

interface ApiResp<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const body = (await res.json()) as ApiResp<T>;
  if (!body.success || !body.data) {
    throw new Error(body.error || 'Request failed');
  }
  return body.data;
}

export const api = {
  listSnapshots(params?: { status?: SnapshotStatus; riskLevel?: RiskLevel; keyword?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.riskLevel) qs.set('riskLevel', params.riskLevel);
    if (params?.keyword) qs.set('keyword', params.keyword);
    return request<Snapshot[]>(`/api/snapshots?${qs.toString()}`);
  },

  getSnapshot(id: string) {
    return request<Snapshot>(`/api/snapshots/${id}`);
  },

  importSnapshots(files: File[], operator = '舞台统筹') {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    form.append('operator', operator);
    return fetch('/api/snapshots/import', {
      method: 'POST',
      body: form,
    }).then(async (r) => {
      const body = (await r.json()) as ApiResp<Snapshot[]>;
      if (!body.success || !body.data) throw new Error(body.error || 'Import failed');
      return body.data;
    });
  },

  listRecords(snapshotId: string) {
    return request<ProcessingRecord[]>(`/api/snapshots/${snapshotId}/records`);
  },

  latestRecord(snapshotId: string) {
    return request<ProcessingRecord | null>(`/api/snapshots/${snapshotId}/records/latest`);
  },

  saveRecord(snapshotId: string, data: Partial<ProcessingRecord>, operator = '舞台统筹') {
    return request<ProcessingRecord>(`/api/snapshots/${snapshotId}/records`, {
      method: 'POST',
      body: JSON.stringify({ ...data, operator }),
    });
  },

  listHistory(snapshotId: string) {
    return request<HistoryRecord[]>(`/api/snapshots/${snapshotId}/history`);
  },

  diffRecords(recordId1: string, recordId2: string) {
    return request<FieldChange[]>(
      `/api/snapshots/_/history/diff?recordId1=${recordId1}&recordId2=${recordId2}`,
    );
  },

  submitReview(submission: ReviewSubmission) {
    return request<HistoryRecord>('/api/snapshots/_/review', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  },

  getReport(snapshotId: string) {
    return request<ReportData>(`/api/snapshots/${snapshotId}/report`);
  },

  downloadReport(snapshotId: string) {
    window.open(`/api/snapshots/${snapshotId}/report/download`, '_blank');
  },

  trace(snapshotId: string, anomalyId: string) {
    return request<TraceResult>(`/api/snapshots/${snapshotId}/trace?anomalyId=${anomalyId}`);
  },
};
