import type { MuseumRecord, RecordDetail, Annotation, ReportConfig } from '@/types'

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  const json = (await res.json()) as ApiResponse<T>
  return json.data
}

export async function fetchRecords(params: Record<string, string | number>): Promise<{
  records: MuseumRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString()
  return apiFetch(`/api/records?${qs}`)
}

export async function fetchRecordDetail(id: string): Promise<RecordDetail> {
  return apiFetch(`/api/records/${id}`)
}

export async function rejudgeRecord(
  id: string,
  data: {
    judgment: string;
    reason: string;
    operatorName: string;
    operatorRole: string;
  }
): Promise<MuseumRecord> {
  return apiFetch(`/api/records/${id}/judgment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function createAnnotation(
  recordId: string,
  data: {
    type: string;
    position: string;
    content: string;
    createdBy: string;
    photoId?: string;
  }
): Promise<Annotation> {
  return apiFetch(`/api/records/${recordId}/annotations`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  await apiFetch(`/api/annotations/${annotationId}`, {
    method: 'DELETE',
  })
}

export async function generateReport(
  config: ReportConfig
): Promise<{
  reportId: string;
  markdown: string;
  generatedAt: string;
}> {
  const data = await apiFetch<{ id: string; content: string; createdAt: string }>(
    '/api/reports/generate',
    {
      method: 'POST',
      body: JSON.stringify(config),
    }
  )
  return { reportId: data.id, markdown: data.content, generatedAt: data.createdAt }
}
