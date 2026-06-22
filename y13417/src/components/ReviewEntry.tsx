import { useStore } from '../store'
import { FileCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function ReviewEntry() {
  const { problems, selectedProblemId, reviewRecords, addReview } = useStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [conclusion, setConclusion] = useState('')
  const [diffExplanation, setDiffExplanation] = useState('')

  const problem = problems.find(p => p.id === selectedProblemId)
  if (!problem) return null

  const prevReviews = reviewRecords.filter(r => r.problemId === selectedProblemId)
  const lastReview = prevReviews[prevReviews.length - 1]
  const previousConclusion = lastReview?.currentConclusion ?? `提交答案：{${problem.submittedAnswer.join(', ')}}`

  const handleSubmit = () => {
    if (!conclusion.trim()) return
    addReview(problem.id, conclusion.trim(), diffExplanation.trim())
    setConclusion('')
    setDiffExplanation('')
    setIsExpanded(false)
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/80 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-300">复核结论</span>
        </div>
        <div className="flex items-center gap-2">
          {lastReview && (
            <span className="text-[10px] text-zinc-500">
              上次：{lastReview.currentConclusion}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-2.5 bg-zinc-900/50">
          <div>
            <div className="text-[10px] text-zinc-500 mb-1">上次结论</div>
            <div className="text-[11px] text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50">
              {previousConclusion}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 mb-1">当前结论</div>
            <input
              type="text"
              value={conclusion}
              onChange={e => setConclusion(e.target.value)}
              placeholder="输入当前复核结论..."
              className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 mb-1">
              差异解释 <span className="text-zinc-600">（为什么这次和上次不一样）</span>
            </div>
            <textarea
              value={diffExplanation}
              onChange={e => setDiffExplanation(e.target.value)}
              placeholder="说明为什么这次结论与上次不同..."
              rows={2}
              className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!conclusion.trim()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded text-[11px] font-medium transition-colors"
            >
              提交复核
            </button>
          </div>
        </div>
      )}

      {prevReviews.length > 0 && !isExpanded && (
        <div className="px-3 py-2 border-t border-zinc-800/50">
          <div className="space-y-1">
            {prevReviews.slice().reverse().map(review => (
              <div key={review.id} className="bg-zinc-800/30 rounded px-2 py-1.5">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-zinc-500 line-through">{review.previousConclusion}</span>
                  <span className="text-amber-400">→</span>
                  <span className="text-zinc-300">{review.currentConclusion}</span>
                </div>
                {review.diffExplanation && (
                  <div className="text-[10px] text-amber-400/70 mt-0.5 italic">
                    {review.diffExplanation}
                  </div>
                )}
                <div className="text-[9px] text-zinc-600 mt-0.5">
                  {new Date(review.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
