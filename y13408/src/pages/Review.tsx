import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Save, AlertCircle, Clock, User, Tag, Shield } from "lucide-react"
import { motion } from "framer-motion"
import { useReviewStore } from "@/store/useReviewStore"
import type { BoundaryType, ReviewStatus, AnomalySeverity } from "@/types"

const boundaryLabels: Record<BoundaryType, { label: string; color: string }> = {
  normal: { label: "正常", color: "bg-emerald-500/20 text-emerald-400" },
  empty_set: { label: "空集合", color: "bg-red-500/20 text-red-400" },
  zero_value: { label: "零值", color: "bg-amber-500/20 text-amber-400" },
  extrapolation_overflow: { label: "外推越界", color: "bg-purple-500/20 text-purple-400" },
}

const statusLabels: Record<ReviewStatus, { label: string; color: string }> = {
  pending: { label: "待复核", color: "bg-amber-500/20 text-amber-400" },
  confirmed: { label: "已确认", color: "bg-emerald-500/20 text-emerald-400" },
  overridden: { label: "已改判", color: "bg-blue-500/20 text-blue-400" },
}

const severityConfig: Record<AnomalySeverity, { label: string; color: string }> = {
  warning: { label: "警告", color: "bg-amber-500/20 text-amber-400" },
  critical: { label: "严重", color: "bg-red-500/20 text-red-400" },
}

function formatCNDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#1e2440] last:border-0">
      <span className="text-gray-400 text-sm w-24 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-gray-100 flex-1">{children}</div>
    </div>
  )
}

export default function Review() {
  const { id } = useParams<{ id: string }>()
  const sampleId = id ?? ""
  const sample = useReviewStore((s) => s.samples.find((x) => x.id === sampleId))
  const addOverride = useReviewStore((s) => s.addOverride)
  const allOverrides = useReviewStore((s) => s.overrideRecords)
  const allAnomalies = useReviewStore((s) => s.anomalies)
  const overrides = allOverrides.filter((o) => o.sampleId === sampleId)
  const anomalies = allAnomalies.filter((a) => a.sampleId === sampleId)

  const [newValue, setNewValue] = useState("")
  const [reason, setReason] = useState("")
  const [operator, setOperator] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  if (!sample) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle size={40} className="text-gray-500" />
        <p className="text-gray-400 text-lg">未找到样本记录</p>
        <Link to="/" className="text-amber-500 text-sm hover:underline">← 返回看板</Link>
      </div>
    )
  }

  const bt = boundaryLabels[sample.boundaryType]
  const st = statusLabels[sample.reviewStatus]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const numVal = Number(newValue)
    if (!newValue.trim() || !reason.trim() || !operator.trim()) {
      setError("所有字段均为必填")
      return
    }
    if (isNaN(numVal)) {
      setError("改判值必须为有效数字")
      return
    }
    addOverride(sampleId, numVal, reason.trim(), operator.trim())
    setNewValue("")
    setReason("")
    setOperator("")
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-500 transition-colors">
        <ArrowLeft size={16} />
        返回看板
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-[#151a2e] rounded-xl border border-[#1e2440] p-6"
          >
            <h2 className="text-lg font-semibold text-gray-100 mb-4" style={{ fontFamily: "'Source Serif 4', serif" }}>
              样本详情
            </h2>
            <div>
              <FieldRow label="样本ID"><Tag size={14} className="inline mr-1.5 text-gray-500" />{sample.id}</FieldRow>
              <FieldRow label="批次">{sample.batchId}</FieldRow>
              <FieldRow label="参数名">{sample.parameterName}</FieldRow>
              <FieldRow label="原始值">
                {sample.originalValue === null ? (
                  <span className="text-red-400">∅ 空集合</span>
                ) : sample.originalValue === 0 ? (
                  <span className="text-amber-400">0 (零值待确认)</span>
                ) : (
                  sample.originalValue
                )}
              </FieldRow>
              <FieldRow label="换算值">
                {sample.convertedValue ?? <span className="text-red-400">∅</span>}
                {sample.convertedValue !== null && sample.displayUnit && (
                  <span className="text-gray-400 ml-1">{sample.displayUnit}</span>
                )}
              </FieldRow>
              <FieldRow label="换算因子">
                {sample.conversionFactor === 1 ? (
                  <span className="text-gray-400">无需换算</span>
                ) : (
                  <span>×{sample.conversionFactor}</span>
                )}
              </FieldRow>
              <FieldRow label="边界类型"><Badge label={bt.label} color={bt.color} /></FieldRow>
              <FieldRow label="复核状态"><Badge label={st.label} color={st.color} /></FieldRow>
              <FieldRow label="来源材料ID">{sample.sourceMaterialId}</FieldRow>
              <FieldRow label="影响结论ID">{sample.affectedConclusionId}</FieldRow>
            </div>
            {sample.supplementNote && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                {sample.supplementNote}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-[#151a2e] rounded-xl border border-[#1e2440] p-6"
          >
            <h2 className="text-lg font-semibold text-gray-100 mb-4" style={{ fontFamily: "'Source Serif 4', serif" }}>
              改判表单
            </h2>
            {sample.reviewStatus === "overridden" && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
                此样本已有改判记录，再次改判将追加历史
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
            )}
            {submitted && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                改判提交成功
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">改判值</label>
                <input
                  type="number"
                  step="any"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="输入新的换算值"
                  className="w-full bg-[#0f1219] border border-[#1e2440] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">改判原因</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="说明改判理由"
                  rows={3}
                  className="w-full bg-[#0f1219] border border-[#1e2440] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">操作人</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="输入操作人姓名"
                  className="w-full bg-[#0f1219] border border-[#1e2440] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm transition-colors"
              >
                <Save size={16} />
                提交改判
              </button>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="bg-[#151a2e] rounded-xl border border-[#1e2440] p-6"
          >
            <h2 className="text-lg font-semibold text-gray-100 mb-4" style={{ fontFamily: "'Source Serif 4', serif" }}>
              改判历史
            </h2>
            {overrides.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">暂无改判记录</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[9px] top-3 bottom-3 w-px bg-[#1e2440]" />
                <div className="space-y-6">
                  {overrides.slice().reverse().map((ovr, i) => (
                    <div key={ovr.id} className="relative pl-7">
                      <div className={`absolute left-0 top-1.5 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center ${
                        i === 0
                          ? "border-amber-500 bg-amber-500/20"
                          : "border-[#1e2440] bg-[#0f1219]"
                      }`}>
                        {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                        <Clock size={12} />
                        {formatCNDate(ovr.createdAt)}
                      </div>
                      <div className="text-sm text-gray-300 mb-1 flex items-center gap-1.5">
                        <User size={12} className="text-gray-500" />
                        {ovr.operator}
                      </div>
                      <div className="text-sm text-gray-200 mb-1">
                        <span className="text-gray-400">{ovr.previousValue ?? "∅"}</span>
                        <span className="mx-2 text-amber-500">→</span>
                        <span className="text-amber-400 font-medium">{ovr.newValue ?? "∅"}</span>
                      </div>
                      <p className="text-xs text-gray-400">{ovr.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {anomalies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="bg-[#151a2e] rounded-xl border border-[#1e2440] p-6"
            >
              <h3 className="text-base font-semibold text-gray-100 mb-3 flex items-center gap-2" style={{ fontFamily: "'Source Serif 4', serif" }}>
                <Shield size={16} className="text-red-400" />
                关联异常
              </h3>
              <div className="space-y-3">
                {anomalies.map((a) => {
                  const sev = severityConfig[a.severity]
                  return (
                    <div key={a.id} className="p-3 rounded-lg bg-[#0f1219] border border-[#1e2440]">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge label={sev.label} color={sev.color} />
                        <span className="text-xs text-gray-500">{a.id}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">{a.triggerMaterialDesc}</p>
                      <p className="text-xs text-gray-500">影响结论：{a.affectedConclusionDesc}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
