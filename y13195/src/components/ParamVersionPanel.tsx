import type { EquipmentRecord, AnomalyPoint } from '@/types'
import { GitBranch, AlertCircle, MessageSquare, Paperclip } from 'lucide-react'

const sourceConfig: Record<
  AnomalyPoint['source'],
  { icon: typeof AlertCircle; label: string; tagClass: string }
> = {
  alarm: { icon: AlertCircle, label: '报警', tagClass: 'tag-alarm' },
  manual_note: { icon: MessageSquare, label: '人工备注', tagClass: 'tag-note' },
  late_attachment: { icon: Paperclip, label: '晚到附件', tagClass: 'tag-late' },
}

export default function ParamVersionPanel({ record }: { record: EquipmentRecord }) {
  const { paramVersion, paramVersionHistory, anomalyPoints } = record

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="card-base p-4">
        <h3 className="section-title flex items-center gap-1.5">
          <GitBranch className="h-4 w-4" />
          参数版本
        </h3>
        <div className="mt-3 space-y-0">
          {paramVersionHistory.map((v, i) => {
            const isCurrent = v === paramVersion
            const isLast = i === paramVersionHistory.length - 1
            return (
              <div key={v} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full border-2 ${
                      isCurrent
                        ? 'border-industrial-blue bg-industrial-blue shadow-[0_0_6px_rgba(59,130,246,0.6)]'
                        : 'border-base-500 bg-base-700'
                    }`}
                  />
                  {!isLast && <div className="h-6 w-px bg-base-600" />}
                </div>
                <span
                  className={`-mt-0.5 text-sm leading-6 ${
                    isCurrent
                      ? 'font-mono font-semibold text-industrial-blue-light'
                      : 'font-mono text-base-400'
                  }`}
                >
                  {v}
                  {isCurrent && (
                    <span className="ml-2 rounded bg-industrial-blue/20 px-1.5 py-0.5 text-xs text-industrial-blue">
                      当前
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card-base p-4">
        <h3 className="section-title flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          异常点
        </h3>
        {anomalyPoints.length === 0 ? (
          <p className="mt-3 text-sm text-base-500">无异常点</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {anomalyPoints.map((point) => {
              const cfg = sourceConfig[point.source]
              const Icon = cfg.icon
              return (
                <li key={point.id} className="rounded border border-base-600 bg-base-700/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`${cfg.tagClass} inline-flex items-center gap-1`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    <span className="param-value">{point.description}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-base-400">
                    {point.explanation}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
