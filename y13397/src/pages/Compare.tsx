import { useParams, useNavigate } from "react-router-dom"
import { useStore } from "@/store/useStore"
import { ArrowLeft, ArrowUpRight, ArrowDownRight, User, AlertTriangle, FlaskConical, BarChart3 } from "lucide-react"
import { statusConfig, recordTypeLabels } from "@/lib/constants"

export default function Compare() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getRecordById, getComparison } = useStore()

  if (!id) return null

  const record = getRecordById(id)
  const comparison = getComparison(id)

  if (!record || !comparison) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <p className="text-surface-400">记录未找到</p>
      </div>
    )
  }

  const statusConf = statusConfig[record.status]
  const StatusIcon = statusConf.icon

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-amber-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </button>

        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-xl font-semibold text-surface-100">{record.title}</h2>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConf.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConf.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-surface-700/50 text-surface-300">
            {recordTypeLabels[record.recordType]}
          </span>
          {record.featureLateFlag && (
            <span className="text-xs px-2 py-0.5 rounded bg-status-pending/15 text-status-pending border border-status-pending/30">
              特征迟到
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Section icon={FlaskConical} title="样本变化" color="text-blue-400">
            <div className="space-y-3">
              <CompareRow label="前一版样本数" prev={comparison.sampleChange.previous.toLocaleString()} curr={comparison.sampleChange.current.toLocaleString()} />
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-surface-500">变化量</span>
                <span className={`data-font text-sm font-medium flex items-center gap-1 ${comparison.sampleChange.delta > 0 ? "text-status-processed" : comparison.sampleChange.delta < 0 ? "text-status-override" : "text-surface-400"}`}>
                  {comparison.sampleChange.delta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : comparison.sampleChange.delta < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                  {comparison.sampleChange.delta > 0 ? "+" : ""}{comparison.sampleChange.delta.toLocaleString()}
                </span>
              </div>
            </div>
          </Section>

          <Section icon={AlertTriangle} title="阈值变化" color="text-amber-400">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500">前一版</span>
                <span className="data-font text-sm text-surface-300">{comparison.thresholdChange.previous}</span>
              </div>
              <div className="relative h-2 bg-surface-700/50 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-surface-500/40 rounded-full" style={{ width: `${comparison.thresholdChange.previous * 100}%` }} />
                <div className="absolute left-0 top-0 h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${comparison.thresholdChange.current * 100}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500">当前版</span>
                <span className="data-font text-sm text-amber-400">{comparison.thresholdChange.current}</span>
              </div>
              <p className="text-xs text-surface-500 bg-surface-800/50 rounded px-3 py-2 mt-2">
                {comparison.thresholdChange.reason}
              </p>
            </div>
          </Section>

          <Section icon={User} title="人工修正" color="text-status-override">
            {comparison.manualCorrections.length === 0 ? (
              <p className="text-xs text-surface-500 py-4 text-center">无人工修正记录</p>
            ) : (
              <div className="space-y-3">
                {comparison.manualCorrections.map((c, i) => (
                  <div key={i} className="bg-surface-800/50 rounded-lg p-3 border border-surface-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-surface-200">{c.field}</span>
                      <span className="text-[10px] text-surface-500">{c.correctedAt}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="data-font text-xs text-surface-500 line-through">{c.previousValue}</span>
                      <span className="text-surface-600">→</span>
                      <span className="data-font text-xs text-status-override font-medium">{c.correctedValue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-override/10 text-status-override/80">修正人: {c.correctedBy}</span>
                      <span className="text-[10px] text-surface-500">{c.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={BarChart3} title="指标变化" color="text-status-processed">
            <div className="space-y-3">
              {comparison.metricChanges.map((m, i) => {
                const diff = m.current - m.previous
                const improved = diff > 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-surface-400 w-12 shrink-0">{m.name}</span>
                    <div className="flex-1">
                      <div className="relative h-5 bg-surface-800/50 rounded overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-surface-600/30 rounded"
                          style={{ width: `${m.previous * 100}%` }}
                        />
                        <div
                          className={`absolute left-0 top-0 h-full rounded transition-all ${improved ? "bg-status-processed/40" : "bg-status-override/40"}`}
                          style={{ width: `${m.current * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="data-font text-xs text-surface-500 w-12 text-right">{(m.previous * 100).toFixed(0)}{m.unit}</span>
                    <span className="text-surface-600">→</span>
                    <span className={`data-font text-xs font-medium w-12 ${improved ? "text-status-processed" : diff < 0 ? "text-status-override" : "text-surface-400"}`}>
                      {(m.current * 100).toFixed(0)}{m.unit}
                    </span>
                    <span className={`data-font text-[10px] w-8 text-right ${improved ? "text-status-processed" : diff < 0 ? "text-status-override" : "text-surface-500"}`}>
                      {diff > 0 ? "+" : ""}{(diff * 100).toFixed(0)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        </div>

        <div className="mt-8 bg-surface-900/80 border border-surface-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-surface-200 mb-4">材料溯源</h3>
          <div className="space-y-3">
            {record.materials.map((mat, i) => (
              <div key={i} className="flex items-start gap-3 bg-surface-800/40 rounded-lg p-3">
                <span
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                    mat.type === "training_log"
                      ? "bg-blue-500/15 text-blue-400"
                      : mat.type === "supplementary_note"
                        ? "bg-violet-500/15 text-violet-400"
                        : "bg-surface-600/30 text-surface-400"
                  }`}
                >
                  {mat.type === "training_log" ? "日志" : mat.type === "supplementary_note" ? "备注" : "口头"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-surface-300">{mat.description}</p>
                  {mat.revised && (
                    <div className="mt-2 bg-amber-500/5 border border-amber-500/20 rounded p-2">
                      <p className="text-[10px] text-amber-500/80 mb-1">口径变更 · {mat.revisedAt}</p>
                      <p className="text-xs text-amber-400/90">{mat.revisedContent}</p>
                    </div>
                  )}
                </div>
                {mat.revised && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    已改口径
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, color, children }: { icon: typeof FlaskConical; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-900/80 border border-surface-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="text-sm font-medium text-surface-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function CompareRow({ label, prev, curr }: { label: string; prev: string; curr: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-surface-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className="data-font text-sm text-surface-500">{prev}</span>
        <span className="text-surface-600">→</span>
        <span className="data-font text-sm text-surface-200">{curr}</span>
      </div>
    </div>
  )
}
