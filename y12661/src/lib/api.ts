import type {
  ReviewTask,
  TaskDetail,
  ChangeHistory,
  MaterialSource,
  TaskStatus,
  ParamUpdatePayload,
  ApiResponse,
} from '../../shared/types';

const BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.code !== 0) {
    throw new Error(json.message || '请求失败');
  }
  return json.data as T;
}

export const api = {
  listTasks(filters?: { status?: TaskStatus; keyword?: string }) {
    const q = new URLSearchParams();
    if (filters?.status) q.set('status', filters.status);
    if (filters?.keyword) q.set('keyword', filters.keyword);
    const qs = q.toString();
    return request<ReviewTask[]>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  getTaskDetail(id: string) {
    return request<TaskDetail>(`/tasks/${id}`);
  },

  updateTaskStatus(id: string, status: TaskStatus, operator: string, reason?: string) {
    return request<{ status: TaskStatus }>(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, operator, reason }),
    });
  },

  updateParams(id: string, payload: ParamUpdatePayload & { crackId: string }) {
    return request<{
      crack: any;
      collision: any;
      collisionChanged: boolean;
      newConclusion: string;
    }>(`/tasks/${id}/params`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  recalculateCollision(id: string, crackId?: string, operator = '展馆讲解员') {
    return request<any[]>(`/tasks/${id}/recalculate`, {
      method: 'POST',
      body: JSON.stringify({ crackId, operator }),
    });
  },

  getHistory(id: string) {
    return request<ChangeHistory[]>(`/tasks/${id}/history`);
  },

  getMaterials(id: string) {
    return request<MaterialSource[]>(`/tasks/${id}/materials`);
  },

  getReport(id: string) {
    return request<any>(`/export/report/${id}`);
  },

  getMaterialPackage(id: string) {
    return request<any>(`/export/materials/${id}`);
  },
};
