import { useState } from "react"
import { ScreenshotRecord, RecognizedData } from "@/types"
import { useStore } from "@/store/useStore"
import { PenLine, Check, Trash2, Plus } from "lucide-react"

export function ManualAnnotationCard({ record }: { record: ScreenshotRecord }) {
  const addAnnotation = useStore((s) => s.addManualAnnotation)
  const removeAnnotation = useStore((s) => s.removeManualAnnotation)
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState("")

  const existingData = record.manualAnnotation
    ? record.manualAnnotation.overrideData
    : record.recognizedData

  const [participants, setParticipants] = useState<string[]>(
    existingData?.participants || [""]
  )
  const [shares, setShares] = useState<{ name: string; ratio: number }[]>(
    existingData?.shares || [{ name: "", ratio: 0 }]
  )
  const [introType, setIntroType] = useState(existingData?.introType || "")

  const startEdit = () => {
    const base = record.manualAnnotation
      ? record.manualAnnotation.overrideData
      : record.recognizedData
    setParticipants(base?.participants || [""])
    setShares(base?.shares || [{ name: "", ratio: 0 }])
    setIntroType(base?.introType || "")
    setReason(record.manualAnnotation?.reason || "")
    setEditing(true)
  }

  const saveAnnotation = () => {
    const data: RecognizedData = {
      participants: participants.filter((p) => p.trim()),
      shares: shares.filter((s) => s.name.trim()),
      introType,
    }
    addAnnotation(record.id, data, reason)
    setEditing(false)
  }

  const handleRemove = () => {
    removeAnnotation(record.id)
    setEditing(false)
  }

  if (record.manualAnnotation && !editing) {
    return (
      <div className="bg-studio-amber/5 border border-studio-amber/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PenLine size={14} className="text-studio-amber" />
            <span className="text-sm font-medium text-studio-amber">人工批注覆盖</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startEdit}
              className="text-xs text-studio-muted hover:text-studio-amber transition-colors"
            >
              编辑
            </button>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 text-xs text-studio-muted hover:text-studio-coral transition-colors"
            >
              <Trash2 size={12} />
              移除
            </button>
          </div>
        </div>
        <div className="text-xs text-studio-muted space-y-1">
          <div>原因：{record.manualAnnotation.reason}</div>
          <div>
            时间：{new Date(record.manualAnnotation.timestamp).toLocaleString("zh-CN")}
          </div>
        </div>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="bg-studio-card border border-studio-border rounded-lg p-4">
        <button
          onClick={startEdit}
          className="flex items-center gap-2 text-sm text-studio-muted hover:text-studio-amber transition-colors"
        >
          <Plus size={14} />
          添加人工批注覆盖旧判断
        </button>
        <p className="text-xs text-studio-muted/60 mt-1">
          覆盖后原判断保留但置灰，版本对齐可追溯
        </p>
      </div>
    )
  }

  return (
    <div className="bg-studio-card border border-studio-amber/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PenLine size={14} className="text-studio-amber" />
        <span className="text-sm font-medium text-studio-amber">编辑人工批注</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-studio-muted block mb-1">参与人</label>
          {participants.map((p, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={p}
                onChange={(e) => {
                  const next = [...participants]
                  next[i] = e.target.value
                  setParticipants(next)
                }}
                className="flex-1 bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none"
                placeholder="姓名"
              />
              {participants.length > 1 && (
                <button
                  onClick={() => setParticipants(participants.filter((_, j) => j !== i))}
                  className="text-studio-muted hover:text-studio-coral"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setParticipants([...participants, ""])}
            className="text-xs text-studio-amber hover:text-studio-amber-dim mt-1"
          >
            + 添加参与人
          </button>
        </div>

        <div>
          <label className="text-xs text-studio-muted block mb-1">分账比例</label>
          {shares.map((s, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={s.name}
                onChange={(e) => {
                  const next = [...shares]
                  next[i] = { ...next[i], name: e.target.value }
                  setShares(next)
                }}
                className="w-24 bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none"
                placeholder="姓名"
              />
              <input
                type="number"
                value={s.ratio * 100}
                onChange={(e) => {
                  const next = [...shares]
                  next[i] = { ...next[i], ratio: Number(e.target.value) / 100 }
                  setShares(next)
                }}
                className="w-20 bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none"
                placeholder="%"
              />
              <span className="text-xs text-studio-muted">%</span>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-studio-muted block mb-1">片头类型</label>
          <input
            type="text"
            value={introType}
            onChange={(e) => setIntroType(e.target.value)}
            className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none"
            placeholder="标准片头 / 过渡片头 / 联合片头"
          />
        </div>

        <div>
          <label className="text-xs text-studio-muted block mb-1">批注原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none resize-none"
            rows={2}
            placeholder="说明覆盖原因，便于复核人理解"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-studio-muted hover:text-studio-text px-3 py-1.5 rounded transition-colors"
        >
          取消
        </button>
        <button
          onClick={saveAnnotation}
          className="flex items-center gap-1 text-xs bg-studio-amber/20 text-studio-amber border border-studio-amber/40 hover:bg-studio-amber/30 px-3 py-1.5 rounded transition-colors"
        >
          <Check size={12} />
          保存批注
        </button>
      </div>
    </div>
  )
}
