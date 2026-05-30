import { FileText, Box, Wind, Link2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { getDataSource, generateProbeReadings, generateAnomalies, dataSources } from '@/data/mockData'
import type { SourceType } from '@/types'
import { cn } from '@/lib/utils'

const sourceTypeConfig: Record<SourceType, { icon: typeof FileText; label: string; color: string }> = {
  shelf_model: { icon: Box, label: '货架模型', color: 'text-purple-400' },
  fan_status: { icon: Wind, label: '风机状态', color: 'text-blue-400' },
  temp_report: { icon: FileText, label: '温场报告', color: 'text-cyan-400' },
}

export default function TraceabilityPanel() {
  const { selectedProbeId, selectedAnomalyId, currentTimeIndex, rightPanelOpen, toggleRightPanel } =
    useAppStore()

  const readings = generateProbeReadings(currentTimeIndex)
  const anomalies = generateAnomalies(currentTimeIndex)

  const selectedProbeReading = selectedProbeId
    ? readings.find((r) => r.probeId === selectedProbeId)
    : null

  const selectedAnomaly = selectedAnomalyId
    ? anomalies.find((a) => a.id === selectedAnomalyId)
    : null

  const relatedSources: string[] = []

  if (selectedProbeReading) {
    relatedSources.push(selectedProbeReading.sourceReportId)
  }

  if (selectedAnomaly) {
    relatedSources.push(selectedAnomaly.sourceId)
    if (selectedAnomaly.type === 'fan_stopped') {
      const fanSource = dataSources.find(
        (ds) => ds.type === 'fan_status' && ds.relatedIds.includes(selectedAnomaly.relatedFanId || '')
      )
      if (fanSource) relatedSources.push(fanSource.id)
    }
  }

  const uniqueSources = [...new Set(relatedSources)]
    .map((id) => getDataSource(id))
    .filter(Boolean)

  return (
    <div
      className={cn(
        'absolute right-0 top-0 bottom-0 z-20 transition-all duration-300',
        rightPanelOpen ? 'w-72' : 'w-12'
      )}
    >
      <button
        onClick={toggleRightPanel}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-slate-800/90 border border-slate-700 rounded-l-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
      >
        {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div
        className={cn(
          'h-full bg-slate-900/90 backdrop-blur-sm border-l border-slate-700 overflow-hidden transition-all duration-300',
          rightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Link2 size={14} />
            数据溯源
          </h2>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-57px)]">
          {!selectedProbeId && !selectedAnomalyId ? (
            <div className="text-center py-8">
              <div className="text-slate-500 text-sm">点击探头或异常事件</div>
              <div className="text-slate-600 text-xs mt-1">查看数据来源</div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedProbeReading && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-2">当前选中探头</div>
                  <div className="text-sm font-medium text-slate-200">{selectedProbeReading.probeId}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {selectedProbeReading.status === 'offline' ? (
                      <span className="text-red-400">离线</span>
                    ) : (
                      <span>温度: {selectedProbeReading.temperature.toFixed(1)}°C</span>
                    )}
                  </div>
                </div>
              )}

              {selectedAnomaly && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3">
                  <div className="text-xs text-red-400 mb-2">关联异常</div>
                  <div className="text-sm font-medium text-red-200">
                    {selectedAnomaly.type === 'probe_offline' && '探头离线'}
                    {selectedAnomaly.type === 'fan_stopped' && '风机停转'}
                    {selectedAnomaly.type === 'product_occlusion' && '货品遮挡预警'}
                  </div>
                  <div className="text-xs text-red-300/70 mt-1">{selectedAnomaly.description}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-slate-500 mb-3">数据来源 ({uniqueSources.length})</div>
                <div className="space-y-2">
                  {uniqueSources.map((source) => {
                    if (!source) return null
                    const config = sourceTypeConfig[source.type]
                    const Icon = config.icon
                    return (
                      <div
                        key={source.id}
                        className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('mt-0.5', config.color)}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200 truncate">
                              {source.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{source.id}</div>
                            <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {source.description}
                            </div>
                            <div className="text-xs text-slate-600 mt-2">
                              {new Date(source.timestamp).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {uniqueSources.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-sm">
                  暂无溯源数据
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
