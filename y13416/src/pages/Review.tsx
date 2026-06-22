import { useGraphStore } from '@/stores/graph'
import NodeDetailAccordion from '@/components/NodeDetailAccordion'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export default function Review() {
  const { snapshots, nodes, edges } = useGraphStore()

  const latestSnapshot = snapshots[snapshots.length - 1]

  if (!latestSnapshot) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-600">
        请先在"计算沙盘"中运行一次计算
      </div>
    )
  }

  const { intermediates, cutVertices, boundaryWarnings, steps, paramVersion } = latestSnapshot

  const checkCutSteps = steps.filter(s => s.stepType === 'check_cut')

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium text-slate-200">复核详情</h2>
            <div className="text-[10px] text-slate-500 mt-0.5">
              参数版本 {paramVersion.version} · {new Date(latestSnapshot.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-blue-400">{nodes.length} 节点</span>
            <span className="text-slate-500">{edges.length} 边</span>
            <span className="text-red-400">{cutVertices.length} 割点</span>
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <h3 className="text-xs font-medium text-slate-300 mb-2">割点判定汇总</h3>
          {cutVertices.length === 0 ? (
            <div className="text-xs text-slate-500">本图无割点</div>
          ) : (
            <div className="space-y-1.5">
              {cutVertices.map(cv => {
                const im = intermediates.find(i => i.nodeId === cv)
                if (!im) return null
                return (
                  <div key={cv} className="flex items-start gap-2 p-2 bg-red-950/20 rounded border border-red-800/30">
                    <span className="text-xs font-mono text-red-400 shrink-0">{cv}</span>
                    <ArrowRight size={12} className="text-slate-600 shrink-0 mt-0.5" />
                    <div className="text-[10px] space-y-0.5">
                      <div className="text-slate-400">条件: {im.cutVertexJudgment.condition}</div>
                      <div className="text-amber-300">实际值: {im.cutVertexJudgment.actualValue}</div>
                      <div className="text-blue-300">阈值: {im.cutVertexJudgment.threshold}</div>
                      {im.cutVertexJudgment.boundaryNote && (
                        <div className="text-amber-400/80">{im.cutVertexJudgment.boundaryNote}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {checkCutSteps.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h3 className="text-xs font-medium text-slate-300 mb-2">阈值判断链路</h3>
            <div className="space-y-1.5">
              {checkCutSteps.map((step, idx) => (
                <div key={idx} className="p-2 rounded border border-slate-700/30 bg-slate-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-300">{step.nodeId}</span>
                    <span className={`text-[10px] ${step.finalResult.includes('是割点') ? 'text-red-400' : 'text-green-400'}`}>
                      {step.finalResult}
                    </span>
                  </div>
                  <div className="text-[10px] space-y-0.5 font-mono">
                    <div className="text-slate-500">{step.formula}</div>
                    <div className="text-amber-300/70">代入: {step.substitutedValues}</div>
                    <div className="text-blue-300/70">中间: {step.intermediateResult}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0">
          <NodeDetailAccordion
            intermediates={intermediates}
            boundaryWarnings={boundaryWarnings}
            cutVertices={cutVertices}
          />
        </div>
      </div>

      <div className="w-72 flex flex-col border-l border-slate-700/40 pl-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-amber-400" />
          <h2 className="text-sm font-medium text-slate-200">边界提示</h2>
        </div>
        {boundaryWarnings.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
            无边界情况
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {boundaryWarnings.map((w, idx) => (
              <div key={idx} className="p-3 bg-amber-950/20 rounded-lg border border-amber-800/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-amber-300 leading-relaxed">{w.humanMessage}</div>
                    {w.technicalDetail && (
                      <div className="text-[10px] text-amber-500/60 mt-1 font-mono">{w.technicalDetail}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700/40">
          <h3 className="text-xs font-medium text-slate-300 mb-2">参数快照</h3>
          <div className="space-y-1 text-[10px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">版本</span>
              <span className="text-cyan-300">{paramVersion.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">根节点</span>
              <span className="text-slate-300">{paramVersion.rootId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">阈值偏移</span>
              <span className="text-slate-300">{paramVersion.thresholdOffset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">单位换算</span>
              <span className="text-slate-300">×{paramVersion.unitScale}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
