import type {
  ImportBatch,
  VerificationRecord,
  VerifyStats,
  PaginatedResult,
  VerifyListParams,
  ReviewListParams,
  ReviewSubmitData,
  VerifyStatus,
  IssueMark,
} from '@/types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  const text = await res.text()
  if (!res.ok) {
    try {
      const error = JSON.parse(text)
      throw new Error(error.message || `请求失败: ${res.status}`)
    } catch {
      throw new Error(`请求失败: ${res.status}`)
    }
  }
  const json = JSON.parse(text)
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T
  }
  return json as T
}

export async function importData(type: string, file: File): Promise<ImportBatch> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/import/${type}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || '导入失败')
  }
  return res.json()
}

export async function getBatches(): Promise<ImportBatch[]> {
  return request<ImportBatch[]>('/import/batches')
}

export async function getVerifyList(params: VerifyListParams): Promise<PaginatedResult<VerificationRecord>> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.status) searchParams.set('status', params.status)
  if (params.issueType) searchParams.set('issueType', params.issueType)
  if (params.keyword) searchParams.set('keyword', params.keyword)
  return request<PaginatedResult<VerificationRecord>>(`/verify?${searchParams.toString()}`)
}

export async function getVerifyStats(): Promise<VerifyStats> {
  return request<VerifyStats>('/verify/stats')
}

export async function updateVerifyStatus(id: string, status: VerifyStatus): Promise<VerificationRecord> {
  return request<VerificationRecord>(`/verify/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function updateVerifyIssues(id: string, issues: Omit<IssueMark, 'id' | 'createdAt'>[]): Promise<VerificationRecord> {
  return request<VerificationRecord>(`/verify/${id}/issues`, {
    method: 'PUT',
    body: JSON.stringify({ issues }),
  })
}

export async function batchUpdateStatus(ids: string[], status: VerifyStatus): Promise<{ updated: number }> {
  return request<{ updated: number }>('/verify/batch-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  })
}

export async function getReviewList(params: ReviewListParams): Promise<PaginatedResult<VerificationRecord>> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params.keyword) searchParams.set('keyword', params.keyword)
  return request<PaginatedResult<VerificationRecord>>(`/review?${searchParams.toString()}`)
}

export async function submitReview(id: string, data: ReviewSubmitData): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/review/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function exportReport(): Promise<{ filename: string }> {
  return request<{ filename: string }>('/export/report', {
    method: 'POST',
  })
}

export async function exportList(): Promise<{ filename: string }> {
  return request<{ filename: string }>('/export/list', {
    method: 'POST',
  })
}

export async function downloadFile(filename: string): Promise<void> {
  const link = document.createElement('a')
  link.href = `${BASE}/export/${encodeURIComponent(filename)}`
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
