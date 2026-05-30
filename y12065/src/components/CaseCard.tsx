import { useNavigate } from 'react-router-dom'
import { ChevronRight, BookOpen, Star } from 'lucide-react'
import type { Case } from '@/types'
import { DIFFICULTY_LABELS } from '@/types'
import { useGameStore } from '@/store/gameStore'

interface CaseCardProps {
  caseData: Case
}

const CaseCard = ({ caseData }: CaseCardProps) => {
  const navigate = useNavigate()
  const { solvedCases, setCurrentCase, resetCaseState } = useGameStore()
  const isSolved = solvedCases.includes(caseData.id)

  const handleClick = () => {
    resetCaseState()
    setCurrentCase(caseData.id)
    navigate(`/case/${caseData.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="parchment-card p-6 cursor-pointer group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`tag-badge tag-difficulty-${caseData.difficulty}`}>
            {DIFFICULTY_LABELS[caseData.difficulty]}
          </span>
          {isSolved && (
            <span className="tag-badge bg-success/20 text-success">
              <Star className="w-3 h-3 mr-1 fill-current" />
              已破案
            </span>
          )}
        </div>
        <BookOpen className="w-5 h-5 text-primary-600 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>

      <h3 className="font-serif text-lg font-bold text-primary-800 mb-2 group-hover:text-accent-gold transition-colors">
        {caseData.title}
      </h3>

      <p className="text-sm text-primary-600 mb-4 line-clamp-2">
        {caseData.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {caseData.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-md"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-parchment-300">
        <span className="text-xs text-primary-500">
          训练目标：{caseData.targetConcept}
        </span>
        <div className="flex items-center gap-1 text-accent-gold font-medium text-sm group-hover:gap-2 transition-all">
          开始调查
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

export default CaseCard
