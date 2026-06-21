import type { ReplayRecord } from "@/types"
import { statusConfig, recordTypeLabels } from "@/lib/constants"

interface Props {
  record: ReplayRecord
  onClick: () => void
}

export default function RecordCard({ record, onClick }: Props) {
  const config = statusConfig[record.status]
  const StatusIcon = config.icon

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 group ${
        record.featureLateFlag
          ? "border-status-pending/40 bg-gradient-to-br from-surface-900 to-status-pending/5"
          : "border-surface-700/50 bg-surface-900/80 hover:border-amber-500/30"
      }`}
    >
      <div className="flex">
        <div className={`w-1 rounded-l-xl ${record.status === "processed" ? "bg-status-processed" : record.status === "pending_material" ? "bg-status-pending" : "bg-status-override"}`} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-medium text-surface-200 group-hover:text-amber-400 transition-colors leading-snug">
              {record.title}
            </h3>
            <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded bg-surface-700/50 text-surface-300">
              {recordTypeLabels[record.recordType]}
            </span>
            {record.featureLateFlag && (
              <span className="text-xs px-2 py-0.5 rounded bg-status-pending/15 text-status-pending border border-status-pending/30 animate-pulse-slow">
                特征迟到
              </span>
            )}
          </div>

          <div className="space-y-1.5 mb-3">
            {record.materials.map((mat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    mat.type === "training_log"
                      ? "bg-blue-500/15 text-blue-400"
                      : mat.type === "supplementary_note"
                        ? "bg-violet-500/15 text-violet-400"
                        : "bg-surface-600/30 text-surface-400"
                  }`}
                >
                  {mat.type === "training_log" ? "日志" : mat.type === "supplementary_note" ? "备注" : "口头"}
                </span>
                <span className="text-xs text-surface-400 truncate flex-1">{mat.description}</span>
                {mat.revised && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse-slow">
                    口径变更
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-surface-500">
            <span>创建: {record.createdAt}</span>
            {record.updatedAt !== record.createdAt && <span className="text-amber-500/70">更新: {record.updatedAt}</span>}
          </div>
        </div>
      </div>
    </button>
  )
}
