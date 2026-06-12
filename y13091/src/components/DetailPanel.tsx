import { useAppStore } from "@/store/useAppStore"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SENSOR_TYPE_LABELS,
} from "@/data/mockData"
import {
  AlertTriangle,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Edit3,
  Save,
} from "lucide-react"
import { useState, useCallback } from "react"

export default function DetailPanel() {
  const {
    records,
    selectedRecordId,
    selectedSegmentIndex,
    detailPanelOpen,
    toggleDetailPanel,
    updateManualNote,
    updateRecordStatus,
  } = useAppStore()

  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState("")

  const record = records.find((r) => r.id === selectedRecordId)
  const segment = record?.timeSegments[selectedSegmentIndex]

  const startEditingNote = useCallback(() => {
    if (record) {
      setNoteText(record.manualNote)
      setEditingNote(true)
    }
  }, [record])

  const saveNote = useCallback(() => {
    if (record) {
      updateManualNote(record.id, noteText)
      setEditingNote(false)
    }
  }, [record, noteText, updateManualNote])

  if (!detailPanelOpen) {
    return (
      <button
        onClick={toggleDetailPanel}
        className="w-10 bg-[#0f1724] border-l border-[#1e2d3d] flex items-center justify-center hover:bg-[#1a2332] transition-colors"
      >
        <PanelRightOpen size={16} className="text-[#64748b]" />
      </button>
    )
  }

  return (
    <div className="w-80 flex-shrink-0 bg-[#0f1724] border-l border-[#1e2d3d] flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-[#1e2d3d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#00e5a0]" />
          <span className="text-sm font-semibold text-white">侧边明细</span>
        </div>
        <button
          onClick={toggleDetailPanel}
          className="text-[#64748b] hover:text-white transition-colors"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {!record ? (
        <div className="flex-1 flex items-center justify-center text-[#475569] text-sm">
          <div className="text-center">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p>点击时间轴记录查看明细</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 space-y-4">
          {record.sensorName !== record.apiReturnName && (
            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-[#f59e0b] text-sm font-semibold mb-2">
                <AlertTriangle size={16} />
                名称不一致
              </div>
              <div className="text-xs text-[#94a3b8] space-y-1">
                <p>
                  <span className="text-[#64748b]">录入名称：</span>
                  {record.sensorName}
                </p>
                <p>
                  <span className="text-[#64748b]">接口返回：</span>
                  <span className="text-[#f59e0b]">{record.apiReturnName}</span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#64748b]">传感器编号</label>
              <p className="text-sm text-white font-mono mt-0.5">
                {record.id}
              </p>
            </div>
            <div>
              <label className="text-xs text-[#64748b]">传感器名称</label>
              <p className="text-sm text-white mt-0.5">{record.sensorName}</p>
            </div>
            <div>
              <label className="text-xs text-[#64748b]">传感器类型</label>
              <p className="text-sm text-white mt-0.5">
                {SENSOR_TYPE_LABELS[record.sensorType]}
              </p>
            </div>
            <div>
              <label className="text-xs text-[#64748b]">处理状态</label>
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[record.status],
                  }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: STATUS_COLORS[record.status] }}
                >
                  {STATUS_LABELS[record.status]}
                </span>
              </div>
            </div>
          </div>

          {segment && (
            <div className="border-t border-[#1e2d3d] pt-3 space-y-2">
              <h4 className="text-xs text-[#64748b] font-semibold">
                当前时间段
              </h4>
              <div className="bg-[#1a2332] rounded-md p-3 text-xs space-y-1.5 font-mono">
                <p className="text-[#94a3b8]">
                  <span className="text-[#64748b]">起始：</span>
                  {segment.start}
                </p>
                <p className="text-[#94a3b8]">
                  <span className="text-[#64748b]">结束：</span>
                  {segment.end}
                </p>
                {segment.isGap ? (
                  <p className="text-[#f59e0b] font-bold">⚠ 数据缺失段</p>
                ) : (
                  <p className="text-[#94a3b8]">
                    <span className="text-[#64748b]">采样数：</span>
                    {segment.values.length}
                  </p>
                )}
              </div>
              {segment.values.length > 0 && !segment.isGap && (
                <div className="bg-[#1a2332] rounded-md p-3">
                  <div className="text-xs text-[#64748b] mb-2">数值趋势</div>
                  <div className="h-12 flex items-end gap-px">
                    {segment.values.map((v, i) => {
                      const min = Math.min(...segment.values)
                      const max = Math.max(...segment.values)
                      const range = max - min || 1
                      const height = ((v - min) / range) * 100
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-[#00e5a0]/60 rounded-t-sm min-w-[2px]"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-[#475569] mt-1 font-mono">
                    <span>{Math.min(...segment.values).toFixed(2)}</span>
                    <span>{Math.max(...segment.values).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[#1e2d3d] pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs text-[#64748b] font-semibold">人工备注</h4>
              {!editingNote && (
                <button
                  onClick={startEditingNote}
                  className="text-[#64748b] hover:text-[#00e5a0] transition-colors"
                >
                  <Edit3 size={12} />
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full h-24 bg-[#1a2332] border border-[#1e2d3d] rounded-md p-2 text-xs text-white resize-none focus:outline-none focus:border-[#00e5a0]/50"
                  placeholder="输入人工备注..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    className="flex items-center gap-1 text-xs bg-[#00e5a0] text-[#0f1724] px-3 py-1.5 rounded-md font-semibold hover:bg-[#00e5a0]/90 transition-colors"
                  >
                    <Save size={12} />
                    保存
                  </button>
                  <button
                    onClick={() => setEditingNote(false)}
                    className="text-xs text-[#64748b] px-3 py-1.5 rounded-md hover:text-white transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                {record.manualNote || "暂无备注"}
              </p>
            )}
          </div>

          {record.status !== "processed" && (
            <div className="border-t border-[#1e2d3d] pt-3 space-y-2">
              <h4 className="text-xs text-[#64748b] font-semibold">操作</h4>
              {record.status === "pending_material" && (
                <button
                  onClick={() => updateRecordStatus(record.id, "processed")}
                  className="w-full text-xs bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/30 px-3 py-2 rounded-md hover:bg-[#00e5a0]/20 transition-colors"
                >
                  标记为已补录
                </button>
              )}
              {record.status === "manual_judgment" && (
                <button
                  onClick={() => updateRecordStatus(record.id, "processed")}
                  className="w-full text-xs bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/30 px-3 py-2 rounded-md hover:bg-[#a855f7]/20 transition-colors"
                >
                  确认人工改判
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
