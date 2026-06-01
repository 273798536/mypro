import { useState } from "react"
import { useEnvelopeStore } from "@/store"
import type { AnomalyType } from "@/types"
import { ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from "@/types"
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, AlertTriangle, Disc3, Clock } from "lucide-react"

const TYPE_ICONS: Record<AnomalyType, typeof AlertTriangle> = {
  param_out_of_bounds: AlertTriangle,
  audio_clipping: Disc3,
  beat_misalignment: Clock,
}

const TABS: { type: AnomalyType | "all"; label: string }[] = [
  { type: "all", label: "全部" },
  { type: "param_out_of_bounds", label: "参数越界" },
  { type: "audio_clipping", label: "音频裁切" },
  { type: "beat_misalignment", label: "节拍错位" },
]

const STATUS_LABELS = {
  pending: "待确认",
  confirmed: "已确认",
  rejected: "已驳回",
} as const

export default function Anomalies() {
  const anomalies = useEnvelopeStore((s) => s.anomalies)
  const versions = useEnvelopeStore((s) => s.versions)
  const questions = useEnvelopeStore((s) => s.questions)
  const confirmAnomaly = useEnvelopeStore((s) => s.confirmAnomaly)
  const rejectAnomaly = useEnvelopeStore((s) => s.rejectAnomaly)

  const [tab, setTab] = useState<AnomalyType | "all">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all")

  const filtered = anomalies.filter((a) => {
    if (tab !== "all" && a.type !== tab) return false
    if (statusFilter !== "all" && a.status !== statusFilter) return false
    return true
  })

  const counts = {
    all: anomalies.filter((a) => statusFilter === "all" || a.status === statusFilter).length,
    param_out_of_bounds: anomalies.filter((a) => a.type === "param_out_of_bounds" && (statusFilter === "all" || a.status === statusFilter)).length,
    audio_clipping: anomalies.filter((a) => a.type === "audio_clipping" && (statusFilter === "all" || a.status === statusFilter)).length,
    beat_misalignment: anomalies.filter((a) => a.type === "beat_misalignment" && (statusFilter === "all" || a.status === statusFilter)).length,
  }

  const pendingCount = anomalies.filter((a) => a.status === "pending").length
  const confirmedCount = anomalies.filter((a) => a.status === "confirmed").length
  const rejectedCount = anomalies.filter((a) => a.status === "rejected").length

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white/90">异常待确认清单</h1>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-1 rounded bg-[#ff880020] text-[#ff8800] border border-[#ff880033]">
                待确认 {pendingCount}
              </span>
              <span className="px-2 py-1 rounded bg-[#00ff8820] text-[#00ff88] border border-[#00ff8833]">
                已确认 {confirmedCount}
              </span>
              <span className="px-2 py-1 rounded bg-white/10 text-white/40 border border-white/10">
                已驳回 {rejectedCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-[#0d0d1a] rounded-lg border border-white/5">
              {TABS.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setTab(t.type)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    tab === t.type
                      ? "bg-[#00ff8815] text-[#00ff88] border border-[#00ff8833]"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {t.label}
                  {counts[t.type] > 0 && (
                    <span className="ml-1 text-[10px]">({counts[t.type]})</span>
                  )}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              {(["all", "pending", "confirmed", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${
                    statusFilter === s ? "text-white/80 bg-white/10" : "text-white/30 hover:text-white/50"
                  }`}
                >
                  {s === "all" ? "全部状态" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/20 text-sm">
              暂无异常记录
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((anomaly) => {
                const Icon = TYPE_ICONS[anomaly.type]
                const version = versions.find((v) => v.id === anomaly.versionId)
                const relatedQuestions = questions.filter((q) => q.affectedAnomalyIds.includes(anomaly.id))
                const isExpanded = expandedId === anomaly.id
                const color = ANOMALY_TYPE_COLORS[anomaly.type]

                return (
                  <div
                    key={anomaly.id}
                    className={`bg-[#0d0d1a] rounded-lg border transition-all ${
                      anomaly.status === "pending"
                        ? "border-[#ff880033]"
                        : anomaly.status === "confirmed"
                        ? "border-[#00ff8822]"
                        : "border-white/5 opacity-50"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
                      onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                    >
                      <Icon size={16} style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${anomaly.status === "rejected" ? "line-through text-white/30" : "text-white/80"}`}>
                          {anomaly.description}
                        </p>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}33` }}
                      >
                        {ANOMALY_TYPE_LABELS[anomaly.type]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        anomaly.status === "pending" ? "bg-[#ff880020] text-[#ff8800]" :
                        anomaly.status === "confirmed" ? "bg-[#00ff8820] text-[#00ff88]" :
                        "bg-white/10 text-white/40"
                      }`}>
                        {STATUS_LABELS[anomaly.status]}
                      </span>
                      {isExpanded ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-white/30">关联版本</span>
                            <span className="ml-2 text-white/70 font-mono">{version?.label || "未知"}</span>
                          </div>
                          {anomaly.paramKey && (
                            <div>
                              <span className="text-white/30">关联参数</span>
                              <span className="ml-2 text-white/70">{anomaly.paramKey.toUpperCase()}</span>
                            </div>
                          )}
                          {anomaly.expectedRange && (
                            <div>
                              <span className="text-white/30">合法范围</span>
                              <span className="ml-2 text-white/70 font-mono">{anomaly.expectedRange[0]} ~ {anomaly.expectedRange[1]}</span>
                            </div>
                          )}
                          {anomaly.actualValue !== undefined && (
                            <div>
                              <span className="text-white/30">实际值</span>
                              <span className="ml-2 text-[#ff8800] font-mono">{anomaly.actualValue.toFixed(3)}</span>
                            </div>
                          )}
                        </div>

                        {relatedQuestions.length > 0 && (
                          <div>
                            <span className="text-xs text-white/30">关联课堂题目</span>
                            <div className="mt-1 space-y-1">
                              {relatedQuestions.map((q) => (
                                <div key={q.id} className="text-xs px-2 py-1 bg-[#1a1a2e] rounded border border-white/5 text-white/60">
                                  {q.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {version && (
                          <div>
                            <span className="text-xs text-white/30">该版本包络参数</span>
                            <div className="mt-1 flex gap-3 text-xs font-mono text-white/50">
                              <span>A: {version.envelope.attack.toFixed(3)}s</span>
                              <span>D: {version.envelope.decay.toFixed(3)}s</span>
                              <span>S: {version.envelope.sustain.toFixed(2)}</span>
                              <span>R: {version.envelope.release.toFixed(3)}s</span>
                            </div>
                          </div>
                        )}

                        {anomaly.status === "pending" && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); confirmAnomaly(anomaly.id) }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#00ff8820] text-[#00ff88] border border-[#00ff8833] rounded hover:bg-[#00ff8830] transition-colors"
                            >
                              <CheckCircle2 size={14} />
                              确认接受
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); rejectAnomaly(anomaly.id) }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/5 text-white/50 border border-white/10 rounded hover:bg-white/10 hover:text-white/70 transition-colors"
                            >
                              <XCircle size={14} />
                              驳回修正
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
