import { useStore } from "@/store/useStore"
import { Link2, Clock, ArrowRight, FileText } from "lucide-react"
import type { CalibrationReview } from "@/types"

export default function TracePanel({ review }: { review: CalibrationReview }) {
  const getSignal = useStore((s) => s.getSignal)
  const getReading = useStore((s) => s.getReading)
  const getTraceLink = useStore((s) => s.getTraceLink)

  const signal = getSignal(review.standardSignalId)
  const reading = getReading(review.readingRecordId)
  const trace = getTraceLink(review.id)

  const nodes = [
    {
      label: "标准信号",
      name: signal?.name ?? "-",
      detail: signal ? `频率 ${signal.frequency} MHz · 来源 ${signal.source}` : "",
      timestamp: signal ? `有效期 ${signal.validFrom} ~ ${signal.validTo}` : "",
      isExpired: signal?.isExpired ?? false,
      icon: <Link2 size={14} />,
    },
    {
      label: "读数记录",
      name: reading ? `${reading.measuredValue} dBm` : "-",
      detail: reading ? `偏差 ${reading.deviation} dBm (${reading.deviationPercent.toFixed(1)}%)` : "",
      timestamp: reading ? `采样时间 ${new Date(reading.timestamp).toLocaleString("zh-CN")}` : "",
      isExpired: false,
      icon: <FileText size={14} />,
    },
    {
      label: "报告导出",
      name: review.reportExportedAt ? "已导出" : "未导出",
      detail: review.batchId,
      timestamp: review.reportExportedAt
        ? `导出时间 ${new Date(review.reportExportedAt).toLocaleString("zh-CN")}`
        : "尚未导出",
      isExpired: false,
      icon: <Clock size={14} />,
    },
  ]

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-5">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">溯源关系</h3>
      <div className="flex items-start gap-0">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-start">
            <div className="flex flex-col items-center w-48">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  node.isExpired
                    ? "border-red-400/50 bg-red-400/10 text-red-400"
                    : i === 2 && !review.reportExportedAt
                    ? "border-slate-600/50 bg-slate-700/30 text-slate-500"
                    : "border-indigo-400/50 bg-indigo-400/10 text-indigo-400"
                }`}
              >
                {node.icon}
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs text-slate-500 mb-0.5">{node.label}</p>
                <p className={`text-sm font-medium ${node.isExpired ? "text-red-400" : "text-slate-200"}`}>
                  {node.name}
                </p>
                {node.detail && <p className="text-xs text-slate-500 mt-0.5">{node.detail}</p>}
                <p className="text-xs text-slate-600 mt-0.5">{node.timestamp}</p>
                {node.isExpired && (
                  <span className="inline-block mt-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">
                    标准已过期
                  </span>
                )}
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div className="flex items-center pt-3 px-2">
                <ArrowRight size={16} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}
      </div>
      {trace && (
        <div className="mt-4 pt-3 border-t border-slate-700/40 text-xs text-slate-500">
          <span className="font-mono">Trace ID: {trace.reviewId}</span>
          <span className="mx-3">|</span>
          <span>标准信号 → 读数记录 → 报告导出 对应关系已建立</span>
        </div>
      )}
    </div>
  )
}
