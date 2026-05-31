import { useState } from 'react'
import type { DeductionDetail } from '@/types'

const statusLabels: Record<DeductionDetail['status'], string> = {
  normal: '正常',
  duplicate: '重复扣次',
  expired: '套餐过期',
  manual_override: '人工修改',
}

const statusBadge: Record<DeductionDetail['status'], string> = {
  normal: 'badge-success',
  duplicate: 'badge-danger',
  expired: 'badge-warning',
  manual_override: 'badge-info',
}

function remainingColor(count: number) {
  if (count === 0) return 'text-red-600 font-semibold'
  if (count <= 2) return 'text-amber-600 font-medium'
  return 'text-emerald-600'
}

interface Props {
  detail: DeductionDetail
  onManualOverride: (detail: DeductionDetail) => void
}

export default function DeductionDetailRow({ detail, onManualOverride }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)

  const isManualOverride = detail.status === 'manual_override'

  return (
    <tr className={`table-row-hover ${isManualOverride ? 'border-l-4 border-orange-500' : ''}`}>
      <td className="px-4 py-3 text-sm text-slate-700">{detail.package_name || detail.package_id}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{detail.deduction_count}</td>
      <td className="px-4 py-3 text-sm">
        <span className={remainingColor(detail.remaining_count)}>{detail.remaining_count}</span>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`${statusBadge[detail.status]} ${isManualOverride ? 'ring-1 ring-blue-300' : ''}`}>
          {statusLabels[detail.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {isManualOverride && (
          <span
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span className="badge-info cursor-help">人工修改</span>
            {showTooltip && (
              <span className="absolute z-20 bottom-full left-0 mb-2 w-56 p-2 rounded-lg bg-slate-800 text-xs text-white shadow-lg">
                <div>原状态: {detail.original_status}</div>
                <div>操作人: {detail.manual_override_by}</div>
                <div>时间: {detail.manual_override_at}</div>
                <div>原因: {detail.manual_override_reason}</div>
              </span>
            )}
          </span>
        )}
        {!isManualOverride && <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-sm">
        {detail.backfill_affected ? (
          <span className="inline-flex flex-col gap-0.5">
            <span className="badge-info">补录影响</span>
            {detail.backfill_source_transaction_id && (
              <span className="text-xs text-blue-500">来源: {detail.backfill_source_transaction_id.slice(0, 8)}…</span>
            )}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{detail.created_at}</td>
      <td className="px-4 py-3 text-sm">
        {!isManualOverride && (
          <button className="btn-primary btn-sm" onClick={() => onManualOverride(detail)}>
            人工修改
          </button>
        )}
      </td>
    </tr>
  )
}
