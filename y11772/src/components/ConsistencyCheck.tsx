import { useState, useMemo } from "react"
import { AlertTriangle, AlertCircle, Wrench, CheckCircle2 } from "lucide-react"
import type { CashFlowItem } from "@/types"
import { useStore } from "@/store/useStore"

type Severity = "critical" | "warning"

interface ConsistencyIssue {
  id: string
  itemId: string
  description: string
  severity: Severity
  suggestedAction: string
  fixField: string
  fixOldValue: string | number | null
  fixNewValue: string | number | null
}

function getCurrentValue(item: CashFlowItem, field: string): string | number | null {
  if (field === "amount") return item.amount
  if (field === "dueDate") return item.dueDate
  if (field === "confidence") return item.confidence
  if (field === "isCurrencyConverted") return item.isCurrencyConverted ? 1 : 0
  return null
}

function scanInconsistencies(items: CashFlowItem[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const now = new Date()

  items.forEach((item) => {
    item.auditTrail.forEach((entry) => {
      const currentVal = getCurrentValue(item, entry.field)
      if (currentVal !== null && String(currentVal) !== String(entry.newValue)) {
        issues.push({
          id: `inc-${item.id}-${entry.id}`,
          itemId: item.id,
          description: `字段 "${entry.field}" 审计记录新值 (${entry.newValue}) 与当前值 (${currentVal}) 不一致`,
          severity: "critical",
          suggestedAction: `将 ${entry.field} 更新为审计记录的新值`,
          fixField: entry.field,
          fixOldValue: currentVal,
          fixNewValue: entry.newValue,
        })
      }
    })

    if (item.amountInBaseCurrency === null && item.isCurrencyConverted) {
      issues.push({
        id: `inc-currency-${item.id}`,
        itemId: item.id,
        description: `标记为已换算但基准币种金额为空`,
        severity: "critical",
        suggestedAction: "重新执行币种换算或修正标记",
        fixField: "isCurrencyConverted",
        fixOldValue: 1,
        fixNewValue: 0,
      })
    }

    if (new Date(item.dueDate) < now) {
      const hasFlag = item.auditTrail.some(
        (e) => e.field === "dueDate" && e.reason.includes("日期错位")
      )
      if (!hasFlag) {
        issues.push({
          id: `inc-date-${item.id}`,
          itemId: item.id,
          description: `到期日 ${item.dueDate} 早于当前日期，缺少 date_misalignment 风险标记`,
          severity: "warning",
          suggestedAction: "添加日期错位风险标记或更新到期日",
          fixField: "dueDate",
          fixOldValue: item.dueDate,
          fixNewValue: now.toISOString().slice(0, 10),
        })
      }
    }
  })

  return issues
}

export function ConsistencyCheck() {
  const items = useStore((s) => s.items)
  const applyCorrection = useStore((s) => s.applyCorrection)
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())

  const issues = useMemo(() => scanInconsistencies(items), [items])

  const handleFix = (issue: ConsistencyIssue) => {
    applyCorrection(
      issue.itemId,
      issue.fixField,
      issue.fixOldValue,
      issue.fixNewValue,
      "一致性修复：自动修正",
      "系统"
    )
    setFixedIds((prev) => new Set(prev).add(issue.id))
  }

  const criticalCount = issues.filter((i) => i.severity === "critical" && !fixedIds.has(i.id)).length
  const warningCount = issues.filter((i) => i.severity === "warning" && !fixedIds.has(i.id)).length
  const totalUnfixed = criticalCount + warningCount

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className={`px-4 py-3 rounded-lg border ${
            totalUnfixed > 0
              ? "bg-red-500/10 border-red-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          <span className={`text-lg font-semibold ${totalUnfixed > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {totalUnfixed > 0 ? `发现 ${totalUnfixed} 个一致性问题` : "数据一致性检查通过"}
          </span>
          {totalUnfixed > 0 && (
            <div className="flex gap-3 mt-1 text-xs">
              {criticalCount > 0 && (
                <span className="text-red-400">{criticalCount} 严重</span>
              )}
              {warningCount > 0 && (
                <span className="text-orange-400">{warningCount} 警告</span>
              )}
            </div>
          )}
        </div>
      </div>

      {issues.length === 0 && (
        <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
          <CheckCircle2 className="w-5 h-5" />
          <span>所有数据一致性检查已通过</span>
        </div>
      )}

      <div className="space-y-3">
        {issues.map((issue) => {
          const isFixed = fixedIds.has(issue.id)
          const isCritical = issue.severity === "critical"

          return (
            <div
              key={issue.id}
              className={`p-4 rounded-lg border transition-colors ${
                isFixed
                  ? "bg-white/[0.02] border-white/5 opacity-50"
                  : isCritical
                  ? "bg-red-500/[0.06] border-red-500/20"
                  : "bg-orange-500/[0.06] border-orange-500/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {isCritical ? (
                    <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isFixed ? "text-white/20" : "text-red-400"}`} />
                  ) : (
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${isFixed ? "text-white/20" : "text-orange-400"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#4fc3f7] font-mono text-xs">{issue.itemId}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isCritical
                            ? "bg-red-500/20 text-red-400"
                            : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {isCritical ? "严重" : "警告"}
                      </span>
                      {isFixed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          已修复
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/70 mb-1.5">{issue.description}</p>
                    <p className="text-xs text-white/40">
                      建议操作：{issue.suggestedAction}
                    </p>
                  </div>
                </div>
                {!isFixed && (
                  <button
                    onClick={() => handleFix(issue)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#4fc3f7]/10 text-[#4fc3f7] border border-[#4fc3f7]/20 hover:bg-[#4fc3f7]/20 transition-colors"
                  >
                    <Wrench className="w-3 h-3" />
                    修复
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
