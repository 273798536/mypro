import { useState, Fragment } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "@/store/useStore"
import { ChevronDown, ChevronRight, Download, AlertTriangle, Tag } from "lucide-react"

export default function DetailTable() {
  const getFilteredReviews = useStore((s) => s.getFilteredReviews)
  const getSignal = useStore((s) => s.getSignal)
  const getDevice = useStore((s) => s.getDevice)
  const getReading = useStore((s) => s.getReading)
  const getAnomalies = useStore((s) => s.getAnomalies)
  const reviews = getFilteredReviews()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-8"></th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">批次</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">标准信号</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">设备编号</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">偏差%</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">异常</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">复盘报告</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((rev) => {
              const signal = getSignal(rev.standardSignalId)
              const device = getDevice(rev.deviceRecordId)
              const reading = getReading(rev.readingRecordId)
              const anomalies = getAnomalies(rev.anomalyExplanationIds)
              const isExpanded = expandedId === rev.id

              return (
                <Fragment key={rev.id}>
                  <tr className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : rev.id)}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{rev.batchId}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-200">{signal?.name ?? "-"}</span>
                        {signal && (
                          <span className="text-xs text-slate-500 mt-0.5">
                            来源: {signal.source}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200">{device?.deviceNumber ?? "-"}</span>
                        {device?.isBackfilled && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/15 text-amber-400 text-xs rounded border border-amber-400/30">
                            <Tag size={10} />
                            补录
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono font-semibold ${
                          (reading?.deviationPercent ?? 0) > 2
                            ? "text-red-400"
                            : (reading?.deviationPercent ?? 0) > 1
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {reading?.deviationPercent.toFixed(1) ?? "-"}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {anomalies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {anomalies.map((a) => (
                            <span
                              key={a.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${
                                a.category === "standard_expired"
                                  ? "bg-red-400/10 text-red-400 border border-red-400/20"
                                  : a.category === "temp_drift"
                                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                                  : "bg-slate-400/10 text-slate-400 border border-slate-400/20"
                              }`}
                            >
                              <AlertTriangle size={10} />
                              {a.category === "standard_expired"
                                ? "过期"
                                : a.category === "temp_drift"
                                ? "温漂"
                                : "缺口"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">无异常</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rev.reportExportedAt ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                          <Download size={12} />
                          <span>{new Date(rev.reportExportedAt).toLocaleDateString("zh-CN")}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">未导出</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/detail/${rev.id}`)}
                        className="px-3 py-1 text-xs rounded border border-indigo-400/40 text-indigo-300 hover:bg-indigo-400/10 transition-colors"
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-slate-700/30">
                      <td colSpan={8} className="px-8 py-3 bg-slate-900/50">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block mb-1">标准信号详情</span>
                            {signal && (
                              <div className="text-slate-300 space-y-0.5">
                                <p>频率: {signal.frequency} MHz</p>
                                <p>幅度: {signal.amplitude} dBm</p>
                                <p>有效期: {signal.validFrom} ~ {signal.validTo}</p>
                                {signal.isExpired && <p className="text-red-400">⚠ 标准已过期</p>}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-1">读数记录</span>
                            {reading && (
                              <div className="text-slate-300 space-y-0.5">
                                <p>实测: {reading.measuredValue} dBm</p>
                                <p>期望: {reading.expectedValue} dBm</p>
                                <p>偏差: {reading.deviation} dBm</p>
                                {reading.hasGap && <p className="text-amber-400">⚠ {reading.gapDescription}</p>}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-1">补录影响</span>
                            {device?.isBackfilled ? (
                              <div className="text-amber-300 space-y-0.5">
                                <p>补录时间: {device.backfilledAt ? new Date(device.backfilledAt).toLocaleString("zh-CN") : "-"}</p>
                                <p>影响明细: {device.backfillAffectedDetailIds.join(", ")}</p>
                              </div>
                            ) : (
                              <p className="text-slate-500">非补录设备</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {reviews.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-sm">无匹配记录，请调整筛选条件</div>
      )}
    </div>
  )
}
