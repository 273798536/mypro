import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

export interface Run {
  id: number;
  run_id: string;
  name: string;
  params_json: string;
  engineer: string;
  created_at: string;
  description: string | null;
  parent_run_id: string | null;
}

export interface FeatureSnapshot {
  id: number;
  snapshot_id: string;
  name: string;
  feature_definition: string;
  version: string;
  offline_metric_json: string | null;
  online_metric_json: string | null;
  metric_mismatch_reason: string | null;
  created_at: string;
  created_by: string;
  is_temporary: number;
  original_snapshot_id: string | null;
  added_at?: string;
  added_by?: string;
  remark?: string;
}

export interface Sample {
  id: number;
  sample_id: string;
  content: string;
  ground_truth_label: string;
  is_replay: number;
  original_run_id: string | null;
  original_model_label: string | null;
  note: string | null;
}

export interface Judgment {
  id: number;
  run_id: string;
  sample_id: string;
  model_label: string;
  confidence: number;
  final_decision: string;
  decision_reason: string | null;
  judged_at: string;
  judged_by: string;
  is_modified: number;
  feature_snapshot_ids_json: string | null;
  sample_content?: string;
  ground_truth_label?: string;
}

export interface JudgmentHistory {
  id: number;
  run_id: string;
  sample_id: string;
  previous_decision: string;
  new_decision: string;
  previous_reason: string | null;
  new_reason: string | null;
  changed_by: string;
  changed_at: string;
  change_note: string | null;
}

export interface SnapshotNote {
  id: number;
  snapshot_id: string;
  note_content: string;
  created_at: string;
  created_by: string;
  changed_judgments_json: string | null;
}

export interface DecisionSuggestion {
  type: 'SUPPLEMENT' | 'RELEASE' | 'INVESTIGATE' | 'REPLAY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  target: string;
  target_id: string;
  title: string;
  detail: string;
  evidence: string[];
}

export interface RunSuggestions {
  run_id: string;
  run_name: string;
  summary: {
    total_suggestions: number;
    supplement_count: number;
    release_count: number;
    investigate_count: number;
    replay_count: number;
  };
  suggestions: DecisionSuggestion[];
}

export interface RunComparison {
  base_run_id: string;
  compare_run_id: string;
  summary: {
    total: number;
    changed: number;
    added: number;
    removed: number;
    unchanged: number;
  };
  changed_samples: any[];
  added_samples: any[];
  removed_samples: any[];
  unchanged_samples: any[];
  snapshot_diff: {
    added: FeatureSnapshot[];
    removed: FeatureSnapshot[];
    common: FeatureSnapshot[];
  };
}

export const runApi = {
  list: () => api.get<Run[]>('/runs').then(r => r.data),
  get: (id: string) => api.get<Run>(`/runs/${id}`).then(r => r.data),
  checkDuplicate: (id: string) => api.get(`/runs/${id}/check-duplicate`).then(r => r.data),
  create: (data: any) => api.post<Run>('/runs', data).then(r => r.data),
  judgments: (id: string) => api.get<Judgment[]>(`/runs/${id}/judgments`).then(r => r.data),
  featureSnapshots: (id: string) => api.get<FeatureSnapshot[]>(`/runs/${id}/feature-snapshots`).then(r => r.data),
  suggestions: (id: string) => api.get<RunSuggestions>(`/runs/${id}/suggestions`).then(r => r.data)
};

export const snapshotApi = {
  list: () => api.get<FeatureSnapshot[]>('/feature-snapshots').then(r => r.data),
  get: (id: string) => api.get<FeatureSnapshot>(`/feature-snapshots/${id}`).then(r => r.data),
  create: (data: any) => api.post<FeatureSnapshot>('/feature-snapshots', data).then(r => r.data),
  linkToRun: (runId: string, snapshotId: string, data: any) =>
    api.post(`/runs/${runId}/feature-snapshots/${snapshotId}/link`, data).then(r => r.data),
  notes: (id: string) => api.get<SnapshotNote[]>(`/feature-snapshots/${id}/notes`).then(r => r.data),
  addNote: (id: string, data: any) =>
    api.post<SnapshotNote>(`/feature-snapshots/${id}/notes`, data).then(r => r.data)
};

export const sampleApi = {
  list: () => api.get<Sample[]>('/samples').then(r => r.data),
  replayList: () => api.get<Sample[]>('/samples/replay').then(r => r.data),
  create: (data: any) => api.post<Sample>('/samples', data).then(r => r.data)
};

export const judgmentApi = {
  get: (runId: string, sampleId: string) =>
    api.get<Judgment>(`/runs/${runId}/judgments/${sampleId}`).then(r => r.data),
  create: (runId: string, data: any) =>
    api.post<Judgment>(`/runs/${runId}/judgments`, data).then(r => r.data),
  updateDecision: (runId: string, sampleId: string, data: any) =>
    api.put<Judgment>(`/runs/${runId}/judgments/${sampleId}/decision`, data).then(r => r.data),
  history: (runId: string, sampleId: string) =>
    api.get<JudgmentHistory[]>(`/runs/${runId}/judgments/${sampleId}/history`).then(r => r.data)
};

export const compareApi = {
  runs: (base: string, compare: string) =>
    api.get<RunComparison>('/compare-runs', { params: { base, compare } }).then(r => r.data)
};

export default api;
