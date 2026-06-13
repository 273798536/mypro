import { useReplayStore } from '@/store/replayStore'
import { parameterLabels, type ParameterKey } from '@/types'
import { ArrowRight, CircleDot, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function CausalChainPage() {
  const { overrides, causalLinks, selectedOverrideId, selectOverride, isRecalculated, runRecalculation } =
    useReplayStore()

  const selectedLinks = causalLinks.filter((l) => l.overrideId === selectedOverrideId)
  const selectedOverride = overrides.find((o) => o.id === selectedOverrideId) || overrides[0]

  function formatTime(ts: string): string {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">改判因果链</h1>
          <p className="text-xs text-slate-400 mt-0.5">每条人工改判 → 影响的报警 → 最终结论变化</p>
        </div>
        {!isRecalculated && (
          <button
            onClick={runRecalculation}
            className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 rounded-sm text-xs flex items-center gap-1.5 transition-colors"
          >
            先复算生成因果链
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 border border-slate-700 rounded-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-200">人工改判列表</h3>
            </div>
            <div className="divide-y divide-slate-700/50">
              {overrides.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">暂无改判记录，请先在参数回放页录入</div>
              ) : (
                overrides.map((ov) => (
                  <button
                    key={ov.id}
                    onClick={() => selectOverride(ov.id)}
                    className={`w-full text-left p-3 hover:bg-slate-700/30 transition-colors ${
                      (selectedOverrideId === ov.id || (!selectedOverrideId && ov === overrides[0]))
                        ? 'bg-slate-700/50 border-l-2 border-l-sky-400'
                        : ''
                    }`}
                  >
                    <div className="text-xs text-sky-300 font-medium mb-1">{formatTime(ov.timestamp)}</div>
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-500">{parameterLabels[ov.parameterName as ParameterKey]}：</span>
                      <span className="text-slate-400 line-through">{ov.oldValue}</span>
                      <span className="mx-1 text-slate-600">→</span>
                      <span className="text-green-300 font-medium">{ov.newValue}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">来源：{ov.sourceNoteLine}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedOverride && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-sm p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">影响路径图</h3>

              <div className="flex items-start justify-center gap-2 py-6 min-h-[200px]">
                <div className="flex flex-col items-center max-w-[180px]">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2">
                    <CircleDot className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-xs font-medium text-green-300 text-center mb-1">人工改判</div>
                  <div className="text-[10px] text-slate-400 text-center leading-relaxed">
                    {formatTime(selectedOverride.timestamp)}
                    <br />
                    {parameterLabels[selectedOverride.parameterName as ParameterKey]}
                    <br />
                    <span className="text-slate-500">{selectedOverride.oldValue}</span> →{' '}
                    <span className="text-green-300">{selectedOverride.newValue}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center pt-8">
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                </div>

                <div className="flex flex-col items-center max-w-[180px]">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-xs font-medium text-amber-300 text-center mb-1">影响</div>
                  <div className="text-[10px] text-slate-400 text-center leading-relaxed">
                    {selectedLinks.length > 0 ? (
                      selectedLinks.map((l, i) => (
                        <div key={i} className="mb-1 last:mb-0">
                          {l.impactDescription}
                        </div>
                      ))
                    ) : (
                      <>
                        改变参数值
                        <br />
                        触发报警重新评估
                        <br />
                        影响最终结论
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center pt-8">
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                </div>

                <div className="flex flex-col items-center max-w-[180px]">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="text-xs font-medium text-sky-300 text-center mb-1">结论变化</div>
                  <div className="text-[10px] text-slate-400 text-center leading-relaxed space-y-2">
                    {selectedLinks.length > 0 ? (
                      selectedLinks.map((l, i) => (
                        <div key={i} className="space-y-1">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-2 py-1">
                            <span className="text-red-300 font-medium">改判前：</span>
                            <br />
                            {l.conclusionBefore}
                          </div>
                          <div className="bg-green-500/10 border border-green-500/20 rounded-sm px-2 py-1">
                            <span className="text-green-300 font-medium">改判后：</span>
                            <br />
                            {l.conclusionAfter}
                          </div>
                        </div>
                      ))
                    ) : isRecalculated ? (
                      <div className="text-slate-500">点击复算查看结论变化</div>
                    ) : (
                      <div className="text-slate-500">请先复算</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-700 pt-3">
                <div className="text-xs text-slate-400 mb-2">改判详情</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-slate-500">操作员：</span>
                    <span className="text-slate-300">{selectedOverride.operator}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">改判原因：</span>
                    <span className="text-slate-300">{selectedOverride.reason}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">来源行：</span>
                    <span className="text-slate-300">{selectedOverride.sourceNoteLine}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">对象：</span>
                    <span className="text-slate-300">{selectedOverride.sourceNoteObject}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedLinks.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-sm p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">结论对比</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-3">
                  <div className="text-xs font-medium text-red-300 mb-2">改判前结论</div>
                  {selectedLinks.map((l, i) => (
                    <div key={i} className="text-xs text-slate-300 mb-2 last:mb-0">
                      {l.conclusionBefore}
                    </div>
                  ))}
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded-sm p-3">
                  <div className="text-xs font-medium text-green-300 mb-2">改判后结论</div>
                  {selectedLinks.map((l, i) => (
                    <div key={i} className="text-xs text-slate-300 mb-2 last:mb-0">
                      {l.conclusionAfter}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-xs text-sky-300 bg-sky-500/10 rounded-sm p-2 border border-sky-500/20">
                <span className="font-medium">关键：</span>
                {selectedLinks.length > 0 && selectedLinks[0].impactDescription}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
