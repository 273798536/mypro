import ProbabilityRanking from '@/components/ProbabilityRanking'
import EvidenceExplanation from '@/components/EvidenceExplanation'
import ReinspectionSuggestions from '@/components/ReinspectionSuggestions'
import TraceLinkView from '@/components/TraceLinkView'
import BoundaryWarnings from '@/components/BoundaryWarnings'
import { useBayesianStore } from '@/store/bayesianStore'
import { BarChart3, GitBranch, ListChecks, AlertTriangle, ClipboardList } from 'lucide-react'

export default function Dashboard() {
  const probabilities = useBayesianStore(s => s.probabilities)
  const boundaryWarnings = useBayesianStore(s => s.boundaryWarnings)
  const reinspectionSuggestions = useBayesianStore(s => s.reinspectionSuggestions)
  const evidenceChain = useBayesianStore(s => s.evidenceChain)

  const hasData = probabilities.length > 0

  return (
    <div className="space-y-5">
      {boundaryWarnings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
            <AlertTriangle size={16} />
            <span className="font-medium">边界值警告</span>
            <span className="text-xs text-zinc-500">({boundaryWarnings.length})</span>
          </div>
          <BoundaryWarnings />
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
          <BarChart3 size={16} className="text-amber-400" />
          <span className="font-medium">概率排序</span>
          {hasData && (
            <span className="text-xs text-zinc-500 ml-1">
              {probabilities.filter(p => p.rankChanged).length > 0
                ? `排序已变化 (${probabilities.filter(p => p.rankChanged).length} 项)`
                : '排序稳定'}
            </span>
          )}
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
          <ProbabilityRanking />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
          <ListChecks size={16} className="text-emerald-400" />
          <span className="font-medium">证据解释</span>
          <span className="text-xs text-zinc-500 ml-1">({evidenceChain.length} 条)</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4 max-h-72 overflow-y-auto">
          <EvidenceExplanation />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
          <ClipboardList size={16} className="text-sky-400" />
          <span className="font-medium">复检建议</span>
          <span className="text-xs text-zinc-500 ml-1">({reinspectionSuggestions.length} 条)</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4 max-h-60 overflow-y-auto">
          <ReinspectionSuggestions />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
          <GitBranch size={16} className="text-purple-400" />
          <span className="font-medium">双向追溯</span>
          <span className="text-xs text-zinc-500 ml-1">报警→结果 | 结果→传感器序列</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
          <TraceLinkView />
        </div>
      </div>
    </div>
  )
}
