import type { Sample, SampleStatus, Annotation, SupervisorOverview, DiffAnalysisResult, ImportResult, QCReport, PagedResponse } from '../../shared/types';

const API_BASE = '/api/qc';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '请求失败');
  return json.data as T;
}

export const api = {
  samples: {
    list(params?: { status?: SampleStatus; search?: string; page?: number; pageSize?: number }): Promise<PagedResponse<Sample>> {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
      const query = qs.toString();
      return request(`/samples${query ? `?${query}` : ''}`);
    },
    get(id: string): Promise<Sample> {
      return request(`/samples/${id}`);
    },
    import(file: File): Promise<ImportResult> {
      const formData = new FormData();
      formData.append('file', file);
      return request('/samples/import', { method: 'POST', body: formData });
    },
    update(id: string, patch: Partial<Sample>): Promise<Sample> {
      return request(`/samples/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    },
    updateStatus(id: string, status: SampleStatus, note?: string): Promise<Sample> {
      return request(`/samples/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
    },
  },

  annotations: {
    list(sampleId: string): Promise<Annotation[]> {
      return request(`/samples/${sampleId}/annotations`);
    },
    create(sampleId: string, x: number, y: number, label?: string): Promise<Annotation> {
      return request(`/samples/${sampleId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, label }),
      });
    },
    delete(annotationId: string, sampleId: string): Promise<void> {
      return request(`/annotations/${annotationId}?sampleId=${sampleId}`, { method: 'DELETE' });
    },
  },

  duplicates: {
    list(): Promise<Sample[][]> {
      return request('/duplicates');
    },
  },

  diffAnalysis: {
    get(): Promise<DiffAnalysisResult> {
      return request('/diff-analysis');
    },
  },

  supervisor: {
    overview(): Promise<SupervisorOverview> {
      return request('/supervisor/overview');
    },
  },

  reports: {
    list(): Promise<QCReport[]> {
      return request('/reports');
    },
    generate(): Promise<QCReport> {
      return request('/reports/generate', { method: 'POST' });
    },
    download(id: string): string {
      return `${API_BASE}/reports/${id}/download`;
    },
  },
};
