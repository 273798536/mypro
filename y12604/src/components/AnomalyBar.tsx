import { useState } from 'react'
import { AlertTriangle, Ruler, PackageOpen, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/gameStore'
import type { AnomalyType, AnomalySeverity } from '@/types'

const TYPE_ICON: Record<AnomalyType, typeof AlertTriangle> = {
  coordinate_flip: AlertTriangle,
  scale_mismatch: Ruler,
  missing_equipment: PackageOpen,
}

const SEVERITY_CONFIG: Record<AnomalySeverity, { label: string; color: string; bg: string }> = {
  need_material: { label: '需补材料', color: '#ED8936', bg: 'rgba(237,137,54,0.12)' },
  need_caliber_change: { label: '需改口径', color: '#E53E3E', bg: 'rgba(229,62,62,0.12)' },
}

export default function AnomalyBar() {
  const anomalies = useGameStore((s) => s.anomalies)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-400">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">校对正常</span>
      </div>
    )
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap gap-2">
        {anomalies.map((anomaly) => {
          const Icon = TYPE_ICON[anomaly.type]
          const sev = SEVERITY_CONFIG[anomaly.severity]
          const isExpanded = expandedId === anomaly.id

          return (
            <div key={anomaly.id} className="w-full min-w-[260px]">
              <button
                type="button"
                onClick={() => toggleExpand(anomaly.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                  isExpanded
                    ? 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                  {anomaly.description}
                </span>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{
                    color: sev.color,
                    backgroundColor: sev.bg,
                  }}
                >
                  {sev.label}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-2 rounded-b-md border border-t-0 border-zinc-200 bg-white px-3 pb-3 pt-2 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {anomaly.plainExplanation}
                  </p>
                  {anomaly.manualNote && (
                    <blockquote
                      className="rounded border-l-2 px-2 py-1.5 text-xs italic leading-relaxed text-zinc-600 dark:text-zinc-300"
                      style={{
                        backgroundColor: 'rgba(250,204,21,0.12)',
                        borderColor: '#EAB308',
                      }}
                    >
                      「{anomaly.manualNote}」
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
