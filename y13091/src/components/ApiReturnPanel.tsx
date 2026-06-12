import { useAppStore } from "@/store/useAppStore"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SENSOR_TYPE_LABELS,
} from "@/data/mockData"
import {
  ChevronDown,
  ChevronUp,
  Server,
  Tag,
  AlertTriangle,
} from "lucide-react"

export default function ApiReturnPanel() {
  const { apiReturns, apiPanelExpanded, toggleApiPanel, selectRecord } =
    useAppStore()

  const grouped = {
    processed: apiReturns.filter((a) => a.status === "processed"),
    pending_material: apiReturns.filter((a) => a.status === "pending_material"),
    manual_judgment: apiReturns.filter((a) => a.status === "manual_judgment"),
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

  return (
    <div className="bg-[#0f1724] border-t border-[#1e2d3d]">
      <button
        onClick={toggleApiPanel}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-[#1a2332] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Server size={16} className="text-[#00e5a0]" />
          <span className="text-sm font-semibold text-white">接口返回</span>
          <span className="text-xs text-[#64748b]">
            {apiReturns.length} 条
          </span>
        </div>
        {apiPanelExpanded ? (
          <ChevronDown size={16} className="text-[#64748b]" />
        ) : (
          <ChevronUp size={16} className="text-[#64748b]" />
        )}
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
              </div>

              <div className="space-y-2">
                {grouped[cat.key].map((item) => (
                  <div
                    key={item.recordId}
                    onClick={() => selectRecord(item.recordId)}
                    className="bg-[#1a2332] border border-[#1e2d3d] rounded-lg p-3 cursor-pointer hover:border-[#2a3a4d] transition-all"
                  >
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
                        <p className="text-[#94a3b8] truncate">
                          {item.manualNote}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.filterSnapshot.sensorTypes.map((type) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-0.5 text-[10px] bg-[#0f1724] text-[#64748b] px-1.5 py-0.5 rounded"
                        >
                          <Tag size={8} />
                          {SENSOR_TYPE_LABELS[type]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {grouped[cat.key].length === 0 && (
                  <div className="text-xs text-[#475569] text-center py-4">
                    暂无
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
