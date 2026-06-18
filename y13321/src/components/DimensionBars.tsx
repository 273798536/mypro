import type { DimensionRow } from '@/data/types'

const DIMS: { key: keyof Omit<DimensionRow, 'stage'>; max: number; label: string }[] = [
  { key: '内容', max: 20, label: '内容' },
  { key: '结构', max: 12, label: '结构' },
  { key: '语言', max: 12, label: '语言' },
  { key: '书写', max: 6, label: '书写' },
]

const STAGE_META: Record<DimensionRow['stage'], { label: string; bar: string; text: string }> = {
  old: { label: '旧', bar: 'bg-ink-400', text: 'text-ink-500' },
  manual: { label: '修', bar: 'bg-manual', text: 'text-manual-deep' },
  new: { label: '新', bar: 'bg-change', text: 'text-change-deep' },
}

export function DimensionBars({ rows }: { rows: DimensionRow[] }) {
  const stages = rows.map((r) => r.stage)
  const total = rows.reduce((sum, r) => Math.max(sum, r.内容 + r.结构 + r.语言 + r.书写), 0)
  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        {stages.map((stage) => (
          <span key={stage} className={`num flex items-center gap-1.5 text-[11px] ${STAGE_META[stage].text}`}>
            <span className={`inline-block h-2 w-2 ${STAGE_META[stage].bar}`} />
            {STAGE_META[stage].label}模型
          </span>
        ))}
      </div>
      <div className="space-y-2.5">
        {DIMS.map((dim) => (
          <div key={dim.key} className="grid grid-cols-[44px_1fr_34px] items-center gap-3">
            <span className="text-[12px] text-ink-600">{dim.label}</span>
            <div className="space-y-1">
              {stages.map((stage) => {
                const row = rows.find((r) => r.stage === stage)
                const val = row ? row[dim.key] : 0
                const pct = Math.max(2, (val / dim.max) * 100)
                return (
                  <div key={stage} className="h-2 w-full overflow-hidden rounded-xs bg-ink-900/[0.06]">
                    <div
                      className={`h-full origin-left animate-bar rounded-xs ${STAGE_META[stage].bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <span className="num text-right text-[12px] text-ink-700">
              {rows.find((r) => r.stage === 'new')?.[dim.key] ?? rows[0]?.[dim.key] ?? 0}
              <span className="text-ink-400">/{dim.max}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="num mt-3 border-t border-ink-900/10 pt-2 text-right text-[11px] text-ink-400">
        总分基线 {total}
      </div>
    </div>
  )
}
