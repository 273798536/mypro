import type { ComputationStep } from '@/types'
import { ChevronDown, ChevronRight, Calculator } from 'lucide-react'
import { useState } from 'react'

interface ComputationLogProps {
  steps: ComputationStep[]
}

export default function ComputationLog({ steps }: ComputationLogProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const expandAll = () => setExpandedSteps(new Set(steps.map((_, i) => i)))
  const collapseAll = () => setExpandedSteps(new Set())

  const stepTypeLabel: Record<string, string> = {
    init: '初始化',
    dfs_enter: '进入节点',
    dfs_exit: '退出节点',
    update_low: '更新low值',
    check_cut: '割点判断',
  }

  const stepTypeColor: Record<string, string> = {
    init: 'text-slate-400',
    dfs_enter: 'text-blue-400',
    dfs_exit: 'text-blue-300',
    update_low: 'text-amber-400',
    check_cut: 'text-red-400',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Calculator size={14} />
          计算日志 ({steps.length} 步)
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">全部展开</button>
          <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">全部折叠</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {steps.map((step, idx) => {
          const expanded = expandedSteps.has(idx)
          return (
            <div key={idx} className="border border-slate-700/40 rounded">
              <button
                onClick={() => toggleStep(idx)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
              >
                {expanded ? <ChevronDown size={12} className="text-slate-500 shrink-0" /> : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
                <span className={`text-xs ${stepTypeColor[step.stepType] || 'text-slate-400'}`}>
                  [{stepTypeLabel[step.stepType] || step.stepType}]
                </span>
                <span className="text-xs text-slate-400 font-mono truncate">
                  {step.nodeId !== '__system__' ? step.nodeId : '系统'}
                </span>
                <span className="text-xs text-slate-500 ml-auto font-mono">{step.paramVersion}</span>
              </button>
              {expanded && (
                <div className="px-3 pb-2 space-y-1.5 border-t border-slate-700/30">
                  <div className="pt-1.5">
                    <div className="text-[10px] text-slate-500 mb-0.5">公式</div>
                    <div className="text-xs text-slate-300 font-mono bg-slate-800/60 px-2 py-1 rounded">{step.formula}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">代入值</div>
                    <div className="text-xs text-amber-300/80 font-mono bg-slate-800/60 px-2 py-1 rounded">{step.substitutedValues}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">中间结果</div>
                    <div className="text-xs text-blue-300/80 font-mono bg-slate-800/60 px-2 py-1 rounded">{step.intermediateResult}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">最终结果</div>
                    <div className={`text-xs font-mono bg-slate-800/60 px-2 py-1 rounded ${step.finalResult.includes('割点') ? 'text-red-400' : 'text-slate-300'}`}>
                      {step.finalResult}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
