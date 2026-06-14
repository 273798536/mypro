import type { ConflictRecord, RecordStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import { Pencil, MessageSquarePlus, Tag, StickyNote } from 'lucide-react'

const STRIP_COLORS: Record<RecordStatus, string> = {
  normal: '#22c55e',
  conflict: '#ef4444',
  pending: '#eab308',
  resolved: '#3b82f6',
}

const BADGE_COLORS: Record<RecordStatus, { bg: string; text: string }> = {
  normal: { bg: '#14532d', text: '#22c55e' },
  conflict: { bg: '#450a0a', text: '#ef4444' },
  pending: { bg: '#422006', text: '#eab308' },
  resolved: { bg: '#172554', text: '#3b82f6' },
}

interface ConflictCardProps {
  record: ConflictRecord
  onEdit: (record: ConflictRecord) => void
  onAddSupplementaryRemark: (record: ConflictRecord) => void
}

function AuthProgressBar({ start, end }: { start: string; end: string }) {
  const startDate = new Date(start).getTime()
  const endDate = new Date(end).getTime()
  const now = Date.now()
  const pct = endDate > startDate ? Math.min(100, Math.max(0, ((now - startDate) / (endDate - startDate)) * 100)) : 0
  const isExpired = now > endDate

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#e8e8e8]/60">{start}</span>
        <span className="text-[#e8e8e8]/60">{end}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a2e' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${isExpired ? 100 : pct}%`,
            backgroundColor: isExpired ? '#ef4444' : pct > 80 ? '#eab308' : '#22c55e',
          }}
        />
      </div>
    </div>
  )
}

export default function ConflictCard({ record, onEdit, onAddSupplementaryRemark }: ConflictCardProps) {
  const hasSupp = record.supplementaryRemarks.length > 0

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        backgroundColor: '#2d2d44',
        border: hasSupp ? '2px solid #f0a500' : '1px solid #3a3a55',
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: STRIP_COLORS[record.status] }} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className="text-lg font-bold text-[#e8e8e8] leading-tight"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            {record.songName}
          </h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: BADGE_COLORS[record.status].bg, color: BADGE_COLORS[record.status].text }}
          >
            {STATUS_LABELS[record.status]}
          </span>
        </div>

        {record.songAlias.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <Tag size={14} className="text-[#e8e8e8]/40" />
            {record.songAlias.map((alias) => (
              <span key={alias} className="rounded-md px-2 py-0.5 text-xs text-[#e8e8e8]/80" style={{ backgroundColor: '#1a1a2e' }}>
                {alias}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 text-sm text-[#e8e8e8]">
          <code className="rounded px-2 py-0.5 text-xs font-mono" style={{ backgroundColor: '#1a1a2e', color: '#f0a500' }}>
            {record.timecodeStart}
          </code>
          <span className="text-[#e8e8e8]/50">~</span>
          <code className="rounded px-2 py-0.5 text-xs font-mono" style={{ backgroundColor: '#1a1a2e', color: '#f0a500' }}>
            {record.timecodeEnd}
          </code>
        </div>

        <div className="mb-3">
          <div className="text-xs text-[#e8e8e8]/50 mb-1">授权期限</div>
          <AuthProgressBar start={record.authPeriodStart} end={record.authPeriodEnd} />
        </div>

        {record.exceptionReason && (
          <p className="text-sm text-[#e8e8e8]/70 mb-3 leading-relaxed">{record.exceptionReason}</p>
        )}

        {record.remarks.length > 0 && (
          <div className="flex items-center gap-1 mb-3 text-xs text-[#e8e8e8]/50">
            <StickyNote size={14} />
            <span>{record.remarks.length} 条备注</span>
          </div>
        )}

        {hasSupp && (
          <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs mb-3" style={{ backgroundColor: '#3d2a10', color: '#f0a500' }}>
            <MessageSquarePlus size={14} />
            {record.supplementaryRemarks.length} 条后补备注
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-[#3a3a55]">
          <button
            onClick={() => onEdit(record)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1 shadow-[0_2px_0_#b07800] transition-colors"
            style={{ backgroundColor: '#f0a500', color: '#1a1a2e' }}
          >
            <Pencil size={14} />
            编辑
          </button>
          <button
            onClick={() => onAddSupplementaryRemark(record)}
            className="rounded-lg px-3 py-1.5 text-sm flex items-center gap-1 border transition-colors"
            style={{ borderColor: '#f0a500', color: '#f0a500', backgroundColor: 'transparent' }}
          >
            <MessageSquarePlus size={14} />
            添加后补备注
          </button>
        </div>
      </div>
    </div>
  )
}
