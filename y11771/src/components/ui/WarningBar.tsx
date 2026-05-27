import { useRobotStore } from '@/store/useRobotStore'
import { AlertTriangle, OctagonAlert, Info, X } from 'lucide-react'
import { useState } from 'react'
import type { Warning } from '@/utils/kinematics'

const severityConfig = {
  danger: {
    icon: OctagonAlert,
    bg: 'bg-red-950/60',
    border: 'border-red-500/40',
    text: 'text-red-300',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-yellow-950/40',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    iconColor: 'text-yellow-400',
  },
}

export default function WarningBar() {
  const warnings = useRobotStore(s => s.warnings)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = warnings.filter(w => !dismissed.has(w.id))

  if (visible.length === 0) return null

  return (
    <div className="absolute top-3 left-3 right-3 z-20 space-y-1.5 pointer-events-none">
      {visible.map(w => {
        const config = severityConfig[w.severity]
        const Icon = config.icon
        return (
          <div
            key={w.id}
            className={`pointer-events-auto flex items-start gap-2 px-3 py-2 rounded-lg border
              ${config.bg} ${config.border} backdrop-blur-sm`}
          >
            <Icon size={14} className={`${config.iconColor} mt-0.5 shrink-0`} />
            <span className={`text-xs ${config.text} flex-1`}>{w.message}</span>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(w.id))}
              className="shrink-0 hover:opacity-80"
            >
              <X size={12} className="text-slate-500" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
