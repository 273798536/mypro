import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileDown,
} from 'lucide-react'
import type { ReviewFilters, Summary } from '../../shared/types'
import { api } from '@/api/client'
import { StatCard } from './StatCard'

function download(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function SummaryBar({
  summary,
  filters,
}: {
  summary: Summary
  filters: ReviewFilters
}) {
  const total = summary.total || 1
  const reviewedPct = Math.round((summary.reviewed / total) * 100)
  const segs = [
    { label: '通过', count: summary.pass, color: 'bg-pass' },
    { label: '待确认', count: summary.pending_confirm, color: 'bg-warn' },
    { label: '驳回', count: summary.rejected, color: 'bg-reject' },
    { label: '待复核', count: summary.pending, color: 'bg-white/15' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="标注总数" value={summary.total} sub="当前筛选范围内" icon={FileDown} />
        <StatCard
          label="已复核"
          value={summary.reviewed}
          sub={`占比 ${reviewedPct}%`}
          accent="signal"
          icon={ClipboardCheck}
        />
        <StatCard
          label="待复核"
          value={summary.pending}
          sub="尚未给出结论"
          accent="default"
          icon={Clock}
          className="lg:col-span-1"
        />
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            结论分布
          </span>
          <button
            className="btn-ghost text-xs"
            onClick={() => download(api.exportUrl(filters))}
            title="导出与界面摘要同源"
          >
            <Download className="h-3.5 w-3.5" />
            导出 CSV
          </button>
        </div>

        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.04]">
          {segs.map((s) => (
            <div
              key={s.label}
              className={s.color}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.label} ${s.count}`}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Legend icon={CheckCircle2} label="通过" count={summary.pass} color="text-pass" />
          <Legend icon={AlertTriangle} label="待确认" count={summary.pending_confirm} color="text-warn" />
          <Legend icon={XCircle} label="驳回" count={summary.rejected} color="text-reject" />
          <Legend icon={Clock} label="待复核" count={summary.pending} color="text-zinc-400" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-signal/70 to-signal transition-all duration-500"
              style={{ width: `${reviewedPct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-zinc-400">复核进度 {reviewedPct}%</span>
        </div>
      </div>
    </div>
  )
}

function Legend({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="ml-auto font-mono text-sm font-semibold text-zinc-100">{count}</span>
    </div>
  )
}
