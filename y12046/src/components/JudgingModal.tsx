import { ShieldCheck, ShieldX, HelpCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CorrectAnswer } from '@/data/scenarios'

interface JudgingModalProps {
  open: boolean
  onClose: () => void
  onSelectAnswer: (answer: CorrectAnswer) => void
  selectedAnswer: CorrectAnswer | null
  onSubmit: () => void
}

const options: { value: CorrectAnswer; label: string; icon: typeof ShieldCheck; colorClass: string; selectedClass: string }[] = [
  {
    value: 'compliant',
    label: '合规',
    icon: ShieldCheck,
    colorClass: 'border-success/40 text-success-light hover:bg-success/10',
    selectedClass: 'bg-success/20 border-success text-success-light shadow-lg shadow-success/20',
  },
  {
    value: 'non-compliant',
    label: '不合规',
    icon: ShieldX,
    colorClass: 'border-danger/40 text-danger-light hover:bg-danger/10',
    selectedClass: 'bg-danger/20 border-danger text-danger-light shadow-lg shadow-danger/20',
  },
  {
    value: 'needs-review',
    label: '需进一步核实',
    icon: HelpCircle,
    colorClass: 'border-amber/40 text-amber hover:bg-amber/10',
    selectedClass: 'bg-amber/20 border-amber text-amber shadow-lg shadow-amber-glow',
  },
]

export default function JudgingModal({ open, onClose, onSelectAnswer, selectedAnswer, onSubmit }: JudgingModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-base p-6 w-full max-w-md mx-4 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-400 hover:text-ink-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="section-title mb-5">提交审核结论</h2>

        <div className="space-y-3 mb-6">
          {options.map(({ value, label, icon: Icon, colorClass, selectedClass }) => {
            const isSelected = selectedAnswer === value
            return (
              <button
                key={value}
                onClick={() => onSelectAnswer(value)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left font-serif font-semibold transition-all duration-200',
                  !isSelected && colorClass,
                  isSelected && selectedClass
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={onSubmit}
          disabled={!selectedAnswer}
          className={cn(
            'w-full py-2.5 rounded-lg font-serif font-semibold text-sm transition-all duration-200',
            selectedAnswer
              ? 'btn-primary'
              : 'bg-ink-700 text-ink-400 cursor-not-allowed border border-ink-600'
          )}
        >
          确认提交
        </button>
      </div>
    </div>
  )
}
