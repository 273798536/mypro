import { useAppStore, useFilteredApiReturns } from "@/store/useAppStore"
import {
  STATUS_COLORS,
  SENSOR_TYPE_LABELS,
} from "@/data/mockData"
import {
  ChevronDown,
  ChevronUp,
  Server,
  Tag,
  AlertTriangle,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react"

export default function ApiReturnPanel() {
  const {
    apiPanelExpanded,
    toggleApiPanel,
    selectRecord,
    records,
    filterState,
    resetAll,
    apiReturns: allApiReturns,
  } = useAppStore()
  const filteredReturns = useFilteredApiReturns()
  const showAll = filteredReturns.length === 0 && allApiReturns.length > 0
  const visibleReturns = showAll ? allApiReturns : filteredReturns

  const grouped = {
    processed: visibleReturns.filter((a) => a.status === "processed"),
    pending_material: visibleReturns.filter((a) => a.status === "pending_material"),
    manual_judgment: visibleReturns.filter((a) => a.status === "manual_judgment"),
  }

  const categories = [
    {
      key: "processed" as const,
      label: "已处理",
      color: STATUS_COLORS.processed,
      icon: "✓",
    },
    {
      key: "pending_material" as const,
      label: "待补材料",
      color: STATUS_COLORS.pending_material,
      icon: "⏳",
    },
    {
      key: "manual_judgment" as const,
      label: "人工改判",
      color: STATUS_COLORS.manual_judgment,
      icon: "✋",
    },
  ]

  const activeFilterCount =
    filterState.sensorTypes.length < 4 || filterState.statuses.length < 3 ? 1 : 0

  return (
    <div className="bg-[#0f1724] border-t border-[#1e2d3d]">
      <button
        onClick={toggleApiPanel}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-[#1a2332] transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Server size={16} className="text-[#00e5a0]" />
          <span className="text-sm font-semibold text-white">接口返回</span>
          {showAll ? (
            <span className="text-xs text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2 py-0.5 rounded flex items-center gap-1">
              <EyeOff size={10} />
              当前筛选无匹配 · 显示全部 {allApiReturns.length} 条
            </span>
          ) : (
            <span className="text-xs text-[#64748b]">
              {filteredReturns.length} / {allApiReturns.length} 条
            </span>
          )}
          {activeFilterCount > 0 && !showAll && (
            <span className="text-xs text-[#00e5a0] bg-[#00e5a0]/10 border border-[#00e5a0]/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Filter size={10} />
              已按当前筛选过滤
            </span>
          )}
          {showAll && (
            <span className="text-xs text-[#64748b] flex items-center gap-1">
              <Eye size={10} />
              未受筛选影响
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm("确认重置所有状态、备注和筛选条件到初始值？")) {
                resetAll()
              }
            }}
            className="flex items-center gap-1 text-[10px] text-[#64748b] hover:text-[#f59e0b] transition-colors px-2 py-1 rounded hover:bg-[#f59e0b]/5"
            title="重置所有数据到初始状态"
          >
            <RefreshCw size={10} />
            重置全部
          </button>
          {apiPanelExpanded ? (
            <ChevronDown size={16} className="text-[#64748b]" />
          ) : (
            <ChevronUp size={16} className="text-[#64748b]" />
          )}
        </div>
      </button>

      {apiPanelExpanded && (
        <div className="px-6 pb-4 grid grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{cat.icon}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </span>
                <span className="text-xs text-[#475569]">
                  {grouped[cat.key].length}
                </span>
                {cat.key === "pending_material" &&
                  grouped[cat.key].length > 0 &&
                  activeFilterCount > 0 && (
                    <span className="text-[10px] text-[#f59e0b] animate-pulse">
                      ⚠ 有缺段需处理
                    </span>
                  )}
                {cat.key === "manual_judgment" &&
                  grouped[cat.key].length > 0 &&
                  activeFilterCount > 0 && (
                    <span className="text-[10px] text-[#a855f7]">
                      ⚠ 需人工确认
                    </span>
                  )}
              </div>

              <div className="space-y-2">
                {grouped[cat.key].map((item) => {
                  const record = records.find((r) => r.id === item.recordId)
                  const matchType = record
                    ? filterState.sensorTypes.includes(record.sensorType)
                    : true
                  const matchStatus = record
                    ? filterState.statuses.includes(record.status)
                    : true
                  const notMatchingCurrent = showAll && (!matchType || !matchStatus)

                  return (
                    <div
                      key={item.recordId}
                      onClick={() => selectRecord(item.recordId)}
                      className={`rounded-lg p-3 cursor-pointer transition-all border ${
                        notMatchingCurrent
                          ? "bg-[#1a2332]/50 border-dashed border-[#2a3a4d] opacity-70 hover:opacity-100 hover:border-[#3a4a5d]"
                          : "bg-[#1a2332] border-[#1e2d3d] hover:border-[#2a3a4d]"
                      }`}
                    >
                      {notMatchingCurrent && (
                        <div className="text-[9px] text-[#64748b] flex items-center gap-1 mb-1.5">
                          <EyeOff size={8} />
                          当前筛选未命中 · 完整展示
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-white font-medium">
                          {item.sensorName}
                        </span>
                        {item.nameMismatch && (
                          <AlertTriangle
                            size={14}
                            className="text-[#f59e0b]"
                          />
                        )}
                      </div>

                      <div className="text-xs text-[#64748b] space-y-1">
                        <p className="font-mono">{item.timestamp}</p>

                        {item.nameMismatch && (
                          <p className="text-[#f59e0b]">
                            接口: {item.apiReturnName}
                          </p>
                        )}

                        {item.manualNote && (
                          <p className="text-[#94a3b8] leading-relaxed">
                            {item.manualNote}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1 mt-2 flex-wrap">
                        {item.filterSnapshot.sensorTypes
                          .filter((t) => SENSOR_TYPE_LABELS[t])
                          .map((type) => (
                            <span
                              key={type}
                              className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
                                matchType && record?.sensorType === type
                                  ? "bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/30"
                                  : "bg-[#0f1724] text-[#475569]"
                              }`}
                            >
                              <Tag size={8} />
                              {SENSOR_TYPE_LABELS[type]}
                            </span>
                          ))}
                        {!matchStatus && (
                          <span className="inline-flex items-center text-[10px] bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 px-1.5 py-0.5 rounded">
                            状态不在筛选
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {grouped[cat.key].length === 0 && (
                  <div className="text-xs text-[#475569] text-center py-6 border border-dashed border-[#1e2d3d] rounded-lg">
                    <p>暂无</p>
                    {activeFilterCount > 0 && (
                      <p className="text-[10px] mt-1 text-[#475569]">
                        当前筛选无匹配
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
