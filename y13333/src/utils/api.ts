import type { Sample, PlaybackResult, PlaybackStatus, ReviewMetrics, EvidenceChainDetail, MetricDetail, BiasingSample, ApiResponse } from '@shared/types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  samples: {
    getAll: (includeWithdrawn = true) => 
      request<ApiResponse<Sample[]>>(`/samples?includeWithdrawn=${includeWithdrawn}`),
    
    getById: (id: string) =>
      request<ApiResponse<Sample | null>>(`/samples/${id}`),
    
    getWithdrawn: () =>
      request<ApiResponse<Sample[]>>('/samples/withdrawn'),
  },
  
  playback: {
    getAll: (status?: PlaybackStatus) =>
      request<ApiResponse<PlaybackResult[]>>(`/playback${status ? `?status=${status}` : ''}`),
    
    getById: (id: string) =>
      request<ApiResponse<PlaybackResult | null>>(`/playback/${id}`),
    
    run: () =>
      request<ApiResponse<PlaybackResult[]>>('/playback/run'),
    
    updateStatus: (id: string, status: PlaybackStatus, operator: string, remark?: string) =>
      request<ApiResponse<PlaybackResult | null>>(`/playback/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, operator, remark }),
      }),
    
    getByStatus: (status: PlaybackStatus) =>
      request<ApiResponse<PlaybackResult[]>>(`/playback/status/${status}`),
  },
  
  evidence: {
    getChain: (playbackId: string) =>
      request<ApiResponse<EvidenceChainDetail | null>>(`/evidence/${playbackId}`),
    
    getOriginalStatement: (sampleId: string) =>
      request<ApiResponse<string | null>>(`/evidence/original/${sampleId}`),
  },
  
  review: {
    getMetrics: () =>
      request<ApiResponse<ReviewMetrics>>('/review/metrics'),
    
    getMetricDetails: (metricName: string) =>
      request<ApiResponse<MetricDetail | null>>(`/review/metrics/${metricName}/details`),
    
    getBiasingSample: (sampleId: string) =>
      request<ApiResponse<BiasingSample | null>>(`/review/biasing/${sampleId}`),
  },
};
