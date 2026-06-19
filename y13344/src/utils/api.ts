import type {
  EvaluationFilter,
  EvaluationListResponse,
  EvaluationResult,
  HumanCorrection,
  VersionComparison,
} from "../types"

const BASE = "/api"

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export function buildQueryString(filter: EvaluationFilter): string {
  const params = new URLSearchParams()
  if (filter.version) params.set("version", filter.version)
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom)
  if (filter.dateTo) params.set("dateTo", filter.dateTo)
  if (filter.metricType) params.set("metricType", filter.metricType)
  if (filter.hasHumanCorrection !== undefined)
    params.set("hasHumanCorrection", String(filter.hasHumanCorrection))
  if (filter.hasThresholdDrift !== undefined)
    params.set("hasThresholdDrift", String(filter.hasThresholdDrift))
  if (filter.page) params.set("page", String(filter.page))
  if (filter.pageSize) params.set("pageSize", String(filter.pageSize))
  return params.toString()
}

export function fetchEvaluations(filter: EvaluationFilter) {
  const qs = buildQueryString(filter)
  return fetchJson<EvaluationListResponse>(`${BASE}/evaluations?${qs}`)
}

export function fetchEvaluationDetail(id: string) {
  return fetchJson<EvaluationResult>(`${BASE}/evaluations/${id}`)
}

export function fetchSampleChain(sampleId: string) {
  return fetchJson<EvaluationResult[]>(`${BASE}/evaluations/${sampleId}/chain`)
}

export function fetchCorrections(evaluationId: string) {
  return fetchJson<HumanCorrection[]>(
    `${BASE}/corrections?evaluationId=${evaluationId}`
  )
}

export function addCorrection(
  data: Omit<HumanCorrection, "id">
) {
  return fetchJson<HumanCorrection>(`${BASE}/corrections`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function fetchComparison(previous: string, current: string) {
  return fetchJson<VersionComparison>(
    `${BASE}/compare?previous=${previous}&current=${current}`
  )
}

export function triggerRerun(data: {
  version: string
  sampleIds?: string[]
  metricTypes?: string[]
}) {
  return fetchJson<{ rerunId: string; status: string; message: string }>(
    `${BASE}/rerun`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  )
}

export function fetchRerunStatus(rerunId: string) {
  return fetchJson<{ rerunId: string; status: string; message: string }>(
    `${BASE}/rerun/${rerunId}`
  )
}

export function exportData(data: {
  filter: EvaluationFilter
  format: "csv" | "json"
  includeRawResponse: boolean
}) {
  return fetch(`${BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export function fetchVersions() {
  return fetchJson<{ id: string; version: string; createdAt: string; description: string }[]>(
    `${BASE}/versions`
  )
}
