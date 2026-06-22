import { useStore } from '../store'
import { AlertTriangle, CheckCircle, Clock, Search, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { ProblemStatus } from '../types'

const statusConfig: Record<ProblemStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '待复核', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  reviewed: { label: '已复核', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  anomaly: { label: '异常', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
  boundary: { label: '边界', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle },
}

export default function ProblemList() {
  const { problems, selectedProblemId, selectProblem, anomalies } = useStore()
  const [search, setSearch] = useState('')

  const filtered = problems.filter(p =>
    p.title.includes(search) || p.description.includes(search)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold text-amber-400 tracking-wider uppercase mb-3">题目清单</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="搜索题目..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-md text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1.5">
        {filtered.map(p => {
          const config = statusConfig[p.status]
          const Icon = config.icon
          const anomalyCount = anomalies.filter(a => a.problemId === p.id && a.status === 'pending').length
          const isSelected = p.id === selectedProblemId

          return (
            <button
              key={p.id}
              onClick={() => selectProblem(p.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-200 truncate">{p.title}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{p.description}</div>
                </div>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color} shrink-0`}>
                  <Icon className="w-2.5 h-2.5" />
                  {config.label}
                </span>
              </div>
              {anomalyCount > 0 && (
                <div className="mt-1.5 text-[10px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {anomalyCount} 条待处理异常
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-zinc-800">
        <button
          onClick={() => useStore.getState().resetToSeed()}
          className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-amber-400 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          重置为样例数据
        </button>
      </div>
    </div>
  )
}
