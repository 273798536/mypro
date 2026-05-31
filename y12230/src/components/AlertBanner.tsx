import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'
import { useStore } from '@/store'
import type { ValidationAlert } from '@/types'

const TYPE_CONFIG: Record<ValidationAlert['type'], { label: string; color: string }> = {
  cross_project: { label: '项目串账', color: '#d4a853' },
  retroactive_entry: { label: '工时补录', color: '#d4a853' },
  missing_invoice: { label: '发票缺项', color: '#e8635a' },
}

const SEVERITY_COLOR: Record<ValidationAlert['severity'], string> = {
  error: '#e8635a',
  warning: '#d4a853',
}

function AlertItem({ alert }: { alert: ValidationAlert }) {
  const [text, setText] = useState('')
  const resolveAlert = useStore((s) => s.resolveAlert)
  const getProjectName = useStore((s) => s.getProjectName)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: SEVERITY_COLOR[alert.severity] }}
        >
          {alert.severity === 'error' ? '错误' : '警告'}
        </span>
        <span className="text-sm text-gray-800 dark:text-gray-200">{alert.message}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {alert.affectedProjectIds.map((pid) => (
          <span
            key={pid}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          >
            {getProjectName(pid)}
          </span>
        ))}
      </div>
      {alert.resolved ? (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{alert.explanation}</span>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            placeholder="填写确认说明…"
          />
          <button
            disabled={!text.trim()}
            onClick={() => {
              resolveAlert(alert.id, text.trim())
              setText('')
            }}
            className="shrink-0 self-end rounded bg-[#d4a853] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            确认说明
          </button>
        </div>
      )}
    </div>
  )
}

function AlertSection({
  type,
  alerts,
}: {
  type: ValidationAlert['type']
  alerts: ValidationAlert[]
}) {
  const [open, setOpen] = useState(true)
  const config = TYPE_CONFIG[type]

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        <AlertTriangle className="h-4 w-4" style={{ color: config.color }} />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {config.label}
        </span>
        <span
          className="ml-1 rounded-full px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: config.color }}
        >
          {alerts.length}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 px-4 pb-3">
          {alerts.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  )
}

const SECTION_ORDER: ValidationAlert['type'][] = [
  'cross_project',
  'retroactive_entry',
  'missing_invoice',
]

export default function AlertBanner() {
  const alerts = useStore((s) => s.alerts)

  const grouped = SECTION_ORDER.map((type) => ({
    type,
    alerts: alerts.filter((a) => a.type === type),
  })).filter((g) => g.alerts.length > 0)

  if (grouped.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {grouped.map((g) => (
        <AlertSection key={g.type} type={g.type} alerts={g.alerts} />
      ))}
    </div>
  )
}
