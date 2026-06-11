import type {
  PreReviewCase,
  HistoryRecord,
  CaseListQuery,
  HistoryQuery,
  RejudgeRequest,
  SupplementRequest,
  ApiResponse,
} from '../../shared/types.js';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`请求失败：HTTP ${res.status}，响应非标准 JSON`);
  }
  if (json.code !== 0) {
    throw new Error(json.message || `请求失败（错误码 ${json.code}）`);
  }
  return json.data;
}

export const api = {
  listCases: (q: CaseListQuery = {}) => {
    const params = new URLSearchParams();
    (Object.keys(q) as (keyof CaseListQuery)[]).forEach((k) => {
      if (q[k]) params.append(k, String(q[k]));
    });
    const qs = params.toString();
    return request<PreReviewCase[]>(`/api/cases${qs ? `?${qs}` : ''}`);
  },

  getCase: (id: string) => request<PreReviewCase>(`/api/cases/${id}`),

  rejudgeCase: (id: string, body: RejudgeRequest) =>
    request<{ updatedCase: PreReviewCase; historyRecord: HistoryRecord; linkedAttachmentIds: string[] }>(`/api/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  supplementCase: (id: string, body: SupplementRequest) =>
    request<{ updatedCase: PreReviewCase; historyRecord: HistoryRecord; addedPhotos: number; addedAttachments: number }>(
      `/api/cases/${id}/supplement`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  listHistory: (q: HistoryQuery = {}) => {
    const params = new URLSearchParams();
    (Object.keys(q) as (keyof HistoryQuery)[]).forEach((k) => {
      if (q[k]) params.append(k, String(q[k]));
    });
    const qs = params.toString();
    return request<HistoryRecord[]>(`/api/history${qs ? `?${qs}` : ''}`);
  },
};

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
