import { CheckCircle, Circle } from 'lucide-react'
import type { AnswerOption as AnswerOptionType } from '@/types'
import { useGameStore } from '@/store/gameStore'

interface AnswerOptionProps {
  option: AnswerOptionType
  disabled?: boolean
}

const AnswerOption = ({ option, disabled = false }: AnswerOptionProps) => {
  const { selectedAnswerId, setSelectedAnswer } = useGameStore()
  const isSelected = selectedAnswerId === option.id

  const handleClick = () => {
    if (disabled) return
    setSelectedAnswer(option.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-accent-gold bg-accent-gold/10'
          : 'border-parchment-300 bg-parchment-50 hover:border-accent-gold/50'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isSelected ? (
            <CheckCircle className="w-5 h-5 text-accent-gold" />
          ) : (
            <Circle className="w-5 h-5 text-primary-400" />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-medium ${isSelected ? 'text-accent-gold' : 'text-primary-800'}`}>
            {option.label}
          </p>
          {option.inversionInfo && (
            <p className="text-xs text-primary-500 mt-1">
              转位信息：{option.inversionInfo}
            </p>
          )}
          {option.modeInfo && (
            <p className="text-xs text-primary-500 mt-1">
              调式：{option.modeInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnswerOption
