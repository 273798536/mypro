import { useEffect, useRef } from 'react'
import { CheckCircle, BookMarked, AlertTriangle, FileText } from 'lucide-react'
import type { Clue } from '@/types'
import { useGameStore } from '@/store/gameStore'

interface ClueCardProps {
  clue: Clue
  showSource?: boolean
}

const ClueCard = ({ clue, showSource = true }: ClueCardProps) => {
  const {
    selectedClueIds,
    toggleClueSelection,
    markClueAsRead,
    highlightedSourceId,
    setHighlightedSource,
  } = useGameStore()

  const isSelected = selectedClueIds.includes(clue.id)
  const isHighlighted = highlightedSourceId === clue.id
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedSource(null)
    }
  }, [isHighlighted, setHighlightedSource])

  const handleClick = () => {
    toggleClueSelection(clue.id)
    markClueAsRead(clue.id)
  }

  const typeConfig = {
    theory: {
      icon: BookMarked,
      label: '理论',
      className: 'bg-blue-100 text-blue-700',
    },
    hint: {
      icon: FileText,
      label: '提示',
      className: 'bg-green-100 text-green-700',
    },
    trap: {
      icon: AlertTriangle,
      label: '陷阱',
      className: 'bg-red-100 text-red-700',
    },
  }

  const config = typeConfig[clue.type]
  const TypeIcon = config.icon

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`clue-card ${isSelected ? 'selected' : ''} ${clue.isKey ? 'key' : ''} ${
        clue.type === 'trap' ? 'trap' : ''
      } ${isHighlighted ? 'source-highlight' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-primary-600" />
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
          {clue.isKey && (
            <span className="px-2 py-0.5 bg-accent-gold/20 text-accent-gold rounded text-xs font-medium">
              关键线索
            </span>
          )}
        </div>
        {isSelected && (
          <CheckCircle className="w-5 h-5 text-accent-gold flex-shrink-0" />
        )}
      </div>

      <p className="text-sm text-primary-800 mb-2 leading-relaxed">
        {clue.content}
      </p>

      {showSource && (
        <p className="text-xs text-primary-500 italic">
          来源：{clue.source}
        </p>
      )}

      {clue.relatedConcepts.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {clue.relatedConcepts.map((concept) => (
            <span
              key={concept}
              className="px-1.5 py-0.5 bg-parchment-200 text-primary-600 text-xs rounded"
            >
              #{concept}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default ClueCard
