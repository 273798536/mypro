import { useMemo, useState } from 'react'
import { Repeat2, Upload, RotateCcw, Search, Loader2 } from 'lucide-react'
import type { Conclusion, ReviewFilters, ReviewRow } from '../../shared/types'
import { api } from '@/api/client'
import { useFetch } from '@/hooks/useFetch'
import { useUiStore } from '@/store/useUi'
import { PageHeader } from '@/components/PageHeader'
import { SummaryBar } from '@/components/SummaryBar'
import { ReviewTable } from '@/components/ReviewTable'
import { ImportDialog } from '@/components/ImportDialog'
import { ConclusionEditor } from '@/components/ConclusionEditor'

const CONCLUSION_OPTIONS: Array<{ value: '' | Conclusion | 'pending'; label: string }> = [
  { value: '', label: '全部结论' },
  { value: '通过', label: '通过' },
  { value: '待确认', label: '待确认' },
  { value: '驳回', label: '驳回' },
  { value: 'pending', label: '待复核' },
]

export default function Replay() {
  const toast = useUiStore((s) => s.toast)
  const [filters, setFilters] = useState<ReviewFilters>({})
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState<ReviewRow | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const meta = useFetch(() => api.meta(), [])
  const versions = useFetch(() => api.versions(), [])
  const records = useFetch(() => api.records(filters), [filterKey])
  const summary = useFetch(() => api.summary(filters), [filterKey])

  const refreshAll = () => {
    records.refresh()
    summary.refresh()
    versions.refresh()
    meta.refresh()
  }

  const handleSaved = () => {
    refreshAll()
  }

  const handleImported = () => {
    refreshAll()
    toast('已刷新记录与摘要', 'info')
  }

  const setFilter = <K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value || undefined }))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 lg:p-8">
      <PageHeader
        title="评测回放"
        subtitle="日常复核入口 · 导入 / 补录标注，逐条复核分歧并给出唯一结论"
        icon={Repeat2}
        actions={
          <button className="btn-primary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            导入 / 补录
          </button>
        }
      />

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">版本</label>
          <select
            className="input"
            value={filters.version ?? ''}
            onChange={(e) => setFilter('version', e.target.value)}
          >
            <option value="">全部版本</option>
            {versions.data?.map((v) => (
              <option key={v.version} value={v.version}>
                {v.label ? `${v.label} (${v.version})` : v.version}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="label">模型版本</label>
          <select
            className="input"
            value={filters.model_version ?? ''}
            onChange={(e) => setFilter('model_version', e.target.value)}
          >
            <option value="">全部</option>
            {meta.data?.model_versions.map((mv) => (
              <option key={mv} value={mv}>
                {mv}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="label">结论</label>
          <select
            className="input"
            value={filters.conclusion ?? ''}
            onChange={(e) => setFilter('conclusion', e.target.value as Conclusion | 'pending' | undefined)}
          >
            {CONCLUSION_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="label">偏差类型</label>
          <select
            className="input"
            value={filters.bias_type ?? ''}
            onChange={(e) => setFilter('bias_type', e.target.value)}
          >
            <option value="">全部</option>
            {meta.data?.bias_types.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="label">搜索</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              className="input pl-9"
              placeholder="record_id 或 prompt"
              value={filters.q ?? ''}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={() => setFilters({})}
          disabled={Object.keys(filters).length === 0}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </button>
      </div>

      {summary.data && <SummaryBar summary={summary.data} filters={filters} />}

      {records.loading ? (
        <div className="panel flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载记录中…
        </div>
      ) : records.error ? (
        <div className="panel border-reject/30 p-5 text-sm text-reject">加载失败：{records.error}</div>
      ) : (
        <ReviewTable
          rows={records.data ?? []}
          onSelect={(row) => {
            setSelected(row)
            setEditorOpen(true)
          }}
        />
      )}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />
      <ConclusionEditor
        row={selected}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={(row) => {
          setSelected(row)
          handleSaved()
        }}
      />
    </div>
  )
}
