import { AlertTriangle, AlertCircle, Info, MapPin, CheckCircle2, Clock, XCircle } from "lucide-react"
import { useStore } from "@/store/useStore"
import { CONFLICT_TYPE_LABELS, CONFLICT_SEVERITY_COLORS, PIPELINE_TYPE_LABELS } from "@/types"
import type { Conflict } from "@/types"

const SEVERITY_ICONS = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STATUS_LABELS: Record<Conflict["status"], string> = {
  unresolved: "未解决",
  in_progress: "处理中",
  resolved: "已解决",
}

const STATUS_COLORS: Record<Conflict["status"], string> = {
  unresolved: "bg-red-500/20 text-red-400 border-red-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
}

export default function ConflictList() {
  const conflicts = useStore((s) => s.conflicts)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const selectConflict = useStore((s) => s.selectConflict)
  const getPipelineById = useStore((s) => s.getPipelineById)
  const selectPipeline = useStore((s) => s.selectPipeline)
  const updateConflictStatus = useStore((s) => s.updateConflictStatus)

  const stats = {
    total: conflicts.length,
    unresolved: conflicts.filter((c) => c.status === "unresolved").length,
    inProgress: conflicts.filter((c) => c.status === "in_progress").length,
    resolved: conflicts.filter((c) => c.status === "resolved").length,
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-2 text-center">
          <div className="text-lg font-bold text-zinc-100">{stats.total}</div>
          <div className="text-[10px] text-zinc-500">总数</div>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-center">
          <div className="text-lg font-bold text-red-400">{stats.unresolved}</div>
          <div className="text-[10px] text-red-400/70">未解决</div>
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-center">
          <div className="text-lg font-bold text-yellow-400">{stats.inProgress}</div>
          <div className="text-[10px] text-yellow-400/70">处理中</div>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-2 text-center">
          <div className="text-lg font-bold text-green-400">{stats.resolved}</div>
          <div className="text-[10px] text-green-400/70">已解决</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {conflicts.map((conflict) => {
          const SeverityIcon = SEVERITY_ICONS[conflict.severity]
          const isSelected = selectedConflictId === conflict.id
          const pipelines = conflict.involvedPipelines
            .map((id) => getPipelineById(id))
            .filter(Boolean)

          return (
            <div
              key={conflict.id}
              onClick={() => {
                if (isSelected) {
                  selectConflict(null)
                } else {
                  selectConflict(conflict.id)
                  selectPipeline(null)
                }
              }}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                  : "border-[#2a2d36] bg-[#252830] hover:border-[#3a3d46] hover:bg-[#2a2d36]"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="mt-0.5 shrink-0 rounded-md p-1"
                  style={{ backgroundColor: `${CONFLICT_SEVERITY_COLORS[conflict.severity]}22` }}
                >
                  <SeverityIcon
                    size={14}
                    style={{ color: CONFLICT_SEVERITY_COLORS[conflict.severity] }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-zinc-500">{conflict.id}</span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[conflict.status]}`}
                    >
                      {STATUS_LABELS[conflict.status]}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-medium text-zinc-100">
                    {CONFLICT_TYPE_LABELS[conflict.type]}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{conflict.description}</p>

                  {conflict.elevationExpected != null && (
                    <div className="mt-2 rounded bg-[#1a1d23] px-2 py-1.5 text-[10px] font-mono">
                      <span className="text-zinc-500">设计标高:</span>
                      <span className="ml-1 text-zinc-300">{conflict.elevationExpected}m</span>
                      <span className="mx-2 text-zinc-600">→</span>
                      <span className="text-zinc-500">实际:</span>
                      <span
                        className={`ml-1 ${
                          Math.abs(conflict.elevationExpected - (conflict.elevationActual || 0)) > 0.5
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {conflict.elevationActual}m
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {pipelines.map((p) => (
                      <span
                        key={p!.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          selectPipeline(p!.id)
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[#2a2d36] bg-[#1a1d23] px-1.5 py-0.5 text-[10px] hover:bg-[#2a2d36]"
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: p!.color }}
                        />
                        <span className="text-zinc-400">{PIPELINE_TYPE_LABELS[p!.type]}</span>
                        <span className="font-mono text-zinc-500">{p!.id}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
                    <MapPin size={10} />
                    <span className="font-mono">
                      ({conflict.location[0].toFixed(1)}, {conflict.location[1].toFixed(1)},{" "}
                      {conflict.location[2].toFixed(1)})
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 flex gap-2 border-t border-[#2a2d36] pt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateConflictStatus(conflict.id, "unresolved")
                        }}
                        className="flex-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/20"
                      >
                        <XCircle size={10} className="inline mr-1" />
                        未解决
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateConflictStatus(conflict.id, "in_progress")
                        }}
                        className="flex-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] text-yellow-400 hover:bg-yellow-500/20"
                      >
                        <Clock size={10} className="inline mr-1" />
                        处理中
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateConflictStatus(conflict.id, "resolved")
                        }}
                        className="flex-1 rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] text-green-400 hover:bg-green-500/20"
                      >
                        <CheckCircle2 size={10} className="inline mr-1" />
                        已解决
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
