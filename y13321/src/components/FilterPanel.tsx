import type { ReactNode } from 'react'
import type { Band, ChangeStatus, FilterCriteria, ProcessingStatus } from '@/data/types'
import { BAND_LIST, CHANGE_STATUS_LIST, PROCESSING_STATUS_LIST } from '@/utils/fieldMap'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="num mb-1 block text-[10px] uppercase tracking-[0.16em] text-ink-400">
        {label}
      </span>
      {children}
    </label>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded-sm border border-ink-900/15 bg-paper-50 px-2.5 py-1.5 text-[13px] text-ink-800 outline-none transition-colors hover:border-ink-900/30 focus:border-ink-900"
    >
      {children}
    </select>
  )
}

const ALL = 'all'

export function FilterPanel({
  criteria,
  sources,
  grades,
  onChange,
  onReset,
}: {
  criteria: FilterCriteria
  sources: string[]
  grades: string[]
  onChange: (patch: Partial<FilterCriteria>) => void
  onReset: () => void
}) {
  const activeCount = (
    [
      criteria.source,
      criteria.changeStatus,
      criteria.processingStatus,
      criteria.gradeLevel,
      criteria.band,
    ] as string[]
  ).filter((v) => v !== ALL).length

  return (
    <div className="panel sticky top-20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink-900">筛选口径</h2>
        <button
          onClick={onReset}
          disabled={activeCount === 0}
          className="btn btn-ghost px-1.5 py-0.5 text-[11px] disabled:opacity-40"
        >
          重置
        </button>
      </div>
      <div className="space-y-3">
        <Field label="来源">
          <Select value={criteria.source} onChange={(v) => onChange({ source: v })}>
            <option value={ALL}>全部来源</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="改判状态">
          <Select value={criteria.changeStatus} onChange={(v) => onChange({ changeStatus: v as ChangeStatus | 'all' })}>
            <option value={ALL}>全部状态</option>
            {CHANGE_STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="处理状态">
          <Select value={criteria.processingStatus} onChange={(v) => onChange({ processingStatus: v as ProcessingStatus | 'all' })}>
            <option value={ALL}>全部状态</option>
            {PROCESSING_STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="年级">
          <Select value={criteria.gradeLevel} onChange={(v) => onChange({ gradeLevel: v })}>
            <option value={ALL}>全部年级</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="阈值带（新模型）">
          <Select value={criteria.band} onChange={(v) => onChange({ band: v as Band | 'all' })}>
            <option value={ALL}>全部档位</option>
            {BAND_LIST.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4 border-t border-ink-900/10 pt-3">
        <div className="num mb-1 text-[10px] uppercase tracking-[0.16em] text-ink-400">
          口径（随导出保留）
        </div>
        <p className="text-[12px] leading-relaxed text-ink-600">
          来源=<span className="text-ink-900">{criteria.source === ALL ? '全部' : criteria.source}</span>
          ；改判=<span className="text-ink-900">{criteria.changeStatus === ALL ? '全部' : criteria.changeStatus}</span>
          ；处理=<span className="text-ink-900">{criteria.processingStatus === ALL ? '全部' : criteria.processingStatus}</span>
          ；年级=<span className="text-ink-900">{criteria.gradeLevel === ALL ? '全部' : criteria.gradeLevel}</span>
          ；档位=<span className="text-ink-900">{criteria.band === ALL ? '全部' : criteria.band}</span>
        </p>
      </div>
    </div>
  )
}
