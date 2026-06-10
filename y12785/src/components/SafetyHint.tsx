import { AlertTriangle, ExternalLink } from 'lucide-react'
import { SafetyHintItem } from '@/store'

interface SafetyHintProps {
  hints: SafetyHintItem[]
}

export default function SafetyHint({ hints }: SafetyHintProps) {
  if (hints.length === 0) return null

  return (
    <div className="space-y-3">
      {hints.map((hint) => (
        <div
          key={hint.id}
          className="border-l-4 border-amber-500 bg-amber-500/5 rounded-r-lg p-4"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-relaxed">{hint.content}</p>
              {hint.sourceMaterial && (
                <a
                  href={hint.sourceUrl || '#'}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-900 hover:text-indigo-700 font-medium"
                >
                  <ExternalLink size={12} />
                  {hint.sourceMaterial}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
