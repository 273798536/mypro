import { useState } from 'react'
import type { NodeIntermediateValues, BoundaryWarning } from '@/types'
import { ChevronDown, ChevronRight, AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react'

interface NodeDetailAccordionProps {
  intermediates: NodeIntermediateValues[]
  boundaryWarnings: BoundaryWarning[]
  cutVertices: string[]
}

export default function NodeDetailAccordion({
  intermediates, boundaryWarnings, cutVertices,
}: NodeDetailAccordionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(intermediates.map(i => i.nodeId)))
  const collapseAll = () => setExpanded(new Set())

  const warningsMap = new Map<string, BoundaryWarning>()
  boundaryWarnings.forEach(w => warningsMap.set(w.nodeId, w))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">节点中间值 ({intermediates.length})</span>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">全部展开</button>
          <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">全部折叠</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {intermediates.map(im => {
          const isOpen = expanded.has(im.nodeId)
          const isCut = cutVertices.includes(im.nodeId)
          const warning = warningsMap.get(im.nodeId)

          return (
            <div key={im.nodeId} className={`border rounded ${isCut ? 'border-red-800/60' : 'border-slate-700/40'}`}>
              <button
                onClick={() => toggle(im.nodeId)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
              >
                {isOpen ? <ChevronDown size={12} className="text-slate-500 shrink-0" /> : <ChevronRight size={12} className="text-slate-500 shrink-0" />}
                <span className={`text-xs font-mono ${isCut ? 'text-red-400' : 'text-blue-400'}`}>{im.nodeId}</span>
                {isCut ? (
                  <ShieldX size={12} className="text-red-400 shrink-0" />
                ) : (
                  <ShieldCheck size={12} className="text-green-400 shrink-0" />
                )}
                <span className="text-[10px] text-slate-500 ml-auto">
                  dfn={im.dfn} low={im.low}
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-2 space-y-2 border-t border-slate-700/30">
                  <div className="pt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <span className="text-[10px] text-slate-500">DFN 序号</span>
                      <div className="text-xs font-mono text-blue-300">{im.dfn}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">LOW 值</span>
                      <div className="text-xs font-mono text-amber-300">{im.low}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">父节点</span>
                      <div className="text-xs font-mono text-slate-300">{im.parent ?? '(根)'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">子节点数</span>
                      <div className="text-xs font-mono text-slate-300">{im.childCount}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">访问顺序</span>
                      <div className="text-xs font-mono text-slate-300">#{im.visitOrder}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">是否根节点</span>
                      <div className="text-xs font-mono text-slate-300">{im.isRoot ? '是' : '否'}</div>
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
                    <div className="text-[10px] text-slate-500 mb-1">割点判断追踪</div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-slate-500 shrink-0 w-12">条件</span>
                        <span className="text-xs font-mono text-slate-300">{im.cutVertexJudgment.condition}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-slate-500 shrink-0 w-12">实际值</span>
                        <span className="text-xs font-mono text-amber-300">{im.cutVertexJudgment.actualValue}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-slate-500 shrink-0 w-12">阈值</span>
                        <span className="text-xs font-mono text-blue-300">{im.cutVertexJudgment.threshold}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-slate-500 shrink-0 w-12">结论</span>
                        <span className={`text-xs font-mono ${im.cutVertexJudgment.conclusion === 'is_cut' ? 'text-red-400' : 'text-green-400'}`}>
                          {im.cutVertexJudgment.conclusion === 'is_cut' ? '✓ 是割点' : '✗ 非割点'}
                        </span>
                      </div>
                      {im.cutVertexJudgment.boundaryNote && (
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-slate-500 shrink-0 w-12">说明</span>
                          <span className="text-xs text-slate-400">{im.cutVertexJudgment.boundaryNote}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {warning && (
                    <div className="mt-1.5 pt-1.5 border-t border-amber-800/30 bg-amber-950/20 -mx-3 px-3 pb-1 rounded-b">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs text-amber-300">{warning.humanMessage}</div>
                          {warning.technicalDetail && (
                            <div className="text-[10px] text-amber-500/70 mt-0.5 font-mono">{warning.technicalDetail}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
