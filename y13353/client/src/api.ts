import axios from 'axios';
import {
  EvalTask, TaskDetail, SampleEvidence, ManualJudgment, FeatureDelay,
  ParamChange, MaterialLink, TaskComparison, HandoverInfo, EvalResult
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const tasksApi = {
  getTasks: (params?: { status?: string; model_version?: string; limit?: number; offset?: number }) =>
    api.get<{ tasks: EvalTask[]; total: number }>('/tasks', { params }),
  
  getTaskDetail: (id: number) =>
    api.get<TaskDetail>(`/tasks/${id}`),
  
  createTask: (data: { name: string; model_version: string; index_type: string; index_params: any; created_by: string }) =>
    api.post<EvalTask>('/tasks', data),
  
  updateTaskStatus: (id: number, status: string) =>
    api.put<EvalTask>(`/tasks/${id}/status`, { status }),
  
  addComment: (id: number, data: { comment: string; comment_by: string }) =>
    api.post(`/tasks/${id}/comments`, data)
};

export const evidencesApi = {
  getByTask: (taskId: number, params?: { is_correct?: number; evidence_type?: string; limit?: number; offset?: number }) =>
    api.get<{ evidences: SampleEvidence[]; total: number }>(`/evidences/task/${taskId}`, { params }),
  
  getById: (id: number) =>
    api.get<SampleEvidence>(`/evidences/${id}`),
  
  updateJudgment: (id: number, data: { is_correct: boolean; judged_by: string; reason?: string }) =>
    api.put<SampleEvidence>(`/evidences/${id}/judgment`, data)
};

export const judgmentsApi = {
  getByTask: (taskId: number, params?: { is_temporary?: number }) =>
    api.get<ManualJudgment[]>(`/judgments/task/${taskId}`, { params }),
  
  create: (data: Partial<ManualJudgment>) =>
    api.post<ManualJudgment>('/judgments', data),
  
  confirm: (id: number, confirmed_by?: string) =>
    api.put<ManualJudgment>(`/judgments/${id}/confirm`, { confirmed_by }),
  
  getTemporary: () =>
    api.get<(ManualJudgment & { task_name: string })[]>('/judgments/temporary')
};

export const delaysApi = {
  getAll: (params?: { status?: string; task_id?: number }) =>
    api.get<FeatureDelay[]>('/feature-delays', { params }),
  
  create: (data: Partial<FeatureDelay>) =>
    api.post<FeatureDelay>('/feature-delays', data),
  
  confirm: (id: number, data: { confirmed_by: string; suspected_reason?: string; impact_scope?: string; affected_samples?: number }) =>
    api.put<FeatureDelay>(`/feature-delays/${id}/confirm`, data),
  
  resolve: (id: number, data: { actual_date: string; confirmed_by: string }) =>
    api.put<FeatureDelay>(`/feature-delays/${id}/resolve`, data)
};

export const paramChangesApi = {
  getByTask: (taskId: number) =>
    api.get<ParamChange[]>(`/param-changes/task/${taskId}`),
  
  create: (data: Partial<ParamChange>) =>
    api.post<ParamChange>('/param-changes', data)
};

export const materialLinksApi = {
  getByTask: (taskId: number) =>
    api.get<MaterialLink[]>(`/material-links/task/${taskId}`),
  
  create: (data: Partial<MaterialLink>) =>
    api.post<MaterialLink>('/material-links', data),
  
  verify: (id: number, verified_by: string) =>
    api.put<MaterialLink>(`/material-links/${id}/verify`, { verified_by })
};

export const resultsApi = {
  getByTask: (taskId: number) =>
    api.get<EvalResult[]>('/results/task/${taskId}'),
  
  create: (data: Partial<EvalResult> & { task_id: number }) =>
    api.post<EvalResult>('/results', data)
};

export const comparisonApi = {
  compare: (taskAId: number, taskBId: number) =>
    api.get<TaskComparison>(`/comparison/${taskAId}/${taskBId}`),
  
  getHistory: (taskId: number) =>
    api.get<any[]>(`/comparison/history/${taskId}`)
};

export const exportApi = {
  exportTaskCsv: (taskId: number) =>
    window.open(`/api/export/task/${taskId}/csv`, '_blank'),
  
  exportTaskJson: (taskId: number) =>
    window.open(`/api/export/task/${taskId}/json`, '_blank'),
  
  exportEvidencesCsv: (taskId: number) =>
    window.open(`/api/export/evidences/${taskId}/csv`, '_blank'),
  
  exportComparisonCsv: (taskAId: number, taskBId: number) =>
    window.open(`/api/export/comparison/${taskAId}/${taskBId}/csv`, '_blank')
};

export const handoverApi = {
  getInfo: () =>
    api.get<HandoverInfo>('/handover'),
  
  getSummary: () =>
    api.get<{ stats: any; recent_activity: any[] }>('/handover/summary')
};
