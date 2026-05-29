import { useState, useMemo } from "react"
import { useAppStore } from "@/store"
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle, ChevronDown, ChevronRight, Zap } from "lucide-react"
import type { ExceptionType } from "@/types"

const SEVERITY_BORDER: Record<string, string> = { critical: "border-l-red-500", warning: "border-l-amber-500", info: "border-l-blue-500" }
const SEVERITY_BADGE: Record<string, string> = { critical: "bg-red-100 text-red-700", warning: "bg-amber-100 text-amber-700", info: "bg-blue-100 text-blue-700" }
const SEVERITY_ICON: Record<string, typeof AlertTriangle> = { critical: AlertCircle, warning: AlertTriangle, info: Info }
const SEVERITY_LABEL: Record<string, string> = { critical: "严重", warning: "警告", info: "提示" }
const STATUS_BADGE: Record<string, string> = { pending: "bg-amber-100 text-amber-700", resolved: "bg-green-100 text-green-700", ignored: "bg-gray-100 text-gray-500" }
const STATUS_ICON: Record<string, typeof CheckCircle> = { pending: AlertTriangle, resolved: CheckCircle, ignored: XCircle }
const STATUS_LABEL: Record<string, string> = { pending: "待处理", resolved: "已解决", ignored: "已忽略" }
const TYPE_TABS: { key: ExceptionType | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "missing_field", label: "缺失字段" },
  { key: "late_work_order", label: "晚到工单" },
  { key: "amount_mismatch", label: "金额不一致" },
  { key: "cross_year_pending", label: "跨年待确认" },
]
const TYPE_BADGE: Record<string, string> = {
  missing_field: "bg-purple-100 text-purple-700",
  late_work_order: "bg-orange-100 text-orange-700",
  amount_mismatch: "bg-rose-100 text-rose-700",
  cross_year_pending: "bg-teal-100 text-teal-700",
}
const TYPE_LABEL: Record<string, string> = {
  missing_field: "缺失字段",
  late_work_order: "晚到工单",
  amount_mismatch: "金额不一致",
  cross_year_pending: "跨年待确认",
}
const ACTION_LABEL: Record<string, string> = {
  missing_field: "一键补全",
  late_work_order: "补录工单",
  amount_mismatch: "重新核对",
  cross_year_pending: "确认结转",
}

export default function Exceptions() {
  const { exceptions, updateException, fillContractAmount, supplementWorkOrder, recalcAccrual, confirmCrossYear } = useAppStore()
  const [tab, setTab] = useState<ExceptionType | "all">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const severityStats = useMemo(() => ({
    critical: exceptions.filter((e) => e.severity === "critical").length,
    warning: exceptions.filter((e) => e.severity === "warning").length,
    info: exceptions.filter((e) => e.severity === "info").length,
  }), [exceptions])

  const statusStats = useMemo(() => ({
    pending: exceptions.filter((e) => e.status === "pending").length,
    resolved: exceptions.filter((e) => e.status === "resolved").length,
    ignored: exceptions.filter((e) => e.status === "ignored").length,
  }), [exceptions])

  const filtered = useMemo(() =>
    tab === "all" ? exceptions : exceptions.filter((e) => e.type === tab),
    [exceptions, tab],
  )

  const handleAction = (ex: typeof exceptions[number]) => {
    const p = ex.suggestion.params
    if (ex.type === "missing_field") fillContractAmount(p.contractId as string, p.annual as number, p.monthly as number)
    else if (ex.type === "late_work_order") supplementWorkOrder(p.workOrderId as string, p.targetPeriod as string)
    else if (ex.type === "amount_mismatch") recalcAccrual(p.contractId as string, p.period as string)
    else if (ex.type === "cross_year_pending") confirmCrossYear(p.settlementId as string)
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-6 rounded-lg bg-white shadow p-4">
        <div className="flex gap-4">
          <StatChip color="bg-red-500" label="严重" value={severityStats.critical} />
          <StatChip color="bg-amber-500" label="警告" value={severityStats.warning} />
          <StatChip color="bg-blue-500" label="提示" value={severityStats.info} />
        </div>
        <div className="mx-2 w-px bg-gray-200" />
        <div className="flex gap-4">
          <StatChip color="bg-amber-400" label="待处理" value={statusStats.pending} />
          <StatChip color="bg-green-500" label="已解决" value={statusStats.resolved} />
          <StatChip color="bg-gray-400" label="已忽略" value={statusStats.ignored} />
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-white shadow p-1">
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-slate-800 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((ex) => {
          const SevIcon = SEVERITY_ICON[ex.severity]
          const StatusIcon = STATUS_ICON[ex.status]
          const isExpanded = expandedId === ex.id

          return (
            <div key={ex.id} className={`rounded-lg bg-white shadow border-l-4 ${SEVERITY_BORDER[ex.severity]}`}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : ex.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                <SevIcon className={`h-4 w-4 shrink-0 ${ex.severity === "critical" ? "text-red-500" : ex.severity === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[ex.type]}`}>{TYPE_LABEL[ex.type]}</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{ex.description}</span>
                <span className="text-xs text-gray-400">{ex.createdAt}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ex.status]}`}>
                  <StatusIcon className="h-3 w-3" />
                  {STATUS_LABEL[ex.status]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[ex.severity]}`}>{SEVERITY_LABEL[ex.severity]}</span>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 ml-7">
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{ex.suggestion.description}</span>
                    </div>
                    {ex.status === "pending" && (
                      <div className="mt-3 flex items-center gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(ex) }}
                          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
                        >
                          {ACTION_LABEL[ex.type]}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateException(ex.id, { status: "ignored" }) }}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          手动处理
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">暂无异常记录</p>}
      </div>
    </div>
  )
}

function StatChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-mono text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}
