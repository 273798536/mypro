import { Pencil, ArrowRight } from 'lucide-react'
import type { ReviewRow } from '../../shared/types'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'

const PREF: Record<string, string> = { a: 'A', b: 'B', tie: '平' }

export function ReviewTable({
  rows,
  onSelect,
}: {
  rows: ReviewRow[]
  onSelect: (row: ReviewRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="font-display text-lg text-zinc-300">暂无符合条件的记录</div>
        <div className="text-sm text-zinc-500">
          先在右上角「导入 / 补录」中上传 CSV，或调整筛选条件。
        </div>
      </div>
    )
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-medium">Record</th>
              <th className="px-4 py-3 font-medium">模型版本</th>
              <th className="px-4 py-3 font-medium">Prompt</th>
              <th className="px-4 py-3 font-medium">人工 / RM</th>
              <th className="px-4 py-3 font-medium">版本</th>
              <th className="px-4 py-3 font-medium">结论</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.record_id}
                onClick={() => onSelect(row)}
                className="group cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-zinc-300">{row.record_id}</span>
                  {row.has_disagreement && (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-signal" title="预测与人工分歧" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="chip border-white/10 bg-white/5 text-zinc-300">{row.model_version}</span>
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <span className="line-clamp-1 text-zinc-400">{row.prompt}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-pass">{PREF[row.human_label] ?? row.human_label}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    <span className={row.has_disagreement ? 'text-signal' : 'text-zinc-500'}>
                      {row.rm_prediction ? (PREF[row.rm_prediction] ?? row.rm_prediction) : '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.versions.slice(0, 2).map((v) => (
                      <span
                        key={v}
                        className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                      >
                        {v}
                      </span>
                    ))}
                    {row.versions.length > 2 && (
                      <span className="text-[10px] text-zinc-600">+{row.versions.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge conclusion={row.conclusion} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(row)
                    }}
                    className={cn(
                      'btn-ghost px-2.5 py-1.5 text-xs opacity-60 transition group-hover:opacity-100',
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    复核
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/5 px-4 py-2.5 text-xs text-zinc-500">
        共 {rows.length} 条 · 点击任意行进入复核
      </div>
    </div>
  )
}
