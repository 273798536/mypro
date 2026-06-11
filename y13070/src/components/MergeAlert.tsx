import { useReviewStore } from '@/store'
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react'

export default function MergeAlert() {
  const { mergeIssues, updateMergeIssueStatus } = useReviewStore()
  const openIssues = mergeIssues.filter((mi) => mi.status === 'open')

  if (openIssues.length === 0) return null

  return (
    <div className="space-y-2">
      {openIssues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-start gap-3 bg-[#1e2d3d] border-l-4 border-orange-500 rounded-r px-4 py-3"
        >
          <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-200">{issue.description}</div>
            <div className="mt-1 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
              {issue.actionStep}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
              onClick={() => updateMergeIssueStatus(issue.id, 'processing')}
            >
              <Wrench size={12} />
              处理
            </button>
            <button
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
              onClick={() => updateMergeIssueStatus(issue.id, 'resolved')}
            >
              <CheckCircle size={12} />
              已解决
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
