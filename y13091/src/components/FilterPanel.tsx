import { useAppStore } from "@/store/useAppStore"
import {
  SENSOR_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  DEFAULT_FILTER,
} from "@/data/mockData"
import { Filter, RotateCcw, X } from "lucide-react"

export default function FilterPanel() {
  const { filterState, setFilterState } = useAppStore()

  const toggleType = (type: string) => {
    const types = filterState.sensorTypes.includes(type)
      ? filterState.sensorTypes.filter((t) => t !== type)
      : [...filterState.sensorTypes, type]
    setFilterState({ ...filterState, sensorTypes: types })
  }

  const toggleStatus = (status: string) => {
    const statuses = filterState.statuses.includes(status)
      ? filterState.statuses.filter((s) => s !== status)
      : [...filterState.statuses, status]
    setFilterState({ ...filterState, statuses })
  }

  const resetFilter = () => {
    setFilterState({ ...DEFAULT_FILTER })
  }

  const activeCount =
    (4 - filterState.sensorTypes.length) +
    (3 - filterState.statuses.length)

  return (
    <div className="w-72 flex-shrink-0 bg-[#0f1724] border-r border-[#1e2d3d] flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-[#1e2d3d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#00e5a0]" />
            <span className="text-sm font-semibold text-white">筛选条件</span>
            {activeCount > 0 && (
              <span className="bg-[#00e5a0] text-[#0f1724] text-xs px-1.5 py-0.5 rounded-full font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={resetFilter}
            className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#00e5a0] transition-colors"
            title="重置筛选条件"
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-[#1e2d3d]">
        <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          传感器类型
        </h3>
        <div className="space-y-2">
          {Object.entries(SENSOR_TYPE_LABELS).map(([key, label]) => {
            const active = filterState.sensorTypes.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
                  active
                    ? "bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/30"
                    : "bg-[#1a2332] text-[#64748b] border border-transparent hover:border-[#1e2d3d]"
                }`}
              >
                <span>{label}</span>
                {active ? null : <X size={14} />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 border-b border-[#1e2d3d]">
        <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          处理状态
        </h3>
        <div className="space-y-2">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const active = filterState.statuses.includes(key)
            const color = STATUS_COLORS[key]
            return (
              <button
                key={key}
                onClick={() => toggleStatus(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
                  active
                    ? "border"
                    : "bg-[#1a2332] text-[#64748b] border border-transparent hover:border-[#1e2d3d]"
                }`}
                style={
                  active
                    ? {
                        backgroundColor: `${color}10`,
                        borderColor: `${color}50`,
                        color,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? color : "#475569" }}
                  />
                  <span>{label}</span>
                </div>
                {active ? null : <X size={14} />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          时间范围
        </h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-[#64748b]">起始时间</label>
            <input
              type="text"
              value={filterState.timeRange.start}
              readOnly
              className="w-full mt-1 px-3 py-1.5 bg-[#1a2332] border border-[#1e2d3d] rounded text-xs text-[#94a3b8] font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b]">结束时间</label>
            <input
              type="text"
              value={filterState.timeRange.end}
              readOnly
              className="w-full mt-1 px-3 py-1.5 bg-[#1a2332] border border-[#1e2d3d] rounded text-xs text-[#94a3b8] font-mono"
            />
          </div>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-[#1e2d3d] bg-[#0b1019]">
        <div className="text-xs text-[#475569]">
          <span className="text-[#00e5a0]">●</span> 筛选条件已持久化，刷新页面不会丢失
        </div>
      </div>
    </div>
  )
}
