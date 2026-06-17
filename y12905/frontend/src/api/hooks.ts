import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  PromptVersion, EvalSample, GrayCompareTask, HumanFeedback,
  DistributionItem, ViolationItem, TrendPoint, ReplayTrace
} from '../types';

const Q = {
  PV: ['prompt-versions'] as const,
  SAMPLES: (id?: number) => ['eval-samples', id] as const,
  COMPARES: ['gray-compare'] as const,
  COMPARE: (id: number) => ['gray-compare', id] as const,
  COMPARE_HASH: (id: number) => ['gray-compare', id, 'hash'] as const,
  FEEDBACK: ['human-feedback'] as const,
  FEEDBACK_SAMPLE: (sid: number) => ['human-feedback', sid] as const,
  EXPORT_PREVIEW: (id: number) => ['export-preview', id] as const,
};

// -------- Prompt Versions --------
export function usePromptVersions() {
  return useQuery({
    queryKey: Q.PV,
    queryFn: async () => (await api.get<PromptVersion[]>('/prompt-versions')).data,
    staleTime: 30_000,
  });
}

export function useCreatePromptVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.post<PromptVersion>('/prompt-versions', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.PV }),
  });
}

// -------- Eval Samples --------
export function useEvalSamples(prompt_version_id?: number) {
  return useQuery({
    queryKey: Q.SAMPLES(prompt_version_id),
    queryFn: async () => (await api.get<EvalSample[]>('/eval-samples', { params: { prompt_version_id } })).data,
    enabled: !!prompt_version_id,
  });
}

// -------- Gray Compare --------
export function useGrayCompareList() {
  return useQuery({
    queryKey: Q.COMPARES,
    queryFn: async () => (await api.get<GrayCompareTask[]>('/gray-compare')).data,
    staleTime: 15_000,
  });
}

export function useGrayCompare(id: number | null, include_diff = true) {
  return useQuery({
    queryKey: Q.COMPARE(id ?? -1),
    queryFn: async () => (await api.get<GrayCompareTask>(`/gray-compare/${id}`, { params: { include_diff } })).data,
    enabled: id != null,
  });
}

export function useGrayCompareHash(id: number | null) {
  return useQuery({
    queryKey: Q.COMPARE_HASH(id ?? -1),
    queryFn: async () => (await api.get(`/gray-compare/${id}/summary-hash`)).data,
    enabled: id != null,
  });
}

export function useCreateGrayCompare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { version_a_id: number; version_b_id: number }) =>
      api.post<GrayCompareTask>('/gray-compare', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: Q.COMPARES }),
  });
}

// -------- Statistics --------
export function useDistribution(pv_id: number | null, metric = 'score') {
  return useQuery({
    queryKey: ['stats-dist', pv_id, metric] as const,
    queryFn: async () =>
      (await api.get<DistributionItem[]>('/statistics/distribution', { params: { prompt_version_id: pv_id, metric } })).data,
    enabled: pv_id != null,
  });
}

export function useViolations(pv_id: number | null) {
  return useQuery({
    queryKey: ['stats-viol', pv_id] as const,
    queryFn: async () =>
      (await api.get<ViolationItem[]>('/statistics/safety-violations', { params: { prompt_version_id: pv_id } })).data,
    enabled: pv_id != null,
  });
}

export function useTrend(ids?: number[]) {
  return useQuery({
    queryKey: ['stats-trend', ids] as const,
    queryFn: async () =>
      (await api.get<TrendPoint[]>('/statistics/trend', { params: { version_ids: ids?.join(',') } })).data,
  });
}

// -------- Human Feedback --------
export function useAllFeedback() {
  return useQuery({
    queryKey: Q.FEEDBACK,
    queryFn: async () => (await api.get<HumanFeedback[]>('/human-feedback')).data,
  });
}

export function useFeedbackBySample(sample_id: number | null) {
  return useQuery({
    queryKey: Q.FEEDBACK_SAMPLE(sample_id ?? -1),
    queryFn: async () =>
      (await api.get<HumanFeedback[]>(`/human-feedback/by-sample/${sample_id}`)).data,
    enabled: sample_id != null,
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.post<HumanFeedback>('/human-feedback', body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: Q.FEEDBACK });
      qc.invalidateQueries({ queryKey: Q.COMPARES });
    },
  });
}

// -------- Replay --------
export function useReplayTrace(sample_id: number | null) {
  return useQuery({
    queryKey: ['replay', sample_id] as const,
    queryFn: async () =>
      (await api.post<ReplayTrace>('/replay/trace', { eval_sample_id: sample_id })).data,
    enabled: sample_id != null,
  });
}

// -------- Export Preview --------
export function useExportPreview(compare_id: number | null) {
  return useQuery({
    queryKey: Q.EXPORT_PREVIEW(compare_id ?? -1),
    queryFn: async () => (await api.get(`/export/${compare_id}/preview`)).data,
    enabled: compare_id != null,
  });
}
