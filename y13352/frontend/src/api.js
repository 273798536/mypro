const API_BASE = '/api';

export async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || '请求失败');
  }
  return res.json();
}

export const api = {
  listTasks: () => fetchJSON('/tasks'),
  getTask: (id) => fetchJSON(`/tasks/${id}`),
  createTask: (data) => fetchJSON('/tasks', { method: 'POST', body: data }),
  getTaskSummary: (id) => fetchJSON(`/tasks/${id}/summary`),
  listSnapshots: () => fetchJSON('/snapshots'),
  createRun: (taskId, data) => fetchJSON(`/tasks/${taskId}/runs`, { method: 'POST', body: data }),
  compareRuns: (taskId, runA, runB) => {
    const params = new URLSearchParams();
    if (runA) params.set('run_a', runA);
    if (runB) params.set('run_b', runB);
    const qs = params.toString();
    return fetchJSON(`/tasks/${taskId}/compare${qs ? '?' + qs : ''}`);
  },
  addJudgment: (taskId, data) => fetchJSON(`/tasks/${taskId}/judgments`, { method: 'POST', body: data }),
  listJudgments: (taskId) => fetchJSON(`/tasks/${taskId}/judgments`),
  addNote: (taskId, data) => fetchJSON(`/tasks/${taskId}/notes`, { method: 'POST', body: data }),
  listNotes: (taskId) => fetchJSON(`/tasks/${taskId}/notes`),
  exportTask: (taskId, format = 'json') => fetchJSON(`/tasks/${taskId}/export?format=${format}`),
};
