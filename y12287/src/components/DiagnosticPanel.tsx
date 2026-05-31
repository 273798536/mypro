import { AlertTriangle, ArrowLeftRight, CircleDot, Layers, Wrench, ShieldAlert } from 'lucide-react'
import type { DiagnosticAlert, AlertType, Severity } from '@/types'

interface DiagnosticPanelProps {
  alerts: DiagnosticAlert[]
  selectedTooth: string | null
  onSelectTooth: (tooth: string | null) => void
  onNavigateCorrection: () => void
}

const alertTypeConfig: Record<AlertType, { label: string; icon: React.ReactNode; color: string; glow: string }> = {
  misalignment: {
    label: '上下颌错位',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
    color: 'text-misaligned',
    glow: 'glow-misaligned',
  },
  overlap: {
    label: '接触点重叠',
    icon: <Layers className="w-3.5 h-3.5" />,
    color: 'text-overlap',
    glow: 'glow-overlap',
  },
  excessive: {
    label: '磨改过量',
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: 'text-excessive',
    glow: 'glow-excessive',
  },
  dataGap: {
    label: '数据缺口',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: 'text-dataGap',
    glow: '',
  },
  conflict: {
    label: '材料冲突',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    color: 'text-overlap',
    glow: 'glow-overlap',
  },
}

const severityOrder: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const severityStyle: Record<Severity, { bg: string; border: string; badge: string; badgeText: string }> = {
  critical: {
    bg: 'bg-excessive/5',
    border: 'border-excessive/30',
    badge: 'bg-excessive',
    badgeText: 'text-white',
  },
  warning: {
    bg: 'bg-misaligned/5',
    border: 'border-misaligned/30',
    badge: 'bg-misaligned',
    badgeText: 'text-bg-primary',
  },
  info: {
    bg: 'bg-lower/5',
    border: 'border-lower/30',
    badge: 'bg-lower',
    badgeText: 'text-bg-primary',
  },
}

export default function DiagnosticPanel({ alerts, selectedTooth, onSelectTooth, onNavigateCorrection }: DiagnosticPanelProps) {
  const sortedAlerts = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const filteredAlerts = selectedTooth
    ? sortedAlerts.filter((a) => a.toothNumber === selectedTooth)
    : sortedAlerts

  const grouped = filteredAlerts.reduce<Record<Severity, DiagnosticAlert[]>>((acc, alert) => {
    if (!acc[alert.severity]) acc[alert.severity] = []
    acc[alert.severity].push(alert)
    return acc
  }, {} as Record<Severity, DiagnosticAlert[]>)

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  return (
    <div className="w-[300px] shrink-0 bg-bg-surface/80 backdrop-blur-sm border-l border-mono-dim/20 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-mono-dim/20 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-mono tracking-wide">诊断提示</h2>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-excessive text-white">
                {criticalCount} 严重
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-misaligned text-bg-primary">
                {warningCount} 警告
              </span>
            )}
          </div>
        </div>
        {selectedTooth && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-mono-muted">筛选: 牙#{selectedTooth}</span>
            <button
              className="text-xs text-lower hover:text-lower/80 underline"
              onClick={() => onSelectTooth(null)}
            >
              清除
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {(Object.keys(severityOrder) as Severity[]).map((severity) => {
          const group = grouped[severity]
          if (!group || group.length === 0) return null
          const style = severityStyle[severity]

          return (
            <div key={severity} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${style.badge} ${style.badgeText}`}>
                  {severity === 'critical' ? '严重' : severity === 'warning' ? '警告' : '信息'}
                </span>
                <span className="text-xs text-mono-dim">{group.length}条</span>
              </div>

              {group.map((alert) => {
                const typeConfig = alertTypeConfig[alert.alertType]
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${style.border} ${style.bg} ${typeConfig.glow} cursor-pointer hover:brightness-110 transition-all animate-slide-in-right`}
                    onClick={() => alert.toothNumber !== '—' && onSelectTooth(alert.toothNumber)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`${typeConfig.color} mt-0.5 shrink-0`}>{typeConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${typeConfig.color}`}>{typeConfig.label}</span>
                          {alert.toothNumber !== '—' && (
                            <span className="font-tooth-number text-xs text-mono">#{alert.toothNumber}</span>
                          )}
                        </div>
                        <p className="text-xs text-mono-muted leading-relaxed">{alert.description}</p>
                        <p className="text-[10px] text-mono-dim mt-1">材料: {alert.materialName}</p>

                        {alert.alertType === 'conflict' && alert.sourceA && alert.sourceB && (
                          <div className="mt-2 pt-2 border-t border-mono-dim/20">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <span className="text-[10px] text-upper font-semibold">{alert.sourceA}</span>
                                <p className="font-tooth-number text-xs text-mono">{alert.valueA}</p>
                              </div>
                              <div className="w-px bg-mono-dim/30" />
                              <div className="flex-1">
                                <span className="text-[10px] text-lower font-semibold">{alert.sourceB}</span>
                                <p className="font-tooth-number text-xs text-mono">{alert.valueB}</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-mono-dim mt-1 italic">材料数据冲突，已同时展示，未自动修改口径</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-mono-dim/20 space-y-2">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-misaligned/20 border border-misaligned/40 text-misaligned text-xs font-semibold hover:bg-misaligned/30 transition-colors"
          onClick={onNavigateCorrection}
        >
          <CircleDot className="w-3.5 h-3.5" />
          进入手动修正
        </button>
        <p className="text-[10px] text-mono-dim text-center">
          修正后可并排对比新旧咬合点
        </p>
      </div>
    </div>
  )
}
