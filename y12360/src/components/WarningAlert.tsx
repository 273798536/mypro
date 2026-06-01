import { AlertTriangle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Warning, WarningSeverity } from "@shared/types"

const severityConfig: Record<WarningSeverity, { icon: React.ElementType; borderClass: string; iconClass: string; bgClass: string }> = {
  error: {
    icon: XCircle,
    borderClass: "border-red-400",
    iconClass: "text-red-500",
    bgClass: "bg-red-50",
  },
  warning: {
    icon: AlertTriangle,
    borderClass: "border-amber-400",
    iconClass: "text-amber-500",
    bgClass: "bg-amber-50",
  },
  info: {
    icon: Info,
    borderClass: "border-blue-400",
    iconClass: "text-blue-500",
    bgClass: "bg-blue-50",
  },
}

interface WarningAlertProps {
  warnings: Warning[]
}

export default function WarningAlert({ warnings }: WarningAlertProps) {
  if (warnings.length === 0) return null

  return (
    <div className="space-y-2">
      {warnings.map((w) => {
        const config = severityConfig[w.severity]
        const Icon = config.icon

        return (
          <div
            key={w.code}
            className={cn(
              "rounded-lg border-l-4 p-3 shadow-sm",
              config.borderClass,
              config.bgClass,
            )}
          >
            <div className="flex items-start gap-2">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{w.message}</p>
                {w.affectedFields.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {w.affectedFields.map((field) => (
                      <span
                        key={field}
                        className="inline-block rounded bg-white/80 px-1.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
