import { useState, useMemo } from "react"
import { useAppStore } from "@/store"
import type { WorkOrder } from "@/types"
import {
  Calculator, RotateCcw, Plus, Ban, RefreshCw,
  ChevronDown, ChevronRight, FileText,
} from "lucide-react"

const woTypeLabel: Record<string, string> = {
  routine: "日常", fault: "故障", fault_supplement: "故障追加",
}

export default function Accrual() {
  const {
    contracts, accrualRecords, reversalRecords, workOrders, contractVersions, currentPeriod,
    recalcAccrual, terminateContract, addWorkOrder,
  } = useAppStore()

  const [groupBy, setGroupBy] = useState<"contract" | "period">("contract")
  const [expandedBasis, setExpandedBasis] = useState<string | null>(null)
  const [faultForm, setFaultForm] = useState({ contractId: "", amount: "", orderDate: "" })
  const [termForm, setTermForm] = useState({ contractId: "", terminateDate: "" })

  const activeContracts = useMemo(() => contracts.filter((c) => c.status === "active"), [contracts])

  const periodRecords = useMemo(
    () => accrualRecords.filter((r) => r.period === currentPeriod),
    [accrualRecords, currentPeriod],
  )

  const faultOrders = useMemo(
    () => workOrders.filter((w) => w.type === "fault" || w.type === "fault_supplement"),
    [workOrders],
  )

  const termReversals = useMemo(
    () => reversalRecords.filter((r) => r.type === "early_termination"),
    [reversalRecords],
  )

  const versionAffected = useMemo(() => {
    return contractVersions.map((cv) => {
      const affected = accrualRecords.filter(
        (a) => a.contractId === cv.contractId && a.version !== cv.version,
      )
      const woAffected = workOrders.filter((w) => w.contractId === cv.contractId)
      const revAffected = reversalRecords.filter((r) => r.contractId === cv.contractId)
      return { version: cv, accruals: affected, workOrders: woAffected, reversals: revAffected }
    }).filter((v) => v.accruals.length > 0)
  }, [contractVersions, accrualRecords, workOrders, reversalRecords])

  const groupedRecords = useMemo(() => {
    const map = new Map<string, typeof accrualRecords>()
    periodRecords.forEach((r) => {
      const key = groupBy === "contract" ? r.contractId : r.period
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    })
    return map
  }, [periodRecords, groupBy])

  const getContractCode = (id: string) => contracts.find((c) => c.id === id)?.code ?? id

  const previewReversal = useMemo(() => {
    const c = contracts.find((ct) => ct.id === termForm.contractId)
    if (!c || !termForm.terminateDate || !c.monthlyAmount) return null
    const origEnd = new Date(c.endDate)
    const termDate = new Date(termForm.terminateDate)
    const months = Math.max(0,
      (origEnd.getFullYear() - termDate.getFullYear()) * 12 + (origEnd.getMonth() - termDate.getMonth()),
    )
    return { months, amount: months * c.monthlyAmount }
  }, [contracts, termForm])

  const handleCalcCurrent = () => {
    activeContracts.forEach((c) => recalcAccrual(c.id, currentPeriod))
  }

  const handleCalcAll = () => {
    const periods = [...new Set(accrualRecords.map((r) => r.period))]
    activeContracts.forEach((c) => periods.forEach((p) => recalcAccrual(c.id, p)))
  }

  const handleFaultSubmit = () => {
    if (!faultForm.contractId || !faultForm.amount || !faultForm.orderDate) return
    const wo: WorkOrder = {
      id: `wo-${Date.now()}`, code: `WO-${Date.now()}`, contractId: faultForm.contractId,
      equipmentId: contracts.find((c) => c.id === faultForm.contractId)?.equipmentId ?? "",
      type: "fault_supplement", amount: Number(faultForm.amount),
      orderDate: faultForm.orderDate, receivedDate: faultForm.orderDate,
      isLateArrival: false, status: "pending",
    }
    addWorkOrder(wo)
    recalcAccrual(faultForm.contractId, currentPeriod)
    setFaultForm({ contractId: "", amount: "", orderDate: "" })
  }

  const handleTerminate = () => {
    if (!termForm.contractId || !termForm.terminateDate) return
    terminateContract(termForm.contractId, termForm.terminateDate)
    setTermForm({ contractId: "", terminateDate: "" })
  }

  const handleRefreshLinkage = () => {
    versionAffected.forEach(({ version: cv }) => {
      cv.contractId && recalcAccrual(cv.contractId, currentPeriod)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">预提计算</h2>
        <div className="flex items-center gap-3">
          <span className="rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            当前期间: {currentPeriod}
          </span>
          <button onClick={handleCalcCurrent}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            <Calculator size={14} /> 计算预提
          </button>
          <button onClick={handleCalcAll}
            className="flex items-center gap-1 rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            <RotateCcw size={14} /> 重算全部
          </button>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="font-medium">预提记录</span>
          <div className="flex gap-1 rounded bg-gray-100 p-0.5">
            <button onClick={() => setGroupBy("contract")}
              className={`rounded px-2 py-0.5 text-xs ${groupBy === "contract" ? "bg-white shadow" : ""}`}>
              按合同
            </button>
            <button onClick={() => setGroupBy("period")}
              className={`rounded px-2 py-0.5 text-xs ${groupBy === "period" ? "bg-white shadow" : ""}`}>
              按期间
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">合同编号</th>
              <th className="px-4 py-2 text-left">期间</th>
              <th className="px-4 py-2 text-right">预提金额</th>
              <th className="px-4 py-2 text-left">计算依据</th>
              <th className="px-4 py-2 text-center">版本</th>
              <th className="px-4 py-2 text-left">创建日期</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(groupedRecords.entries()).map(([, records]) => (
              records.map((r, i) => (
                <tr key={r.id} className={i === 0 ? "border-t" : ""}>
                  <td className="px-4 py-2">{getContractCode(r.contractId)}</td>
                  <td className="px-4 py-2">{r.period}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {r.amount.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => setExpandedBasis(expandedBasis === r.id ? null : r.id)}
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                      {expandedBasis === r.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span className="truncate max-w-[180px]">{r.calculationBasis}</span>
                    </button>
                    {expandedBasis === r.id && (
                      <div className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600">
                        {r.calculationBasis}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">{r.version}</td>
                  <td className="px-4 py-2">{r.createdAt}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
        {periodRecords.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">当前期间无预提记录</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded border bg-white">
          <div className="border-b px-4 py-2 font-medium">故障追加</div>
          <div className="p-4 space-y-3">
            <select value={faultForm.contractId}
              onChange={(e) => setFaultForm((f) => ({ ...f, contractId: e.target.value }))}
              className="w-full rounded border px-2 py-1.5 text-sm">
              <option value="">选择合同</option>
              {activeContracts.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
            <input type="number" placeholder="追加金额" value={faultForm.amount}
              onChange={(e) => setFaultForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded border px-2 py-1.5 text-sm" />
            <input type="date" value={faultForm.orderDate}
              onChange={(e) => setFaultForm((f) => ({ ...f, orderDate: e.target.value }))}
              className="w-full rounded border px-2 py-1.5 text-sm" />
            <button onClick={handleFaultSubmit}
              className="flex w-full items-center justify-center gap-1 rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700">
              <Plus size={14} /> 提交追加
            </button>
          </div>
          <div className="border-t px-4 py-2">
            <div className="text-xs font-medium text-gray-500 mb-1">已有故障工单</div>
            {faultOrders.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-1 text-sm">
                <span>{getContractCode(w.contractId)}</span>
                <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700">
                  {woTypeLabel[w.type]}</span>
                <span className="font-mono">{w.amount.toLocaleString()}</span>
                <span className="text-xs text-gray-400">{w.orderDate}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border bg-white">
          <div className="border-b px-4 py-2 font-medium">提前终止</div>
          <div className="p-4 space-y-3">
            <select value={termForm.contractId}
              onChange={(e) => setTermForm((f) => ({ ...f, contractId: e.target.value }))}
              className="w-full rounded border px-2 py-1.5 text-sm">
              <option value="">选择合同</option>
              {activeContracts.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
            <input type="date" value={termForm.terminateDate}
              onChange={(e) => setTermForm((f) => ({ ...f, terminateDate: e.target.value }))}
              className="w-full rounded border px-2 py-1.5 text-sm" />
            {previewReversal && (
              <div className="rounded bg-red-50 p-2 text-sm">
                <span className="text-red-700">冲回预览: </span>
                <span className="font-mono">{previewReversal.amount.toLocaleString()}</span>
                <span className="text-red-600"> 元 ({previewReversal.months}个月)</span>
              </div>
            )}
            <button onClick={handleTerminate}
              className="flex w-full items-center justify-center gap-1 rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">
              <Ban size={14} /> 确认终止
            </button>
          </div>
          <div className="border-t px-4 py-2">
            <div className="text-xs font-medium text-gray-500 mb-1">已有冲回记录</div>
            {termReversals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1 text-sm">
                <span>{getContractCode(r.contractId)}</span>
                <span className="font-mono text-red-600">{r.amount.toLocaleString()}</span>
                <span className="text-xs text-gray-400 max-w-[200px] truncate">{r.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="font-medium">版本联动</span>
          <button onClick={handleRefreshLinkage}
            className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700">
            <RefreshCw size={12} /> 刷新联动
          </button>
        </div>
        {versionAffected.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">无版本变更需要联动</div>
        ) : (
          <div className="p-4 space-y-3">
            {versionAffected.map(({ version: cv, accruals, workOrders: wos, reversals: revs }) => (
              <div key={cv.id} className="rounded bg-indigo-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-indigo-800">
                  <FileText size={14} />
                  {getContractCode(cv.contractId)} → v{cv.version} (生效: {cv.effectiveDate})
                </div>
                <div className="mt-1 text-xs text-indigo-600">
                  受影响预提: {accruals.length} 条 | 工单: {wos.length} 条 | 冲回: {revs.length} 条
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
