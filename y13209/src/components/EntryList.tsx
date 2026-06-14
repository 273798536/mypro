import { useStore, applyFilter } from '@/store'
import { Clock, CheckCircle2, AlertTriangle, XCircle, Eye } from 'lucide-react'
import type { TimecodeEntry } from '@/types'

function AuthBadge({ status }: { status: TimecodeEntry['authorization']['status'] }) {
  const config = {
    valid: { label: '有效', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    expiring: { label: '临期', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    expired: { label: '过期', cls: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    needs_confirmation: { label: '需确认', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle },
  }
  const c = config[status]
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${c.cls}`}>
      <Icon size={11} />
      {c.label}
    </span>
  )
}

function AlignmentBadge({ status }: { status: TimecodeEntry['alignmentStatus'] }) {
  const config = {
    aligned: { label: '已对齐', cls: 'bg-emerald-500/20 text-emerald-400' },
    misaligned: { label: '异常', cls: 'bg-red-500/20 text-red-400' },
    pending: { label: '待定', cls: 'bg-gray-500/20 text-gray-400' },
  }
  const c = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${c.cls}`}>
      {c.label}
    </span>
  )
}

function ReviewBadge({ status }: { status: TimecodeEntry['reviewStatus'] }) {
  const config = {
    unreviewed: { label: '未复核', cls: 'text-gray-500' },
    in_review: { label: '复核中', cls: 'text-blue-400' },
    confirmed: { label: '已通过', cls: 'text-emerald-400' },
    flagged: { label: '待确认', cls: 'text-orange-400' },
  }
  const c = config[status]
  return <span className={`text-xs ${c.cls}`}>{c.label}</span>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function formatTime(d: string) {
  return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function EntryList() {
  const { entries, filter, activeEntryId, setActiveEntry } = useStore()
  const filtered = applyFilter(entries, filter)

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-[#2a2a4a]">
            <th className="text-left py-2.5 px-4 font-medium">项目</th>
            <th className="text-left py-2.5 px-3 font-medium">时段</th>
            <th className="text-left py-2.5 px-3 font-medium">分账</th>
            <th className="text-left py-2.5 px-3 font-medium">授权</th>
            <th className="text-left py-2.5 px-3 font-medium">对齐</th>
            <th className="text-left py-2.5 px-3 font-medium">复核</th>
            <th className="text-center py-2.5 px-3 font-medium">备注</th>
            <th className="text-center py-2.5 px-3 font-medium">截图</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => setActiveEntry(entry.id)}
              className={`border-b border-[#1e1e38] cursor-pointer transition-colors ${
                activeEntryId === entry.id
                  ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                  : 'hover:bg-[#1e1e38] border-l-2 border-l-transparent'
              }`}
            >
              <td className="py-3 px-4">
                <div className="font-medium text-gray-200">{entry.projectName}</div>
              </td>
              <td className="py-3 px-3">
                <div className="text-gray-300 font-mono text-xs">
                  {formatTime(entry.timeRange.start)}
                </div>
                <div className="text-gray-500 font-mono text-xs">
                  → {formatTime(entry.timeRange.end)}
                </div>
              </td>
              <td className="py-3 px-3">
                <span className="text-gray-300 font-mono text-xs">{entry.splitRatio}</span>
              </td>
              <td className="py-3 px-3">
                <AuthBadge status={entry.authorization.status} />
                <div className="text-gray-500 text-xs mt-1">
                  至 {formatDate(entry.authorization.endDate)}
                </div>
              </td>
              <td className="py-3 px-3">
                <AlignmentBadge status={entry.alignmentStatus} />
              </td>
              <td className="py-3 px-3">
                <ReviewBadge status={entry.reviewStatus} />
              </td>
              <td className="py-3 px-3 text-center">
                <span className="text-gray-400 font-mono text-xs">{entry.remarks.length}</span>
              </td>
              <td className="py-3 px-3 text-center">
                <span className="text-gray-400 font-mono text-xs">{entry.screenshots.length}</span>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-8 text-gray-500 text-sm">
                没有匹配的条目
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
