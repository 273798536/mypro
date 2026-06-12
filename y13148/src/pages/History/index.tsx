import { Clock, RotateCcw, ArrowLeft, BarChart3, Target, Activity, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useFilterStore } from '@/store/useFilterStore'
import { formatDateTime, formatRelativeTime, formatNumber } from '@/utils/format'
import { sourceLabels } from '@/data/unitConfigs'

export default function History() {
  const { history, clearHistory, restoreFromHistory } = useHistoryStore()
  const { params, setUnit, setConfidenceLevel, setSimulationCount, setSourceTypes } = useFilterStore()

  const handleRestore = (id: string) => {
    const restored = restoreFromHistory(id)
    if (restored) {
      setUnit(restored.unit)
      setConfidenceLevel(restored.confidenceLevel)
      setSimulationCount(restored.simulationCount)
      setSourceTypes(restored.sourceTypes as any)
    }
  }

  const isCurrentParams = (h: any) => {
    return (
      h.filterParams.unit === params.unit &&
      h.filterParams.confidenceLevel === params.confidenceLevel &&
      h.filterParams.simulationCount === params.simulationCount &&
      h.filterParams.sourceTypes.length === params.sourceTypes.length &&
      h.filterParams.sourceTypes.every((s: any) => params.sourceTypes.includes(s))
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">筛选历史时间线</h1>
          <p className="text-gray-500 mt-1 text-sm">记录所有筛选口径变更，可一键回溯复现</p>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" icon={<Trash2 size={16} />} onClick={clearHistory}>
            清空历史
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="历史记录"
            subtitle={`共 ${history.length} 条历史记录，最新 50 条`}
            icon={<Clock size={20} />}
          >
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Clock size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无筛选历史记录</p>
                <p className="text-sm mt-1">在图表页进行模拟操作后会自动保存</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100" />

                <div className="space-y-6">
                  {history.map((item, index) => (
                    <div
                      key={item.id}
                      className={`relative pl-14 ${isCurrentParams(item) ? '' : ''}`}
                    >
                      <div
                        className={`absolute left-4 top-1 w-5 h-5 rounded-full border-4 ${
                          isCurrentParams(item)
                            ? 'bg-green-500 border-green-100 animate-pulse'
                            : 'bg-white border-primary-300'
                        }`}
                      />

                      <div
                        className={`p-4 rounded-lg border transition-all ${
                          isCurrentParams(item)
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-gray-100 bg-white hover:border-primary-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                模拟参数 #{history.length - index}
                              </span>
                              {isCurrentParams(item) && (
                                <Badge variant="success" size="sm">当前</Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {formatDateTime(item.timestamp)} · {formatRelativeTime(item.timestamp)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isCurrentParams(item) ? 'ghost' : 'outline'}
                            icon={<RotateCcw size={14} />}
                            onClick={() => handleRestore(item.id)}
                            disabled={isCurrentParams(item)}
                          >
                            回溯
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">单位：</span>
                            <span className="text-gray-700 font-mono">{item.filterParams.unit}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">置信水平：</span>
                            <span className="text-gray-700 font-mono">
                              {(item.filterParams.confidenceLevel * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">模拟次数：</span>
                            <span className="text-gray-700 font-mono">
                              {item.filterParams.simulationCount.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">记录数量：</span>
                            <span className="text-gray-700 font-mono">{item.resultSnapshot.recordCount}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xs text-gray-400">均值</div>
                            <div className="text-sm font-mono text-gray-700 mt-0.5">
                              {formatNumber(item.resultSnapshot.mean)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">标准差</div>
                            <div className="text-sm font-mono text-gray-700 mt-0.5">
                              {formatNumber(item.resultSnapshot.stdDev)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">置信区间</div>
                            <div className="text-xs font-mono text-gray-700 mt-0.5">
                              [{formatNumber(item.resultSnapshot.confidenceInterval[0])}, {formatNumber(item.resultSnapshot.confidenceInterval[1])}]
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="当前参数" icon={<Target size={20} />}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">显示单位</span>
                <span className="font-mono text-gray-700">{params.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">置信水平</span>
                <span className="font-mono text-gray-700">
                  {(params.confidenceLevel * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">模拟次数</span>
                <span className="font-mono text-gray-700">
                  {params.simulationCount.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="text-gray-500 mb-2">数据来源</div>
                <div className="flex flex-wrap gap-1.5">
                  {params.sourceTypes.map((src) => (
                    <Badge key={src} size="sm" variant="default">
                      {sourceLabels[src]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="使用说明" icon={<ArrowLeft size={20} />}>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-primary-500">1.</span>
                <span>每次运行模拟会自动保存参数快照</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">2.</span>
                <span>点击「回溯」可恢复到历史参数设置</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">3.</span>
                <span>保留最近 50 条历史记录</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">4.</span>
                <span>绿色标记表示当前正在使用的参数</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
