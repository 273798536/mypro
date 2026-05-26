import { AlertTriangle, X, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { useBondStore } from '../../stores/bondStore'
import { useUIStore } from '../../stores/uiStore'
import { useScenarioStore } from '../../stores/scenarioStore'
import { getAnomalyTypeLabel } from '../../utils/dataValidator'
import { useState } from 'react'

export function AnomalyBar() {
  const anomalies = useBondStore((state) => state.anomalies)
  const cashFlows = useBondStore((state) => state.cashFlows)
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)
  const anomalyBarVisible = useUIStore((state) => state.anomalyBarVisible)
  const toggleAnomalyBar = useUIStore((state) => state.toggleAnomalyBar)
  const setSelectedBar = useUIStore((state) => state.setSelectedBar)

  const [showAll, setShowAll] = useState(false)

  const filteredAnomalies = activeScenarioId
    ? anomalies.filter((a) => {
        const flow = cashFlows.find((cf) => cf.id === a.cashFlowId)
        return flow?.scenarioId === activeScenarioId
      })
    : anomalies

  const displayedAnomalies = showAll ? filteredAnomalies : filteredAnomalies.slice(0, 5)

  if (!anomalyBarVisible) {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#0d1117]/90 border-t border-[#21262d]
        flex items-center px-4 gap-2 cursor-pointer hover:bg-[#161b22] transition-colors"
        onClick={toggleAnomalyBar}
      >
        <AlertTriangle size={14} className="text-[#f59e0b]" />
        <span className="text-xs text-[#8b949e]">
          异常检测: {filteredAnomalies.length} 条记录需要关注
        </span>
        <ChevronUp size={14} className="ml-auto text-[#6e7681]" />
      </div>
    )
  }

  const handleLocate = (cashFlowId?: string) => {
    if (!cashFlowId) return
    const canvas = document.querySelector('canvas')
    const rect = canvas?.getBoundingClientRect()
    setSelectedBar({
      cashFlowId,
      screenPosition: {
        x: rect ? rect.width / 2 : 0,
        y: rect ? rect.height / 2 : 0,
      },
    })
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-48 bg-[#0d1117]/95 border-t border-[#21262d]
      flex flex-col backdrop-blur-sm">
      <div className="flex items-center px-4 py-2 border-b border-[#21262d] cursor-pointer
        hover:bg-[#161b22]/50 transition-colors"
        onClick={toggleAnomalyBar}
      >
        <AlertTriangle size={14} className="text-[#f59e0b]" />
        <span className="text-xs text-[#c9d1d9] ml-2 font-medium">
          异常检测
        </span>
        <span className="text-xs text-[#6e7681] ml-1">
          ({filteredAnomalies.length} 条)
        </span>
        <span className="text-[10px] text-[#6e7681] ml-2">
          {filteredAnomalies.filter((a) => a.severity === 'critical').length > 0 && (
            <span className="text-[#f85149]">
              {filteredAnomalies.filter((a) => a.severity === 'critical').length} 严重
            </span>
          )}
          {filteredAnomalies.filter((a) => a.severity === 'error').length > 0 && (
            <span className="text-[#f59e0b] ml-2">
              {filteredAnomalies.filter((a) => a.severity === 'error').length} 错误
            </span>
          )}
          {filteredAnomalies.filter((a) => a.severity === 'warning').length > 0 && (
            <span className="text-[#f97316] ml-2">
              {filteredAnomalies.filter((a) => a.severity === 'warning').length} 警告
            </span>
          )}
        </span>
        <X
          size={14}
          className="ml-auto text-[#6e7681] hover:text-[#c9d1d9]"
          onClick={(e) => {
            e.stopPropagation()
            toggleAnomalyBar()
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAnomalies.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[#6e7681] py-4">
            ✓ 当前情景下未检测到数据异常
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {displayedAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs
                  ${anomaly.severity === 'critical'
                    ? 'bg-[#f85149]/10 border-l-2 border-[#f85149]'
                    : anomaly.severity === 'error'
                    ? 'bg-[#f59e0b]/10 border-l-2 border-[#f59e0b]'
                    : 'bg-[#f97316]/10 border-l-2 border-[#f97316]'
                  }
                  hover:bg-[#21262d] transition-colors cursor-pointer`}
                onClick={() => handleLocate(anomaly.cashFlowId)}
              >
                <AlertTriangle
                  size={12}
                  className={
                    anomaly.severity === 'critical'
                      ? 'text-[#f85149]'
                      : anomaly.severity === 'error'
                      ? 'text-[#f59e0b]'
                      : 'text-[#f97316]'
                  }
                />
                <span className={`font-medium ${
                  anomaly.severity === 'critical'
                    ? 'text-[#f85149]'
                    : anomaly.severity === 'error'
                    ? 'text-[#f59e0b]'
                    : 'text-[#f97316]'
                }`}>
                  {getAnomalyTypeLabel(anomaly.type)}
                </span>
                <span className="text-[#8b949e] flex-1 truncate">
                  {anomaly.description}
                </span>
                <span className="text-[10px] text-[#6e7681] font-mono flex-shrink-0">
                  {anomaly.source}:{anomaly.sourceLine}
                </span>
                <button
                  className="flex-shrink-0 p-1 rounded hover:bg-[#30363d] transition-colors"
                  title="在3D场景中定位"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLocate(anomaly.cashFlowId)
                  }}
                >
                  <MapPin size={12} className="text-[#58a6ff]" />
                </button>
              </div>
            ))}

            {filteredAnomalies.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-1.5 text-xs text-[#58a6ff] hover:text-[#79c0ff]
                  flex items-center justify-center gap-1"
              >
                {showAll ? (
                  <>
                    <ChevronUp size={12} />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} />
                    显示全部 {filteredAnomalies.length} 条
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}