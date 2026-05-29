import type { Anomaly } from '@/types'
import { AlertTriangle, X } from 'lucide-react'

interface WarningBannerProps {
  anomalies: Anomaly[]
  onDismiss: () => void
}

export default function WarningBanner({ anomalies, onDismiss }: WarningBannerProps) {
  if (anomalies.length === 0) return null

  const hasError = anomalies.some(a => a.severity === 'error')

  return (
    <div className={`absolute top-0 left-0 right-0 z-40 ${hasError ? 'bg-[#ff3366]/10 border-[#ff3366]/40' : 'bg-[#ff6b35]/10 border-[#ff6b35]/40'} border-b backdrop-blur px-4 py-2 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className={hasError ? 'text-[#ff3366]' : 'text-[#ff6b35]'} />
        <div className="flex items-center gap-3">
          {anomalies.map((a, i) => (
            <span key={i} className={`text-xs font-mono ${hasError ? 'text-[#ff3366]' : 'text-[#ff6b35]'}`}>
              {a.message}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onDismiss} className="text-[#8892a4] hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}
