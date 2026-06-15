import { useState } from "react"
import { useStore } from "@/store/useStore"
import type { ManualCorrection } from "@/types"
import { PenLine, ArrowRight, User, Clock, FileText, AlertCircle } from "lucide-react"

export default function Corrections() {
  const corrections = useStore((s) => s.corrections)
  const selectedBatchId = useStore((s) => s.selectedBatchId)
  const addCorrection = useStore((s) => s.addCorrection)

  const filtered = corrections.filter((c) => c.batchId === selectedBatchId)

  const [field, setField] = useState("")
  const [oldValue, setOldValue] = useState("")
  const [newValue, setNewValue] = useState("")
  const [reason, setReason] = useState("")

  const handleSubmit = () => {
    if (!field.trim() || !oldValue.trim() || !newValue.trim() || !reason.trim()) return
    addCorrection({
      batchId: selectedBatchId,
      operator: "当前调度员",
      field: field.trim(),
      oldValue: oldValue.trim(),
      newValue: newValue.trim(),
      statusBefore: "待确认",
      statusAfter: "通过",
      reason: reason.trim(),
    })
    setField("")
    setOldValue("")
    setNewValue("")
    setReason("")
  }

  return (
    <div className="space-y-6">
      <h2 className="section-title">
        <PenLine className="w-5 h-5 text-ice" />
        人工修正留痕
      </h2>

      <div className="card-dark">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber" />
          记录新修正
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">修正字段</label>
            <input
              className="input-field w-full"
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="如：漂移指数"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">修正前数值</label>
            <input
              className="input-field w-full"
              value={oldValue}
              onChange={(e) => setOldValue(e.target.value)}
              placeholder="如：0.23"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">修正后数值</label>
            <input
              className="input-field w-full"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="如：0.19"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">修正原因</label>
            <textarea
              className="input-field w-full resize-none"
              rows={1}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="简述修正依据"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleSubmit}
            disabled={!field.trim() || !oldValue.trim() || !newValue.trim() || !reason.trim()}
          >
            <PenLine className="w-4 h-4" />
            记录修正
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-dark text-center py-12 text-slate-500">
          当前批次暂无人工修正记录
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-ocean-700/60" />

          <div className="space-y-0">
            {filtered.map((c) => (
              <CorrectionEntry key={c.id} correction={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CorrectionEntry({ correction }: { correction: ManualCorrection }) {
  const { operator, timestamp, field, oldValue, newValue, statusBefore, statusAfter, reason } = correction

  return (
    <div className="relative pl-8 pb-6">
      <div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full bg-ocean-800 border-2 border-ice/60 flex items-center justify-center z-10">
        <div className="w-2 h-2 rounded-full bg-ice" />
      </div>

      <div className="card-dark-hover">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {operator}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {timestamp}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200">{field}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          <span className="data-mono text-sm line-through text-slate-500">{oldValue}</span>
          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="data-mono text-sm font-semibold text-ice">{newValue}</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="badge-deferred">{statusBefore}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="badge-available">{statusAfter}</span>
        </div>

        <div className="bg-ocean-950/60 border border-ocean-700/40 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-400 leading-relaxed">{reason}</p>
        </div>
      </div>
    </div>
  )
}
