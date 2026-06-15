import { useState, useEffect } from "react"
import { useOceanStore } from "@/store/useOceanStore"
import { Save, X } from "lucide-react"

export default function CorrectionEditor() {
  const { tidalRecords, qualityIssues, correctRecord, refreshQualityIssues } = useOceanStore()

  useEffect(() => {
    if (tidalRecords.length > 0 && qualityIssues.length === 0) {
      refreshQualityIssues()
    }
  }, [tidalRecords])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [field, setField] = useState<string>("tideLevel")
  const [newValue, setNewValue] = useState("")
  const [reason, setReason] = useState("")

  const problematicRecords = tidalRecords.filter((r) =>
    qualityIssues.some((i) => i.recordId === r.id && i.status !== "resolved")
  )

  const handleSave = () => {
    if (!editingId || !reason.trim()) return

    let parsedValue: string | number | null = null
    if (field === "tideLevel") {
      parsedValue = newValue.trim() === "" ? null : parseFloat(newValue)
      if (newValue.trim() !== "" && isNaN(parsedValue as number)) return
    } else {
      parsedValue = newValue
    }

    correctRecord(editingId, field, parsedValue, reason.trim())
    setEditingId(null)
    setNewValue("")
    setReason("")
  }

  const startEdit = (recordId: string) => {
    const record = tidalRecords.find((r) => r.id === recordId)
    if (!record) return
    setEditingId(recordId)
    setField("tideLevel")
    setNewValue(record.tideLevel !== null ? String(record.tideLevel) : "")
    setReason("")
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="font-serif text-sm text-ocean-ink">人工修正区</h3>
        <p className="text-xs text-gray-400 mt-0.5">点击记录进行修正，修正后自动留痕</p>
      </div>

      <div className="divide-y divide-gray-50">
        {problematicRecords.map((record) => {
          const isEditing = editingId === record.id
          const issues = qualityIssues.filter(
            (i) => i.recordId === record.id && i.status !== "resolved"
          )

          return (
            <div key={record.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-gray-500">
                    {record.timestamp.slice(11, 16)}
                  </span>
                  <span className="text-gray-700">
                    潮位:{" "}
                    {record.tideLevel !== null ? (
                      <span className="font-mono">{record.tideLevel.toFixed(1)}m</span>
                    ) : (
                      <span className="text-ocean-coral">空</span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    {issues.map((i) => (
                      <span
                        key={i.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-ocean-coral/10 text-ocean-coral"
                      >
                        {i.type === "null_value"
                          ? "空值"
                          : i.type === "duplicate"
                          ? "重复"
                          : i.type === "timezone_error"
                          ? "时区"
                          : "混写"}
                      </span>
                    ))}
                  </div>
                </div>

                {!isEditing && (
                  <button
                    className="text-xs text-ocean-light hover:text-ocean-mid px-3 py-1 rounded-full border border-ocean-light/30 hover:border-ocean-light transition-colors"
                    onClick={() => startEdit(record.id)}
                  >
                    修正
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="mt-3 p-3 bg-ocean-surface rounded-lg space-y-3 animate-slide-up">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">修正字段</label>
                      <select
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ocean-light"
                      >
                        <option value="tideLevel">潮位</option>
                        <option value="timezone">时区</option>
                        <option value="remark">备注</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">新值</label>
                      <input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={field === "tideLevel" ? "输入潮位数值" : "输入新值"}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ocean-light"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">修正原因 *</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="说明修正原因"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ocean-light"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="text-xs text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      onClick={() => setEditingId(null)}
                    >
                      <X size={12} className="inline mr-1" />
                      取消
                    </button>
                    <button
                      className="text-xs bg-ocean-deep text-white px-4 py-1.5 rounded-full hover:bg-ocean-mid transition-colors disabled:opacity-50"
                      onClick={handleSave}
                      disabled={!reason.trim()}
                    >
                      <Save size={12} className="inline mr-1" />
                      保存修正
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {problematicRecords.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            暂无需要修正的记录
          </div>
        )}
      </div>
    </div>
  )
}
