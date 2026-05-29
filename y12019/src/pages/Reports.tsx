import { useState, useMemo } from "react"
import { useAppStore } from "@/store"
import type { ConsistencyCheckResult } from "@/types"
import {
  Download,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

const exceptionTypeLabel: Record<string, string> = {
  missing_field: "字段缺失",
  late_work_order: "工单延迟",
  amount_mismatch: "金额不一致",
  cross_year_pending: "跨年待结转",
}
const severityLabel: Record<string, string> = {
  critical: "严重",
  warning: "警告",
  info: "提示",
}
const severityColor: Record<string, string> = {
  critical: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
}
const settlementStatusLabel: Record<string, string> = {
  pending: "待审批",
  approved: "已审批",
  confirmed: "已确认",
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const store = useAppStore()
  const [checkResult, setCheckResult] = useState<ConsistencyCheckResult | null>(null)

  const feeDetail = useMemo(() => {
    const rows: Array<{
      contractId: string
      code: string
      equipment: string
      period: string
      accrual: number
      reversal: number
      net: number
      hasException: boolean
      exceptionDesc: string
    }> = []
    const pendingExceptions = store.exceptions.filter((e) => e.status === "pending")

    for (const contract of store.contracts) {
      const equip = store.equipments.find((e) => e.id === contract.equipmentId)
      const accs = store.accrualRecords.filter((a) => a.contractId === contract.id)
      const revs = store.reversalRecords.filter((r) => r.contractId === contract.id)

      const periodMap = new Map<string, { accrual: number; reversal: number }>()
      for (const a of accs) {
        const cur = periodMap.get(a.period) ?? { accrual: 0, reversal: 0 }
        cur.accrual += a.amount
        periodMap.set(a.period, cur)
      }
      for (const r of revs) {
        const acc = store.accrualRecords.find((a) => a.id === r.accrualId)
        const period = acc?.period ?? ""
        const cur = periodMap.get(period) ?? { accrual: 0, reversal: 0 }
        cur.reversal += r.amount
        periodMap.set(period, cur)
      }

      const contractException = pendingExceptions.find((e) => e.relatedId === contract.id)
      const sorted = Array.from(periodMap.entries()).sort(([a], [b]) => a.localeCompare(b))
      for (const [period, { accrual, reversal }] of sorted) {
        rows.push({
          contractId: contract.id,
          code: contract.code,
          equipment: equip?.name ?? contract.equipmentId,
          period,
          accrual,
          reversal,
          net: accrual - reversal,
          hasException: !!contractException,
          exceptionDesc: contractException?.description ?? "",
        })
      }
    }
    return rows
  }, [store.contracts, store.equipments, store.accrualRecords, store.reversalRecords, store.exceptions])

  const totals = useMemo(
    () => ({
      accrual: feeDetail.reduce((s, r) => s + r.accrual, 0),
      reversal: feeDetail.reduce((s, r) => s + r.reversal, 0),
      net: feeDetail.reduce((s, r) => s + r.net, 0),
    }),
    [feeDetail],
  )

  const exportBlocked = checkResult ? !checkResult.passed : true

  const handleCheck = () => setCheckResult(store.runConsistencyCheck())

  const exportFeeDetail = () => {
    const header = "合同编号,设备,期间,预提金额,冲回金额,净额,异常标注"
    const rows = feeDetail.map(
      (r) =>
        `${r.code},${r.equipment},${r.period},${r.accrual},${r.reversal},${r.net},${r.hasException ? r.exceptionDesc : ""}`,
    )
    downloadCSV("费用明细表.csv", [header, ...rows].join("\n"))
  }

  const exportExceptions = () => {
    const header = "异常类型,关联对象,描述,严重度,状态,修正建议"
    const rows = store.exceptions.map(
      (e) =>
        `${exceptionTypeLabel[e.type] ?? e.type},${e.relatedId},${e.description},${severityLabel[e.severity] ?? e.severity},${e.status === "pending" ? "待处理" : e.status === "resolved" ? "已处理" : "已忽略"},${e.suggestion.description}`,
    )
    downloadCSV("异常说明表.csv", [header, ...rows].join("\n"))
  }

  const exportCrossYear = () => {
    const header = "合同编号,本年金额,次年金额,结转状态,审批信息"
    const rows = store.crossYearSettlements.map((s) => {
      const contract = store.contracts.find((c) => c.id === s.contractId)
      const approval = s.approvalInfo
        ? `${s.approvalInfo.approver} ${s.approvalInfo.date} ${s.approvalInfo.note}`
        : ""
      return `${contract?.code ?? s.contractId},${s.currentYearAmount},${s.nextYearAmount},${settlementStatusLabel[s.status] ?? s.status},${approval}`
    })
    downloadCSV("跨年结转表.csv", [header, ...rows].join("\n"))
  }

  const exportAll = () => {
    exportFeeDetail()
    exportExceptions()
    exportCrossYear()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield size={20} /> 一致性校验
          </h2>
          <button
            onClick={handleCheck}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            运行一致性校验
          </button>
        </div>
        {checkResult && (
          <div className="space-y-2">
            {checkResult.checks.map((c, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-3 rounded border ${
                  c.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                {c.passed ? (
                  <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                )}
                <div className="text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-500 ml-2">
                    期望 {c.expected.toLocaleString()} / 实际 {c.actual.toLocaleString()}
                  </span>
                  <p className="text-gray-600 mt-0.5">{c.detail}</p>
                </div>
              </div>
            ))}
            <div
              className={`flex items-center gap-2 p-3 rounded font-medium text-sm ${
                checkResult.passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {checkResult.passed ? (
                <CheckCircle size={18} />
              ) : (
                <XCircle size={18} />
              )}
              {checkResult.passed ? "全部校验通过，可正常导出" : "存在未通过校验，导出功能已锁定"}
            </div>
          </div>
        )}
      </div>

      {exportBlocked && checkResult && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm">
          <AlertTriangle size={18} />
          一致性校验未通过，请修正异常后再导出报表
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-bold mb-3">费用明细表</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left border">合同编号</th>
                <th className="px-3 py-2 text-left border">设备</th>
                <th className="px-3 py-2 text-left border">期间</th>
                <th className="px-3 py-2 text-right border">预提金额</th>
                <th className="px-3 py-2 text-right border">冲回金额</th>
                <th className="px-3 py-2 text-right border">净额</th>
                <th className="px-3 py-2 text-center border">异常标注</th>
              </tr>
            </thead>
            <tbody>
              {feeDetail.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 border">{r.code}</td>
                  <td className="px-3 py-2 border">{r.equipment}</td>
                  <td className="px-3 py-2 border">{r.period}</td>
                  <td className="px-3 py-2 text-right border">{r.accrual.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right border">{r.reversal.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right border">{r.net.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center border">
                    {r.hasException ? (
                      <span title={r.exceptionDesc} className="inline-flex items-center justify-center text-red-600 cursor-help">
                        <AlertTriangle size={16} />
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-medium">
                <td className="px-3 py-2 border" colSpan={3}>合计</td>
                <td className="px-3 py-2 text-right border">{totals.accrual.toLocaleString()}</td>
                <td className="px-3 py-2 text-right border">{totals.reversal.toLocaleString()}</td>
                <td className="px-3 py-2 text-right border">{totals.net.toLocaleString()}</td>
                <td className="px-3 py-2 border" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-bold mb-3">异常说明表</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left border">异常类型</th>
                <th className="px-3 py-2 text-left border">关联对象</th>
                <th className="px-3 py-2 text-left border">描述</th>
                <th className="px-3 py-2 text-left border">严重度</th>
                <th className="px-3 py-2 text-left border">状态</th>
                <th className="px-3 py-2 text-left border">修正建议</th>
              </tr>
            </thead>
            <tbody>
              {store.exceptions.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 border">{exceptionTypeLabel[e.type] ?? e.type}</td>
                  <td className="px-3 py-2 border">{e.relatedId}</td>
                  <td className="px-3 py-2 border">{e.description}</td>
                  <td className={`px-3 py-2 border ${severityColor[e.severity] ?? ""}`}>
                    {severityLabel[e.severity] ?? e.severity}
                  </td>
                  <td className="px-3 py-2 border">
                    {e.status === "pending" ? "待处理" : e.status === "resolved" ? "已处理" : "已忽略"}
                  </td>
                  <td className="px-3 py-2 border">{e.suggestion.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-bold mb-3">跨年结转表</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left border">合同编号</th>
                <th className="px-3 py-2 text-right border">本年金额</th>
                <th className="px-3 py-2 text-right border">次年金额</th>
                <th className="px-3 py-2 text-left border">结转状态</th>
                <th className="px-3 py-2 text-left border">审批信息</th>
              </tr>
            </thead>
            <tbody>
              {store.crossYearSettlements.map((s) => {
                const contract = store.contracts.find((c) => c.id === s.contractId)
                return (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 border">{contract?.code ?? s.contractId}</td>
                    <td className="px-3 py-2 text-right border">{s.currentYearAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right border">{s.nextYearAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 border">{settlementStatusLabel[s.status] ?? s.status}</td>
                    <td className="px-3 py-2 border">
                      {s.approvalInfo
                        ? `${s.approvalInfo.approver} ${s.approvalInfo.date} ${s.approvalInfo.note}`
                        : "-"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportFeeDetail}
          disabled={exportBlocked}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Download size={16} /> 导出费用明细
        </button>
        <button
          onClick={exportExceptions}
          disabled={exportBlocked}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Download size={16} /> 导出异常说明
        </button>
        <button
          onClick={exportCrossYear}
          disabled={exportBlocked}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Download size={16} /> 导出跨年结转
        </button>
        <button
          onClick={exportAll}
          disabled={exportBlocked}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Download size={16} /> 导出全部
        </button>
      </div>
    </div>
  )
}
