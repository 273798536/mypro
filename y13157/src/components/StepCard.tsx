import { ChevronDown, ChevronUp, Camera, AlertTriangle } from 'lucide-react'
import type { Step, ParamValue, Anomaly } from '@/types'
import { dirLabel } from '@/utils/detect'

interface Props {
  step: Step
  params: ParamValue[]
  anomalies: Anomaly[]
  expanded: boolean
  onToggle: () => void
}

export default function StepCard({ step, params, anomalies, expanded, onToggle }: Props) {
  const stepAnomalies = anomalies.filter((a) => a.stepId === step.id)
  const hasAnomaly = stepAnomalies.length > 0

  return (
    <div
      className={[
        'relative rounded-lg border bg-industrial-card transition-all',
        step.isRetracted
          ? 'border-industrial-border/50 opacity-70 bg-retract-stripe'
          : hasAnomaly
            ? 'border-industrial-red/60 animate-pulse-ring'
            : 'border-industrial-border hover:border-industrial-blue/50',
      ].join(' ')}
    >
      {step.isRetracted && <div className="retract-stamp">撤 回</div>}

      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-4 text-left"
      >
        <div
          className={[
            'shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border',
            step.isRetracted
              ? 'bg-industrial-panel/60 border-industrial-border text-industrial-muted line-through'
              : hasAnomaly
                ? 'bg-industrial-red/20 border-industrial-red text-industrial-red'
                : 'bg-industrial-blue/20 border-industrial-blue text-industrial-blue',
          ].join(' ')}
        >
          {step.stepIndex}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={[
                'font-semibold',
                step.isRetracted ? 'text-industrial-muted line-through' : 'text-white',
              ].join(' ')}
            >
              {step.title}
            </h3>
            {hasAnomaly && !step.isRetracted && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-industrial-red/15 text-industrial-red border border-industrial-red/30">
                <AlertTriangle size={12} />
                {stepAnomalies.length} 处异常
              </span>
            )}
            {step.isRetracted && (
              <span className="text-xs px-2 py-0.5 rounded bg-industrial-panel text-industrial-muted border border-industrial-border">
                {step.retractReason ?? '记录已撤回'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-industrial-muted line-clamp-1">
            {step.description}
          </p>
        </div>
        <div className="shrink-0 text-industrial-muted">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-industrial-border/60 animate-slide-in-right">
          <div className="pt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-industrial-muted mb-2 flex items-center gap-1">
                <Camera size={14} /> 现场照片
              </div>
              <img
                src={step.photo}
                alt={`${step.title}现场照片`}
                loading="lazy"
                onError={(e) => {
                  const t = e.currentTarget
                  t.onerror = null
                  t.src =
                    "data:image/svg+xml;utf8," +
                    encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1e293b"/><text x="200" y="150" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="14">现场照片缺失</text><text x="200" y="172" text-anchor="middle" fill="#475569" font-family="monospace" font-size="11">' + step.title + '</text></svg>',
                    )
                }}
                className={[
                  'w-full h-44 object-cover rounded border border-industrial-border bg-industrial-panel',
                  step.isRetracted ? 'grayscale' : '',
                ].join(' ')}
              />
            </div>
            <div>
              <div className="text-xs text-industrial-muted mb-2">本步骤参数</div>
              {params.length === 0 ? (
                <div className="text-sm text-industrial-muted">无参数记录</div>
              ) : (
                <div className="space-y-2">
                  {params.map((p) => (
                    <div
                      key={p.id}
                      className={[
                        'flex items-center justify-between rounded border px-3 py-2 text-sm font-mono',
                        p.hasUnitError || p.hasDirectionError
                          ? 'bg-industrial-orange/10 border-industrial-orange/40'
                          : 'bg-industrial-panel border-industrial-border',
                      ].join(' ')}
                    >
                      <span className="text-industrial-text">{p.paramName}</span>
                      <span className="text-right">
                        <span className="text-white font-semibold">{p.value}</span>
                        <span className="text-industrial-muted ml-1">{p.unit}</span>
                        {p.direction && (
                          <span
                            className={[
                              'ml-2 text-xs px-1.5 py-0.5 rounded',
                              p.hasDirectionError
                                ? 'bg-industrial-red/20 text-industrial-red'
                                : 'bg-industrial-green/20 text-industrial-green',
                            ].join(' ')}
                          >
                            {dirLabel(p.direction)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {stepAnomalies.length > 0 && (
                <div className="mt-4 space-y-2">
                  {stepAnomalies.map((a) => (
                    <div
                      key={a.id}
                      className="rounded border border-industrial-orange/50 bg-industrial-orange/5 p-3"
                    >
                      <div className="text-xs text-industrial-orange font-semibold mb-1">
                        {a.type === 'unit'
                          ? '单位混写异常'
                          : a.type === 'direction'
                            ? '方向符号反写'
                            : '其他异常'}
                      </div>
                      <div className="text-sm text-white">{a.description}</div>
                      <pre className="mt-2 text-xs text-industrial-muted whitespace-pre-wrap font-mono leading-relaxed">
                        {a.actionHint}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
