import { AlertTriangle, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorAnalysisCardProps {
  errorType: string
  lawReference: string
  explanation: string
  scenarioTitle: string
}

export default function ErrorAnalysisCard({
  errorType,
  lawReference,
  explanation,
  scenarioTitle,
}: ErrorAnalysisCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-ink-800 border-t-2 border-t-danger',
        'border-l-2 border-l-danger/40',
        'p-4 animate-fade-in'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
        <span className="text-xs text-ink-300 font-serif">
          {scenarioTitle}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            'inline-flex items-center rounded px-2 py-0.5',
            'bg-danger/15 text-danger text-xs font-serif font-semibold',
            'border border-danger/30'
          )}
        >
          {errorType}
        </span>
      </div>

      <div className="flex items-start gap-2 mb-3">
        <BookOpen className="h-3.5 w-3.5 text-amber shrink-0 mt-0.5" />
        <code className="text-xs font-mono text-amber-light break-all leading-relaxed">
          {lawReference}
        </code>
      </div>

      <p className="text-sm text-parchment-200 font-serif leading-relaxed">
        {explanation}
      </p>
    </div>
  )
}
