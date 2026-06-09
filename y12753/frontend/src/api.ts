import type {
  BufferRecordSummary,
  BufferRecordDetail,
  BufferRecordCreate,
  BufferRecordUpdate,
  StatusTransition,
  ConcentrationCalcRequest,
  ConcentrationCalcResponse,
  BalanceCalcRequest,
  BalanceCalcResponse,
} from './types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) msg = String(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.blob()) as unknown as T;
}

export const api = {
  health: () => fetch(`${API_BASE}/health`).then((r) => r.json()),

  listRecords: (params?: {
    status?: string;
    keyword?: string;
    skip?: number;
    limit?: number;
  }): Promise<BufferRecordSummary[]> => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.keyword) q.set('keyword', params.keyword);
    if (params?.skip !== undefined) q.set('skip', String(params.skip));
    if (params?.limit !== undefined) q.set('limit', String(params.limit));
    return request<BufferRecordSummary[]>(`/records?${q.toString()}`);
  },

  getRecord: (id: number): Promise<BufferRecordDetail> =>
    request<BufferRecordDetail>(`/records/${id}`),

  createRecord: (
    data: BufferRecordCreate,
    skipDup = false
  ): Promise<BufferRecordDetail> =>
    request<BufferRecordDetail>(
      `/records?skip_duplicate_check=${skipDup}`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  updateRecord: (
    id: number,
    data: BufferRecordUpdate
  ): Promise<BufferRecordDetail> =>
    request<BufferRecordDetail>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  transitionStatus: (
    id: number,
    data: StatusTransition
  ): Promise<BufferRecordDetail> =>
    request<BufferRecordDetail>(`/records/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteRecord: (id: number) =>
    request<{ ok: boolean }>(`/records/${id}`, { method: 'DELETE' }),

  getReportPreview: (id: number) =>
    request<Record<string, unknown>>(`/records/${id}/report-preview`),

  downloadReport: async (id: number, filename: string) => {
    const res = await fetch(`${API_BASE}/records/${id}/report`);
    if (!res.ok) throw new Error('导出失败');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  calcConcentration: (
    data: ConcentrationCalcRequest
  ): Promise<ConcentrationCalcResponse> =>
    request<ConcentrationCalcResponse>('/calc/concentration', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  calcBalance: (
    data: BalanceCalcRequest
  ): Promise<BalanceCalcResponse> =>
    request<BalanceCalcResponse>('/calc/balance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
