import { useAppStore } from "@/store/useAppStore"
import { STATUS_COLORS, SENSOR_TYPE_LABELS } from "@/data/mockData"
import { AlertTriangle, Clock, Play } from "lucide-react"

export default function TimelineView() {
  const {
    records,
    filterState,
    selectedRecordId,
    selectedSegmentIndex,
    selectRecord,
    selectSegment,
  } = useAppStore()

  const filteredRecords = records.filter(
    (r) =>
      filterState.sensorTypes.includes(r.sensorType) &&
      filterState.statuses.includes(r.status)
  )

  const totalMinutes = 195

  function timeToOffset(timeStr: string): number {
    const parts = timeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
    if (!parts) return 0
    const h = parseInt(parts[4])
    const m = parseInt(parts[5])
    return ((h - 8) * 60 + m) / totalMinutes
  }

  function segWidth(seg: (typeof filteredRecords)[0]["timeSegments"][0]): number {
    const s = timeToOffset(seg.start)
    const e = timeToOffset(seg.end)
    return Math.max((e - s) * 100, 0.8)
  }

  const handleSegmentClick = (recordId: string, segIndex: number) => {
    if (selectedRecordId !== recordId) {
      selectRecord(recordId)
    }
    selectSegment(segIndex)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#00e5a0]" />
          <span className="text-sm font-semibold text-white">时序回放</span>
          <span className="text-xs text-[#64748b]">
            {filteredRecords.length} 条记录
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#64748b]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2.5 rounded-sm bg-[#00e5a0]" />
            正常段
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2.5 rounded-sm border-2 border-dashed border-[#f59e0b] bg-transparent" />
            缺段
          </span>
          <span className="flex items-center gap-1.5">
            <Play size={12} className="text-[#00e5a0]" />
            当前选中
          </span>
        </div>
      </div>

      <div className="px-6 pb-1">
        <div className="flex text-xs text-[#475569] font-mono relative">
          <span className="absolute" style={{ left: "0%" }}>08:00</span>
          <span className="absolute" style={{ left: "30.7%" }}>09:00</span>
          <span className="absolute" style={{ left: "61.5%" }}>10:00</span>
          <span className="absolute" style={{ left: "92.3%" }}>11:00</span>
          <div className="h-4" />
        </div>
      </div>

      <div className="flex-1 px-6 space-y-2 overflow-y-auto pb-4 pr-2">
        {filteredRecords.map((record) => {
          const isSelected = selectedRecordId === record.id
          const statusColor = STATUS_COLORS[record.status]
          const typeLabel = SENSOR_TYPE_LABELS[record.sensorType]
          const hasGap = record.timeSegments.some((s) => s.isGap)
          const nameMismatch = record.sensorName !== record.apiReturnName

          return (
            <div
              key={record.id}
              className={`rounded-lg border transition-all cursor-pointer group ${
                isSelected
                  ? "bg-[#1a2332] border-[#00e5a0]/50 shadow-[0_0_24px_rgba(0,229,160,0.12)]"
                  : "bg-[#0f1724] border-[#1e2d3d] hover:border-[#2a3a4d]"
              }`}
              onClick={() => selectRecord(isSelected ? null : record.id)}
            >
              <div className="flex items-center gap-3 px-3.5 py-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: statusColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">
                      {record.sensorName}
                    </span>
                    <span className="text-xs text-[#64748b] flex-shrink-0">
                      {typeLabel}
                    </span>
                    {nameMismatch && (
                      <span className="flex items-center gap-1 text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        <AlertTriangle size={10} />
                        名称不一致
                      </span>
                    )}
                    {hasGap && (
                      <span className="flex items-center gap-1 text-[10px] text-[#f59e0b] border border-[#f59e0b]/40 border-dashed px-1.5 py-0.5 rounded flex-shrink-0">
                        含缺段
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#475569] font-mono flex-shrink-0">
                  {record.id}
                </span>
              </div>

              <div className="px-3.5 pb-2.5">
                <div className="relative h-9 bg-[#0b1019] rounded-md overflow-hidden">
                  {record.timeSegments.map((seg, idx) => {
                    const left = timeToOffset(seg.start) * 100
                    const width = segWidth(seg)
                    const isActiveSeg = isSelected && selectedSegmentIndex === idx

                    return (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSegmentClick(record.id, idx)
                        }}
                        className="absolute top-1.5 bottom-1.5 rounded transition-all hover:brightness-125"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: seg.isGap ? "transparent" : isActiveSeg ? statusColor : `${statusColor}90`,
                          border: seg.isGap
                            ? `2px dashed ${isActiveSeg ? "#f59e0b" : "#f59e0b80"}`
                            : isActiveSeg
                              ? `2px solid rgba(255,255,255,0.8)`
                              : "none",
                          boxShadow: isActiveSeg && !seg.isGap
                            ? `0 0 12px ${statusColor}, 0 0 4px white`
                            : "none",
                          opacity: seg.isGap ? 1 : isSelected ? 1 : 0.7,
                        }}
                        title={`${seg.start} ~ ${seg.end}${seg.isGap ? " (缺段)" : ""}`}
                      >
                        {seg.isGap && width > 4 && (
                          <span className="text-[9px] text-[#f59e0b] font-bold w-full text-center block leading-6">
                            缺段
                          </span>
                        )}
                        {isActiveSeg && !seg.isGap && width > 3 && (
                          <Play size={10} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {isSelected && (
                <div className="px-3.5 pb-3 border-t border-[#1e2d3d] pt-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {record.timeSegments.map((seg, idx) => {
                      const isActive = selectedSegmentIndex === idx
                      return (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSegmentClick(record.id, idx)
                          }}
                          className={`text-[11px] px-2 py-1 rounded transition-all ${
                            seg.isGap
                              ? "border border-dashed"
                              : isActive
                                ? "font-bold text-[#0f1724]"
                                : "text-[#94a3b8] hover:text-white"
                          }`}
                          style={{
                            backgroundColor: seg.isGap
                              ? "transparent"
                              : isActive
                                ? statusColor
                                : "#1e2d3d",
                            borderColor: seg.isGap
                              ? isActive
                                ? "#f59e0b"
                                : "#f59e0b80"
                              : "transparent",
                            color: seg.isGap
                              ? isActive
                                ? "#f59e0b"
                                : "#f59e0b80"
                              : undefined,
                          }}
                        >
                          {seg.start.split(" ")[1]} ~ {seg.end.split(" ")[1]}
                          {seg.isGap ? " · 缺段" : ""}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[#475569]">
            <Clock size={32} className="mb-2 opacity-30" />
            <p className="text-sm">当前筛选条件下无记录</p>
            <p className="text-xs mt-1">请调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  )
}
