import type {
  Student,
  CoursePackage,
  LeaveRecord,
  Evaluation,
  RenewalAlert,
  OperationLog,
} from '../types';

const BASE = '/api';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(BASE + url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`);
  return (await res.json()) as T;
}

async function putJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`);
  return (await res.json()) as T;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => getJSON<{ ok: boolean; ts: string }>('/health'),
  getStudents: () => getJSON<Student[]>('/students'),
  getPackages: () => getJSON<CoursePackage[]>('/packages'),
  getLeaves: () => getJSON<LeaveRecord[]>('/leaves'),
  getEvaluations: () => getJSON<Evaluation[]>('/evaluations'),
  getAlerts: () => getJSON<RenewalAlert[]>('/alerts'),
  updateAlert: (id: string, data: Partial<RenewalAlert>) =>
    putJSON<{ alert: RenewalAlert; log: OperationLog }>(`/alerts/${id}`, data),
  getLogs: () => getJSON<OperationLog[]>('/logs'),
  addLog: (log: Omit<OperationLog, 'id' | 'operateTime' | 'ip'>) =>
    postJSON<OperationLog>('/logs', log),
  resetDB: () => postJSON<{ ok: boolean; resetAt: string }>('/reset', {}),
};
