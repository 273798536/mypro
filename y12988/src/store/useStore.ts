import { create } from 'zustand'

interface Migration {
  id: string
  name: string
  status: string
  related_log_count: number
  conflict_count: number
  created_at: string
  updated_at: string
}

interface SlowQueryLog {
  id: string
  batch_id: string
  query_text: string
  execution_time_ms: number
  source_file: string
  original_line_no: number
  is_duplicate: number
  import_round: number
  created_at: string
}

interface MigrationScript {
  id: string
  name: string
  version: number
  content: string
  created_at: string
}

interface Conflict {
  id: string
  log_id: string
  script_id: string
  type: string
  severity: string
  description: string
  chart_data_ref: string | null
  table_row_ref: string | null
  conclusion_id: string | null
  resolved: number
  created_at: string
}

interface BackupGap {
  id: string
  original_line_no: number
  image_name: string | null
  source_remark: string | null
  source_table: string
  source_record_id: string
  description: string
  conclusion_id: string | null
  created_at: string
}

interface Snapshot {
  id: string
  table_name: string
  schema_ddl: string
  conclusion_id: string | null
  captured_at: string
}

interface Conclusion {
  id: string
  content: string
  related_snapshot_id: string | null
  immutable: number
  created_at: string
}

interface IndexSuggestion {
  id: string
  table_name: string
  suggested_index: string
  reason: string
  explanation: string
  impact: string
  created_at: string
}

interface StoreState {
  migrations: Migration[]
  slowQueryLogs: SlowQueryLog[]
  migrationScripts: MigrationScript[]
  conflicts: Conflict[]
  backupGaps: BackupGap[]
  snapshots: Snapshot[]
  conclusions: Conclusion[]
  indexSuggestions: IndexSuggestion[]
  activeConflictId: string | null
  loading: Record<string, boolean>

  fetchMigrations: () => Promise<void>
  fetchSlowQueryLogs: (batchId?: string) => Promise<void>
  fetchMigrationScripts: () => Promise<void>
  fetchConflicts: (params?: Record<string, string>) => Promise<void>
  fetchBackupGaps: (params?: Record<string, string>) => Promise<void>
  fetchSnapshots: (params?: Record<string, string>) => Promise<void>
  fetchConclusions: (params?: Record<string, string>) => Promise<void>
  fetchIndexSuggestions: (params?: Record<string, string>) => Promise<void>
  setActiveConflictId: (id: string | null) => void
}

async function apiFetch<T>(url: string): Promise<T[]> {
  const res = await fetch(url)
  const json = await res.json()
  return json.data ?? []
}

export const useStore = create<StoreState>((set) => ({
  migrations: [],
  slowQueryLogs: [],
  migrationScripts: [],
  conflicts: [],
  backupGaps: [],
  snapshots: [],
  conclusions: [],
  indexSuggestions: [],
  activeConflictId: null,
  loading: {},

  fetchMigrations: async () => {
    set((s) => ({ loading: { ...s.loading, migrations: true } }))
    const data = await apiFetch<Migration>('/api/migrations')
    set((s) => ({ migrations: data, loading: { ...s.loading, migrations: false } }))
  },

  fetchSlowQueryLogs: async (batchId?: string) => {
    set((s) => ({ loading: { ...s.loading, slowQueryLogs: true } }))
    const url = batchId ? `/api/slow-query-logs?batch_id=${batchId}` : '/api/slow-query-logs'
    const data = await apiFetch<SlowQueryLog>(url)
    set((s) => ({ slowQueryLogs: data, loading: { ...s.loading, slowQueryLogs: false } }))
  },

  fetchMigrationScripts: async () => {
    set((s) => ({ loading: { ...s.loading, migrationScripts: true } }))
    const data = await apiFetch<MigrationScript>('/api/migration-scripts')
    set((s) => ({ migrationScripts: data, loading: { ...s.loading, migrationScripts: false } }))
  },

  fetchConflicts: async (params?: Record<string, string>) => {
    set((s) => ({ loading: { ...s.loading, conflicts: true } }))
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const data = await apiFetch<Conflict>(`/api/conflicts${qs}`)
    set((s) => ({ conflicts: data, loading: { ...s.loading, conflicts: false } }))
  },

  fetchBackupGaps: async (params?: Record<string, string>) => {
    set((s) => ({ loading: { ...s.loading, backupGaps: true } }))
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const data = await apiFetch<BackupGap>(`/api/backup-gaps${qs}`)
    set((s) => ({ backupGaps: data, loading: { ...s.loading, backupGaps: false } }))
  },

  fetchSnapshots: async (params?: Record<string, string>) => {
    set((s) => ({ loading: { ...s.loading, snapshots: true } }))
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const data = await apiFetch<Snapshot>(`/api/snapshots${qs}`)
    set((s) => ({ snapshots: data, loading: { ...s.loading, snapshots: false } }))
  },

  fetchConclusions: async (params?: Record<string, string>) => {
    set((s) => ({ loading: { ...s.loading, conclusions: true } }))
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const data = await apiFetch<Conclusion>(`/api/conclusions${qs}`)
    set((s) => ({ conclusions: data, loading: { ...s.loading, conclusions: false } }))
  },

  fetchIndexSuggestions: async (params?: Record<string, string>) => {
    set((s) => ({ loading: { ...s.loading, indexSuggestions: true } }))
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const data = await apiFetch<IndexSuggestion>(`/api/index-suggestions${qs}`)
    set((s) => ({ indexSuggestions: data, loading: { ...s.loading, indexSuggestions: false } }))
  },

  setActiveConflictId: (id) => set({ activeConflictId: id }),
}))
