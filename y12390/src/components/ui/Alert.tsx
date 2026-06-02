import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Anomaly } from '@/types'
import StatusBadge from './StatusBadge'

interface AlertProps {
  anomaly: Anomaly
  children?: React.ReactNode
  className?: string
}

const severityColor: Record<Anomaly['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

export default function Alert({ anomaly, children, className }: AlertProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        className
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1',
          severityColor[anomaly.severity]
        )}
      />

      <div className="flex items-start justify-between p-4 pl-5">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <StatusBadge severity={anomaly.severity} />
            <StatusBadge status={anomaly.status} />
          </div>
          <h4 className="mt-2 font-medium text-foreground">{anomaly.description}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{anomaly.entityName}</p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-4 rounded p-1 text-muted-foreground/70 hover:bg-accent hover:text-muted-foreground"
        >
          {expanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 pl-5">
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-foreground">影响说明：</span>
              <span className="text-muted-foreground">{anomaly.impactExplanation}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">检测时间：</span>
              <span className="text-muted-foreground">
                {new Date(anomaly.detectedAt).toLocaleString()}
              </span>
            </div>
            {anomaly.affectedItems.length > 0 && (
              <div>
                <span className="font-medium text-foreground">受影响项：</span>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {anomaly.affectedItems.map((item) => (
                    <li key={item.id}>
                      {item.name}
                      {item.path && (
                        <span className="text-muted-foreground/70"> ({item.path})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {children && <div className="mt-4 flex gap-2">{children}</div>}
        </div>
      )}
    </div>
  )
}
