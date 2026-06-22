import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, ChevronDown, ChevronRight, ArrowRight } from "lucide-react"
import { useReviewStore } from "@/store/useReviewStore"
import type { Anomaly, AnomalySeverity, BoundaryType } from "@/types"

const severityConfig: Record<AnomalySeverity, { label: string; color: string; stripe: string }> = {
  critical: { label: "严重", color: "bg-red-500/15 text-red-400", stripe: "bg-red-500" },
  warning: { label: "警告", color: "bg-amber-500/15 text-amber-400", stripe: "bg-amber-500" },
}

const typeConfig: Record<BoundaryType, { label: string; color: string }> = {
  empty_set: { label: "空集合", color: "bg-red-500/15 text-red-400" },
  zero_value: { label: "零值", color: "bg-amber-500/15 text-amber-400" },
  extrapolation_overflow: { label: "外推越界", color: "bg-orange-500/15 text-orange-400" },
  normal: { label: "正常", color: "bg-emerald-500/15 text-emerald-400" },
}

function StepCard({ step, title, id, desc }: { step: number; title: string; id: string; desc: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-medium">
          {step}
        </span>
        <span className="text-xs text-gray-400">{title}</span>
      </div>
      <div className="bg-[#0f1219] rounded-lg p-3 border border-[#1e2440]">
        <p className="text-xs text-gray-500 mb-1 font-mono">{id}</p>
        <p className="text-sm text-gray-300 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function AnomalyCard({ anomaly, index }: { anomaly: Anomaly; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const resolveAnomaly = useReviewStore((s) => s.resolveAnomaly)
  const sev = severityConfig[anomaly.severity]
  const typ = typeConfig[anomaly.type]
  const isResolved = !!anomaly.resolvedAt

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="bg-[#0f1219] rounded-xl border border-[#1e2440] overflow-hidden"
    >
      <div className="flex">
        <div className={`w-1 shrink-0 ${sev.stripe}`} />

        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-mono text-gray-300 font-medium">{anomaly.id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${sev.color}`}>
              {sev.label}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typ.color}`}>
              {typ.label}
            </span>
            {isResolved ? (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400">
                已解决
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">
                未解决
              </span>
            )}

            <Link
              to={`/review/${anomaly.sampleId}`}
              className="ml-auto text-xs text-amber-500 hover:text-amber-400 transition-colors whitespace-nowrap"
            >
              查看样本 →
            </Link>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left flex items-start gap-2 group"
          >
            {expanded ? (
              <ChevronDown size={16} className="text-gray-500 mt-0.5 shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-gray-500 mt-0.5 shrink-0" />
            )}
            {!expanded && (
              <p className="text-sm text-gray-400 truncate">{anomaly.triggerMaterialDesc}</p>
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  <div className="flex items-start gap-3">
                    <StepCard step={1} title="触发材料" id={anomaly.triggerMaterialId} desc={anomaly.triggerMaterialDesc} />
                    <ArrowRight size={16} className="text-gray-600 mt-8 shrink-0" />
                    <StepCard step={2} title="影响结论" id={anomaly.affectedConclusionId} desc={anomaly.affectedConclusionDesc} />
                    <ArrowRight size={16} className="text-gray-600 mt-8 shrink-0" />
                    <StepCard step={3} title="建议处理" id="" desc={anomaly.suggestion} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e2440]">
                    {isResolved ? (
                      <p className="text-sm text-emerald-400">
                        已于 {new Date(anomaly.resolvedAt!).toLocaleString("zh-CN")} 标记解决
                      </p>
                    ) : (
                      <button
                        onClick={() => resolveAnomaly(anomaly.id)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                      >
                        标记已解决
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function Anomalies() {
  const anomalies = useReviewStore((s) => s.anomalies)

  const total = anomalies.length
  const unresolved = anomalies.filter((a) => !a.resolvedAt).length
  const critical = anomalies.filter((a) => a.severity === "critical").length
  const warning = anomalies.filter((a) => a.severity === "warning").length

  const sorted = [...anomalies].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1
    if (!!a.resolvedAt !== !!b.resolvedAt) return a.resolvedAt ? 1 : -1
    return 0
  })

  const summaryItems = [
    { label: "异常总数", value: total, color: "text-gray-200" },
    { label: "未解决", value: unresolved, color: "text-red-400" },
    { label: "严重", value: critical, color: "text-red-400" },
    { label: "警告", value: warning, color: "text-amber-400" },
  ]

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <CheckCircle size={48} className="text-emerald-500 mb-4" />
        <p className="text-lg text-gray-300 font-medium">暂无异常</p>
        <p className="text-sm text-gray-500 mt-1">所有样本边界检查均已通过</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-100">异常溯源</h2>
        <p className="text-sm text-gray-500 mt-1">追踪边界异常的原始触发材料与结论影响</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {summaryItems.map((item) => (
          <div key={item.label} className="bg-[#0f1219] rounded-xl border border-[#1e2440] p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((anomaly, i) => (
          <AnomalyCard key={anomaly.id} anomaly={anomaly} index={i} />
        ))}
      </div>
    </div>
  )
}
