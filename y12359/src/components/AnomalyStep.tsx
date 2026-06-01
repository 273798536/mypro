import { useState } from "react"
import { useStore } from "@/store/useStore"
import { ChevronDown, ChevronRight, Save, AlertTriangle, Thermometer, FileWarning } from "lucide-react"
import type { CalibrationReview, AnomalyExplanation } from "@/types"
import { anomalyExplanations } from "@/data/mock"

const categoryMeta: Record<string, { label: string; icon: React.ReactNode; color: string; borderColor: string; bgColor: string }> = {
  standard_expired: {
    label: "标准过期说明",
    icon: <AlertTriangle size={14} />,
    color: "text-red-400",
    borderColor: "border-red-400/30",
    bgColor: "bg-red-400/5",
  },
  temp_drift: {
    label: "温漂异常说明",
    icon: <Thermometer size={14} />,
    color: "text-amber-400",
    borderColor: "border-amber-400/30",
    bgColor: "bg-amber-400/5",
  },
  reading_gap: {
    label: "读数缺口说明",
    icon: <FileWarning size={14} />,
    color: "text-slate-400",
    borderColor: "border-slate-400/30",
    bgColor: "bg-slate-400/5",
  },
}

function AnomalyPanel({ anomaly }: { anomaly: AnomalyExplanation }) {
  const [expanded, setExpanded] = useState(true)
  const [description, setDescription] = useState(anomaly.description)
  const [saved, setSaved] = useState(false)
  const meta = categoryMeta[anomaly.category]

  const handleSave = () => {
    anomaly.description = description
    anomaly.lastModifiedAt = new Date().toISOString()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={`rounded-lg border ${meta.borderColor} ${meta.bgColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          <span className={meta.color}>{meta.icon}</span>
          <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            anomaly.severity === "high"
              ? "bg-red-400/15 text-red-400"
              : anomaly.severity === "medium"
              ? "bg-amber-400/15 text-amber-400"
              : "bg-slate-400/15 text-slate-400"
          }`}>
            {anomaly.severity === "high" ? "高" : anomaly.severity === "medium" ? "中" : "低"}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          最后修改: {new Date(anomaly.lastModifiedAt).toLocaleString("zh-CN")}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setSaved(false) }}
            rows={3}
            className="w-full rounded border border-slate-600/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 resize-y focus:outline-none focus:border-indigo-400/50 transition-colors"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
            >
              <Save size={12} />
              保存
            </button>
            {saved && <span className="text-xs text-emerald-400">已保存</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnomalyStep({ review }: { review: CalibrationReview }) {
  const getAnomalies = useStore((s) => s.getAnomalies)
  const anomalies = getAnomalies(review.anomalyExplanationIds)

  const grouped = {
    standard_expired: anomalies.filter((a) => a.category === "standard_expired"),
    temp_drift: anomalies.filter((a) => a.category === "temp_drift"),
    reading_gap: anomalies.filter((a) => a.category === "reading_gap"),
  }

  return (
    <div className="space-y-3">
      {(["standard_expired", "temp_drift", "reading_gap"] as const).map((cat) => {
        const items = grouped[cat]
        if (items.length === 0) {
          const meta = categoryMeta[cat]
          return (
            <div key={cat} className={`rounded-lg border ${meta.borderColor} ${meta.bgColor} px-4 py-3 flex items-center gap-2`}>
              <span className={meta.color}>{meta.icon}</span>
              <span className={`text-sm ${meta.color}`}>{meta.label}</span>
              <span className="text-xs text-slate-500 ml-auto">无异常</span>
            </div>
          )
        }
        return (
          <div key={cat} className="space-y-2">
            {items.map((a) => (
              <AnomalyPanel key={a.id} anomaly={a} />
            ))}
          </div>
        )
      })}
      {anomalies.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          本次校准无异常记录
        </div>
      )}
    </div>
  )
}
