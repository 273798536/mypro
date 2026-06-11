import { useStore } from '@/store/useStore'
import { CheckCircle, XCircle, Upload, FileText, Edit3, RotateCcw, AlertTriangle } from 'lucide-react'
import type { LogType } from '@/types'

const ICONS: Record<LogType, React.ReactNode> = {
  import: <Upload size={14} />,
  confirm: <CheckCircle size={14} />,
  withdraw: <XCircle size={14} />,
  note_edit: <Edit3 size={14} />,
  report_export: <FileText size={14} />,
  rerun: <RotateCcw size={14} />,
  import_skip: <AlertTriangle size={14} />,
}

const COLORS: Record<LogType, string> = {
  import: 'bg-ink-800 text-white',
  confirm: 'bg-success text-white',
  withdraw: 'bg-muted text-white',
  note_edit: 'bg-ink-700 text-white',
  report_export: 'bg-ink-700 text-white',
  rerun: 'bg-warn text-white',
  import_skip: 'bg-warn text-white',
}

const LABELS: Record<LogType, string> = {
  import: '导入',
  confirm: '确认',
  withdraw: '撤回',
  note_edit: '改备注',
  report_export: '导出报告',
  rerun: '重跑',
  import_skip: '跳过重复',
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function Timeline() {
  const logs = useStore(s => s.logs)
  const sorted = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30)

  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 p-5">
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-4">操作时间线</h3>
      {sorted.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">暂无操作记录</div>
      ) : (
        <ol className="relative border-l border-slate-200 ml-2 space-y-4">
          {sorted.map(log => (
            <li key={log.id} className="ml-5">
              <span
                className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ${COLORS[log.type]}`}
              >
                {ICONS[log.type]}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono">{fmtTime(log.timestamp)}</span>
                <span className="inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-medium bg-ink-700/80">
                  {LABELS[log.type]}
                </span>
                <span className="text-slate-500">{log.operator}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-700 leading-relaxed">{log.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
