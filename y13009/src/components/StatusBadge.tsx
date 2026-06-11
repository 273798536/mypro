import type { CashFlowRecord } from '@/types'
import { STATUS_LABEL, STATUS_COLOR } from '@/utils/report'

interface Props {
  record: CashFlowRecord
}

export default function StatusBadge({ record }: Props) {
  const badges: { label: string; cls: string }[] = []
  if (record.isReversal) {
    badges.push({ label: STATUS_LABEL.reversal, cls: STATUS_COLOR.reversal })
  }
  badges.push({ label: STATUS_LABEL[record.baseStatus], cls: STATUS_COLOR[record.baseStatus] })

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {badges.map((b, i) => (
        <span
          key={i}
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${b.cls}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  )
}
