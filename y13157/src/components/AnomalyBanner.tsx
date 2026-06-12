import { AlertCircle, ChevronRight } from 'lucide-react'
import type { Anomaly } from '@/types'

interface Props {
  anomaly: Anomaly
  compact?: boolean
}

export default function AnomalyBanner({ anomaly, compact }: Props) {
  const color =
    anomaly.status === 'resolved'
      ? {
          border: 'border-industrial-green/40',
          bg: 'bg-industrial-green/5',
          dot: 'bg-industrial-green',
          text: 'text-industrial-green',
          label: '已处理',
        }
      : anomaly.status === 'processing'
        ? {
            border: 'border-industrial-orange/50',
            bg: 'bg-industrial-orange/10',
            dot: 'bg-industrial-orange',
            text: 'text-industrial-orange',
            label: '处理中',
          }
        : {
            border: 'border-industrial-red/50',
            bg: 'bg-industrial-red/10',
            dot: 'bg-industrial-red',
            text: 'text-industrial-red',
            label: '待处理',
          }

  return (
    <div className={`rounded-lg border ${color.border} ${color.bg} p-3`}>
      <div className="flex items-start gap-2">
        <AlertCircle size={18} className={`${color.text} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${color.text}`}>
              <span className={`w-2 h-2 rounded-full ${color.dot} ${anomaly.status !== 'resolved' ? 'animate-pulse' : ''}`} />
              {anomaly.type === 'unit'
                ? '单位混写'
                : anomaly.type === 'direction'
                  ? '方向符号反写'
                  : '异常'}
              · {color.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-white">{anomaly.description}</p>
          {!compact && (
            <>
              <div className="mt-2 flex items-center gap-1 text-xs text-industrial-muted">
                <ChevronRight size={14} />
                下一步操作
              </div>
              <pre className="mt-1 text-xs text-industrial-muted whitespace-pre-wrap font-mono leading-relaxed pl-4">
                {anomaly.actionHint}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
