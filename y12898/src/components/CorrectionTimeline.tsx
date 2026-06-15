import { useOceanStore } from "@/store/useOceanStore"
import { formatCorrectionValue } from "@/utils/correctionEngine"
import { Clock, Check, ArrowRight } from "lucide-react"

export default function CorrectionTimeline() {
  const { corrections, approveCorrection } = useOceanStore()

  const sorted = [...corrections].sort(
    (a, b) => b.timestamp.localeCompare(a.timestamp)
  )

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-serif text-sm text-ocean-ink mb-3">修正留痕时间线</h3>
        <p className="text-sm text-gray-400 text-center py-4">暂无修正记录</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-serif text-sm text-ocean-ink">修正留痕时间线</h3>
        <span className="text-xs text-gray-400">{corrections.length} 条记录</span>
      </div>

      <div className="p-5 max-h-[400px] overflow-y-auto">
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

          {sorted.map((c, idx) => {
            const time = new Date(c.timestamp).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <div key={c.id} className="relative pl-7 pb-5 last:pb-0 animate-fade-in">
                <div
                  className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    c.reviewStatus === "approved"
                      ? "bg-ocean-green border-ocean-green"
                      : "bg-white border-ocean-coral"
                  }`}
                />

                <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                  <Clock size={10} />
                  {time}
                  <span className="text-gray-300">|</span>
                  <span>{c.operator}</span>
                </div>

                <div className="text-sm bg-ocean-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-ocean-mid bg-ocean-light/15 px-2 py-0.5 rounded">
                      {c.field === "tideLevel" ? "潮位" : c.field === "timezone" ? "时区" : c.field}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through text-gray-400">
                      {formatCorrectionValue(c.oldValue)}
                    </span>
                    <ArrowRight size={12} className="text-ocean-coral" />
                    <span className="text-ocean-deep font-medium">
                      {formatCorrectionValue(c.newValue)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-1.5">
                    原因: {c.reason}
                  </p>

                  {c.reviewStatus === "pending" && (
                    <button
                      className="mt-2 text-[11px] bg-ocean-green/15 text-ocean-greenDark px-3 py-1 rounded-full hover:bg-ocean-green/25 transition-colors inline-flex items-center gap-1"
                      onClick={() => approveCorrection(c.id)}
                    >
                      <Check size={10} />
                      确认通过
                    </button>
                  )}

                  {c.reviewStatus === "approved" && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-ocean-green">
                      <Check size={10} />
                      已审核通过
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
