import { useState } from 'react'
import { useAppStore } from '@/store'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Layers,
  MapPin,
  ShieldAlert,
  User,
  XCircle,
  ChevronRight,
  AlertOctagon,
} from 'lucide-react'

export default function AnalysisHome() {
  const { cadLayers, judgments, withdrawals, getJudgmentWithdrawals, getImpactedJudgments } = useAppStore()
  const [expandedWd, setExpandedWd] = useState<string | null>('wd-1')
  const [expandedJudgment, setExpandedJudgment] = useState<string | null>('judgment-v4')

  const latestJudgment = judgments[judgments.length - 1]

  return (
    <div className="p-6 space-y-6 min-w-[1200px]">
      {/* 页面标题 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-engineer-800">医院物流机器人剖面讲解 · 分析主页</h1>
          <p className="text-sm text-engineer-500 mt-1">
            追踪撤回记录如何影响结论 · 后补材料不得静默覆盖早先判断
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="tag tag-info">
            <Layers className="w-3 h-3 mr-1" />
            CAD图层 {cadLayers.length}
          </span>
          <span className="tag tag-warn">
            <AlertTriangle className="w-3 h-3 mr-1" />
            撤回 {withdrawals.length} 次
          </span>
        </div>
      </header>

      {/* 当前结论面板 */}
      <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
        <div className="px-5 py-3 bg-engineer-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium text-sm">当前结论（{latestJudgment.version}）</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="tag tag-info" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              来自 {latestJudgment.version} 判断
            </span>
            {latestJudgment.isManualOverride && (
              <span className="tag tag-warn" style={{ background: 'rgba(217,119,6,0.2)', borderColor: 'rgba(217,119,6,0.4)', color: '#fbbf24' }}>
                <ShieldAlert className="w-3 h-3 mr-1" />
                含人工改判
              </span>
            )}
          </div>
        </div>
        <div className="p-5">
          <p className="text-lg text-engineer-800 leading-relaxed">{latestJudgment.content}</p>
          <div className="mt-4 flex items-center gap-6 text-xs text-engineer-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {latestJudgment.madeAt}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {latestJudgment.madeBy}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              基于图层 {latestJudgment.basedOnLayers.length} 个
            </span>
          </div>
          {latestJudgment.isManualOverride && (
            <div className="mt-4 p-3 bg-orange-50 border-l-4 border-warn-500 rounded-r">
              <div className="text-xs font-medium text-warn-600 mb-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                人工改判说明（{latestJudgment.overriddenBy}）
              </div>
              <p className="text-sm text-engineer-700">{latestJudgment.overrideReason}</p>
            </div>
          )}
        </div>
      </section>

      {/* 撤回影响链 */}
      <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-engineer-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-warn-500" />
            <span className="font-medium text-sm text-engineer-800">撤回记录 · 影响链</span>
          </div>
          <span className="text-xs text-engineer-500">点击节点查看撤回如何传导至当前结论</span>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="flex items-stretch gap-3 min-w-max">
            {withdrawals.map((wd) => {
              const originalJudgment = judgments.find((j) => j.id === wd.judgmentId)
              const impacts = getImpactedJudgments(wd.id)
              const isExpanded = expandedWd === wd.id

              return (
                <div key={wd.id} className="flex items-stretch gap-3">
                  {/* 撤回卡片 */}
                  <button
                    onClick={() => setExpandedWd(isExpanded ? null : wd.id)}
                    className={`w-72 text-left rounded border-2 transition-all card-shadow-hover ${
                      isExpanded ? 'border-warn-500 bg-orange-50/50' : 'border-engineer-200 bg-white hover:border-warn-300'
                    }`}
                  >
                    <div className="p-3 border-b border-engineer-100 flex items-center justify-between">
                      <span className="tag tag-warn">
                        <XCircle className="w-3 h-3 mr-1" />
                        撤回记录
                      </span>
                      <span className="text-[11px] font-mono text-engineer-500">{wd.withdrawnAt}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="text-xs text-engineer-500">原判断 {originalJudgment?.version}</div>
                      <div className="text-sm text-engineer-800 line-through decoration-warn-500/60">
                        {originalJudgment?.content}
                      </div>
                      <div className="pt-2 border-t border-engineer-100">
                        <div className="text-xs font-medium text-warn-600 mb-1">撤回原因</div>
                        <p className="text-xs text-engineer-700 leading-relaxed">{wd.reason}</p>
                      </div>
                      <div className="text-[11px] text-engineer-500 flex items-center gap-1 pt-1">
                        <User className="w-3 h-3" />
                        {wd.withdrawnBy}
                      </div>
                    </div>
                  </button>

                  {/* 因果箭头 */}
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="flex items-center">
                      <div className="w-6 h-0.5 bg-warn-400" />
                      <ChevronRight className="w-4 h-4 text-warn-500 -ml-1" />
                    </div>
                    <div className="text-[10px] font-mono text-warn-600 mt-1">影响</div>
                  </div>

                  {/* 受影响的判断 */}
                  <div className="flex flex-col gap-3 justify-center">
                    {impacts.map((j) => {
                      const jWd = getJudgmentWithdrawals(j.id)
                      const isJudgmentExpanded = expandedJudgment === j.id
                      return (
                        <button
                          key={j.id}
                          onClick={() => setExpandedJudgment(isJudgmentExpanded ? null : j.id)}
                          className={`w-72 text-left rounded border transition-all card-shadow-hover ${
                            j.isWithdrawn
                              ? 'border-engineer-200 bg-engineer-50'
                              : 'border-engineer-300 bg-white hover:border-engineer-500'
                          }`}
                        >
                          <div className="p-3 border-b border-engineer-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`tag ${j.isWithdrawn ? 'tag-gray' : 'tag-info'}`}>
                                判断 {j.version}
                              </span>
                              {j.isWithdrawn && (
                                <span className="tag tag-warn">已撤回</span>
                              )}
                              {!j.isWithdrawn && j.isManualOverride && (
                                <span className="tag tag-warn">人工改判</span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-engineer-500">{j.madeAt}</span>
                          </div>
                          <div className="p-3">
                            <p className={`text-sm ${j.isWithdrawn ? 'text-engineer-500 line-through' : 'text-engineer-800'}`}>
                              {j.content}
                            </p>
                            {isJudgmentExpanded && !j.isWithdrawn && j.isManualOverride && (
                              <div className="mt-3 pt-3 border-t border-engineer-100">
                                <div className="text-xs font-medium text-warn-600 mb-1">
                                  改判：{j.overriddenBy}
                                </div>
                                <p className="text-xs text-engineer-700">{j.overrideReason}</p>
                              </div>
                            )}
                            {jWd && isJudgmentExpanded && (
                              <div className="mt-3 pt-3 border-t border-engineer-100">
                                <div className="text-xs font-medium text-warn-600 mb-1">
                                  又被撤回：{jWd.withdrawnBy}
                                </div>
                                <p className="text-xs text-engineer-700">{jWd.reason}</p>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* 当前最终结论 */}
            <div className="flex flex-col items-center justify-center px-1">
              <div className="flex items-center">
                <div className="w-6 h-0.5 bg-success-500" />
                <ChevronRight className="w-4 h-4 text-success-500 -ml-1" />
              </div>
              <div className="text-[10px] font-mono text-success-600 mt-1">最终</div>
            </div>
            <div className="w-72 rounded border-2 border-success-500 bg-emerald-50/40 card-shadow">
              <div className="p-3 border-b border-success-500/20 flex items-center justify-between">
                <span className="tag tag-success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  当前结论 {latestJudgment.version}
                </span>
                <span className="text-[11px] font-mono text-engineer-500">{latestJudgment.madeAt}</span>
              </div>
              <div className="p-3">
                <p className="text-sm text-engineer-800 font-medium">{latestJudgment.content}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAD图层版本时间轴 */}
      <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-engineer-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-engineer-600" />
            <span className="font-medium text-sm text-engineer-800">CAD图层版本 · 分批导入时间轴</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-engineer-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-engineer-500" />
              原始导入
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warn-500" />
              后补材料
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              坐标系异常
            </span>
          </div>
        </div>
        <div className="p-5">
          <div className="relative">
            {/* 时间轴线 */}
            <div className="absolute top-10 left-0 right-0 h-0.5 bg-engineer-200" />

            <div className="relative grid grid-cols-4 gap-4">
              {cadLayers.map((layer, idx) => (
                <div key={layer.id} className="relative">
                  {/* 节点圆点 */}
                  <div className="flex justify-center mb-3">
                    <div
                      className={`relative w-5 h-5 rounded-full border-4 border-white z-10 ${
                        !layer.coordinateValid
                          ? 'bg-red-500'
                          : layer.isSupplement
                          ? 'bg-warn-500'
                          : 'bg-engineer-500'
                      }`}
                    >
                      {layer.conflictsWith && layer.conflictsWith.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-warn-500 rounded-full border-2 border-white flex items-center justify-center">
                          <AlertTriangle className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 卡片 */}
                  <div
                    className={`rounded border bg-white p-3 card-shadow-hover transition-all ${
                      !layer.coordinateValid
                        ? 'border-red-300'
                        : layer.isSupplement
                        ? 'border-warn-300'
                        : 'border-engineer-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-engineer-400">#{idx + 1}</span>
                        {layer.isSupplement && (
                          <span className="tag tag-warn">后补</span>
                        )}
                        {!layer.coordinateValid && (
                          <span className="tag" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            坐标系异常
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm font-medium text-engineer-800 mb-1">{layer.name}</div>
                    <div className="text-[11px] font-mono text-engineer-500 mb-2">
                      <MapPin className="w-3 h-3 inline mr-0.5" />
                      {layer.coordinateSystem}
                      <span className="mx-2">·</span>
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {layer.importedAt}
                    </div>
                    <div className="text-[11px] text-engineer-500">
                      含对象 {layer.objects.length} 个
                    </div>

                    {layer.conflictsWith && layer.conflictsWith.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-warn-200 bg-orange-50/50 -mx-3 -mb-3 px-3 py-2 rounded-b">
                        <div className="text-[11px] font-medium text-warn-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          不得静默覆盖 · 冲突提示
                        </div>
                        <p className="text-[11px] text-engineer-700">
                          此图层导入后，早先判断 <span className="font-mono">{layer.conflictsWith.join(', ')}</span> 被标记为需复核，后续判断已自动关联此变更。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
