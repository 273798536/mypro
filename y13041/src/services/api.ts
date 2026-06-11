import type {
  Playback,
  HistoryRecord,
  Note,
  MarkdownReport,
} from '@/shared/types'

const BASE_URL = '/api'

interface ApiResponse<T> {
  data: T
}

interface PaginationParams {
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}

interface PlaybackListResponse {
  list: Playback[]
  total: number
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })

  const json: ApiResponse<T> = await response.json()
  return json.data
}

export function fetchPlaybacks(params: PaginationParams) {
  const query = new URLSearchParams()
  if (params.status) query.append('status', params.status)
  if (params.keyword) query.append('keyword', params.keyword)
  if (params.page) query.append('page', String(params.page))
  if (params.pageSize) query.append('pageSize', String(params.pageSize))

  return request<PlaybackListResponse>(`/playbacks?${query.toString()}`)
}

export function fetchPlaybackDetail(id: string) {
  return request<Playback>(`/playbacks/${id}`)
}

export function rejudgePlayback(
  id: string,
  payload: { conclusion: string; reason: string; operatorName: string },
) {
  return request<Playback>(`/playbacks/${id}/rejudge`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function addNote(
  id: string,
  payload: { content: string; operatorName: string },
) {
  return request<Note>(`/playbacks/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchHistory(id: string) {
  return request<HistoryRecord[]>(`/playbacks/${id}/history`)
}

export function generateReport(
  id: string,
  payload: { operatorName: string },
) {
  return request<MarkdownReport>(`/playbacks/${id}/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function downloadReport(playbackId: string, reportId: string) {
  const link = document.createElement('a')
  link.href = `${BASE_URL}/playbacks/${playbackId}/reports/${reportId}`
  link.download = `report-${reportId}.md`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function confirmPlayback(
  id: string,
  payload: { operatorName: string },
) {
  return request<Playback>(`/playbacks/${id}/confirm`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
