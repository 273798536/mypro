import { useEffect, useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/useStore'

const impactStyle: Record<string, string> = {
  high: 'bg-rose-500/20 text-rose-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-blue-500/20 text-blue-400',
}

export default function IndexSuggestions() {
  const { indexSuggestions, fetchIndexSuggestions } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchIndexSuggestions()
  }, [fetchIndexSuggestions])

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">索引建议</h1>

      <div className="space-y-3">
        {indexSuggestions.map((sug) => {
          const isExpanded = expandedId === sug.id
          return (
            <div key={sug.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div
                className="px-5 py-4 flex items-center cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => toggle(sug.id)}
              >
                <Lightbulb className="w-4 h-4 text-amber-500 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{sug.table_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${impactStyle[sug.impact] ?? 'bg-slate-600/30 text-slate-400'}`}>
                      {sug.impact}
                    </span>
                  </div>
                  <code className="font-mono text-xs text-slate-400 mt-1 block line-clamp-1">{sug.suggested_index}</code>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
                )}
              </div>

              {isExpanded && (
                <div className="px-5 py-4 border-t border-slate-700 bg-slate-900/50 space-y-3">
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">技术原因</h4>
                    <p className="text-sm text-slate-300">{sug.reason}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">通俗解释</h4>
                    <p className="text-sm text-slate-300">{sug.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {indexSuggestions.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-10 text-center border border-slate-700">
            <Lightbulb className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无索引建议</p>
          </div>
        )}
      </div>
    </div>
  )
}
