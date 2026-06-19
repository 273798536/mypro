const BASE = '/api'

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function convertKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertKeys)
  if (typeof obj !== 'object') return obj
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[camelCase(k)] = convertKeys(v)
  }
  return result
}

function splitEnum(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string') return val ? val.split(',').filter(Boolean) : []
  return []
}

async function request<T>(url: string, options?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const json = await res.json()
    if (json.ok) return { ok: true, data: convertKeys(json.data) as T }
    return { ok: false, error: json.error || 'Unknown error' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

function qs(params?: Record<string, string>) {
  if (!params) return ''
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  const s = new URLSearchParams(filtered).toString()
  return s ? `?${s}` : ''
}

export type DriftRecord = {
  id: string
  createdAt: string
  updatedAt: string
  sourceType: 'ticket' | 'slow_query' | 'migration' | 'snapshot' | 'schema_diff' | 'permission' | 'query_analysis'
  sourceRef: string
  tableName: string
  fieldName: string
  currentEnum: string[]
  expectedEnum: string[]
  driftType: 'added' | 'missing' | 'duplicate_exec' | 'null_value' | 'mixed_note' | 'value_added' | 'value_removed' | 'value_changed' | 'null_drift'
  status: 'pending' | 'corrected' | 'reviewed' | 'rolled_back' | 'confirmed' | 'dismissed'
  confidence: 'direct_use' | 'needs_review' | 'high' | 'medium' | 'low'
  severity: 'low' | 'medium' | 'high' | 'critical'
  snapshotId: string | null
  conclusion: string | null
  operator: string | null
}

export type SourceMaterial = {
  id: string
  materialType: 'ticket' | 'slow_query' | 'migration' | 'snapshot' | 'permission' | 'migration_file' | 'schema_diff' | 'permission_doc' | 'query_log'
  materialRef: string
  title: string
  summary: string
  rawPayload: unknown
  fetchedAt: string
  complete: boolean
  dedupKey: string
}

export type ConclusionRef = {
  id: string
  driftId: string
  materialId: string
  refRole: 'evidence' | 'permission' | 'slow_query' | 'snapshot' | 'primary' | 'supporting'
}

export type Snapshot = {
  id: string
  snapshotAt: string
  tableName: string
  fieldName: string
  rawValue: string
  nullFlag: boolean
  duplicateFlag: boolean
  mixedNoteFlag: boolean
  parsedEnum: string[]
  notes: string | null
}

export type AuditRecord = {
  id: string
  auditAt: string
  permissionKey: string
  holder: string | null
  materialId: string | null
  driftId: string | null
  status: string
  driftTableName?: string
  driftFieldName?: string
  driftStatus?: string
  materialType?: string
  materialRef?: string
  materialTitle?: string
}

export type SlowQueryRecord = {
  id: string
  queryId: string
  queryText: string | null
  queryTimeMs: number | null
  attributedTable: string | null
  attributedField: string | null
  materialId: string | null
  driftId: string | null
}

export type RollbackRecord = {
  id: string
  rollbackAt: string
  driftId: string
  conclusion: string | null
  operator: string | null
  sourceMaterialIds: string[]
}

export type HistoryRecord = {
  id: string
  driftId: string
  action: string
  beforeState: string | null
  afterState: string | null
  operator: string | null
  actionAt: string
  note: string | null
  tableName?: string
  fieldName?: string
  driftStatus?: string
}

export type TestScenario = {
  scenario: string
  description: string
  lastRun: TestRunResult | null
}

export type TestRunResult = {
  id: string
  scenario: string
  runAt: string
  passed: boolean
  beforeCount: number | null
  afterCount: number | null
  detail: string | null
}

export type DashboardStats = {
  pendingCount: number
  reviewedCount: number
  directUseCount: number
  needsReviewCount: number
  materialCompleteRate: { complete: number; total: number }
  duplicateExecCount: number
  dirtySnapshotCount: number
  recentRollbacks: RollbackRecord[]
  recentCorrections: DriftRecord[]
}

export type DriftDetail = DriftRecord & {
  materials: SourceMaterial[]
  auditEntries: AuditRecord[]
  slowQueries: SlowQueryRecord[]
  conclusionRefs: ConclusionRef[]
  snapshot: Snapshot | null
}

function mapDrift(raw: Record<string, unknown>): DriftRecord {
  return {
    ...(raw as unknown as DriftRecord),
    currentEnum: splitEnum(raw.currentEnum),
    expectedEnum: splitEnum(raw.expectedEnum),
  }
}

function mapSnapshot(raw: Record<string, unknown>): Snapshot {
  return {
    ...(raw as unknown as Snapshot),
    parsedEnum: splitEnum(raw.parsedEnum),
    nullFlag: Boolean(raw.nullFlag),
    duplicateFlag: Boolean(raw.duplicateFlag),
    mixedNoteFlag: Boolean(raw.mixedNoteFlag),
  }
}

function mapRollback(raw: Record<string, unknown>): RollbackRecord {
  const ids = raw.sourceMaterialIds
  return {
    ...(raw as unknown as RollbackRecord),
    sourceMaterialIds: typeof ids === 'string' ? ids.split(',').filter(Boolean) : Array.isArray(ids) ? ids : [],
  }
}

export function getDriftList(params?: Record<string, string>) {
  return request<DriftRecord[]>(`/drift${qs(params)}`).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: r.data.map((d) => mapDrift(d as unknown as Record<string, unknown>)) }
    return r
  })
}

export function getDriftDetail(id: string) {
  return request<Record<string, unknown>>(`/drift/${id}`).then((r) => {
    if (!r.ok || !r.data) return r as { ok: false; error: string }
    const raw = r.data
    const drift = mapDrift(raw)
    const conclusionRefs = (Array.isArray(raw.conclusionRefs) ? raw.conclusionRefs : []) as ConclusionRef[]
    const audits = (Array.isArray(raw.permissionAudits) ? raw.permissionAudits : []) as AuditRecord[]
    const slowQueries = (Array.isArray(raw.slowQueries) ? raw.slowQueries : []) as SlowQueryRecord[]
    const materials: SourceMaterial[] = []
    const snapshot = raw.snapshot ? mapSnapshot(raw.snapshot as Record<string, unknown>) : null
    const detail: DriftDetail = {
      ...drift,
      materials,
      auditEntries: audits,
      slowQueries,
      conclusionRefs,
      snapshot,
    }
    return { ok: true as const, data: detail }
  })
}

export function correctDrift(id: string, body: { expectedEnum: string[]; note: string; materialIds: string[]; operator: string }) {
  return request<DriftRecord>(`/drift/${id}/correct`, {
    method: 'POST',
    body: JSON.stringify({ ...body, expectedEnum: body.expectedEnum.join(',') }),
  }).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: mapDrift(r.data as unknown as Record<string, unknown>) }
    return r
  })
}

export function reviewDrift(id: string, body: { reviewed: boolean; operator: string }) {
  return request<DriftRecord>(`/drift/${id}/review`, { method: 'POST', body: JSON.stringify(body) }).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: mapDrift(r.data as unknown as Record<string, unknown>) }
    return r
  })
}

export function rollbackDrift(id: string, body: { operator: string; note: string }) {
  return request<DriftRecord>(`/drift/${id}/rollback`, { method: 'POST', body: JSON.stringify(body) }).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: mapDrift(r.data as unknown as Record<string, unknown>) }
    return r
  })
}

export function getDriftConclusion(id: string) {
  return request<{ conclusion: string; refs: ConclusionRef[]; materials: SourceMaterial[]; drift: DriftRecord }>(`/drift/${id}/conclusion`)
}

export function getMaterials(params?: Record<string, string>) {
  return request<SourceMaterial[]>(`/materials${qs(params)}`).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: r.data.map((m) => ({ ...m, complete: Boolean(m.complete) })) }
    return r
  })
}

export function ingestMaterial(body: Record<string, unknown>) {
  return request<SourceMaterial>('/materials/ingest', { method: 'POST', body: JSON.stringify(body) })
}

export function ingestMaterialBatch(items: Record<string, unknown>[]) {
  return request<{ ingested: number; skipped: number; total: number }>('/materials/ingest-batch', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export function getAuditList(params?: Record<string, string>) {
  return request<AuditRecord[]>(`/audit${qs(params)}`)
}

export function getSlowQueryList(params?: Record<string, string>) {
  return request<SlowQueryRecord[]>(`/slow-query${qs(params)}`)
}

export function getRollbackList(params?: Record<string, string>) {
  return request<RollbackRecord[]>(`/rollback${qs(params)}`).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: r.data.map(mapRollback) }
    return r
  })
}

export function getSnapshotList(params?: Record<string, string>) {
  return request<Snapshot[]>(`/snapshot${qs(params)}`).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: r.data.map((s) => mapSnapshot(s as unknown as Record<string, unknown>)) }
    return r
  })
}

export function ingestSnapshot(body: Record<string, unknown>) {
  return request<Snapshot>('/snapshot/ingest', { method: 'POST', body: JSON.stringify(body) }).then((r) => {
    if (r.ok && r.data) return { ok: true as const, data: mapSnapshot(r.data as unknown as Record<string, unknown>) }
    return r
  })
}

export function getHistoryList(params?: Record<string, string>) {
  return request<HistoryRecord[]>(`/history${qs(params)}`)
}

export function getDownloadUrl(params: Record<string, string>) {
  const s = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()
  return `/api/download?${s}`
}

export function getTestList() {
  return request<TestScenario[]>('/tests')
}

export function runTest(scenario: string) {
  return request<TestRunResult>(`/tests/${encodeURIComponent(scenario)}/run`, { method: 'POST' })
}

export function getDashboardStats() {
  return request<DashboardStats>('/dashboard/stats').then((r) => {
    if (r.ok && r.data) {
      const data = r.data
      return {
        ok: true as const,
        data: {
          ...data,
          recentRollbacks: (data.recentRollbacks || []).map((rb) => mapRollback(rb as unknown as Record<string, unknown>)),
          recentCorrections: (data.recentCorrections || []).map((d) => mapDrift(d as unknown as Record<string, unknown>)),
        },
      }
    }
    return r
  })
}
