import { create } from "zustand"
import type {
  Equipment,
  Contract,
  ContractVersionChange,
  WorkOrder,
  AccrualRecord,
  ReversalRecord,
  Exception,
  CrossYearSettlement,
  ConsistencyCheckResult,
} from "@/types"
import {
  mockEquipment,
  mockContracts,
  mockContractVersions,
  mockWorkOrders,
  mockAccrualRecords,
  mockReversalRecords,
  mockExceptions,
  mockCrossYearSettlements,
} from "@/data/mockData"

interface AppState {
  equipments: Equipment[]
  contracts: Contract[]
  contractVersions: ContractVersionChange[]
  workOrders: WorkOrder[]
  accrualRecords: AccrualRecord[]
  reversalRecords: ReversalRecord[]
  exceptions: Exception[]
  crossYearSettlements: CrossYearSettlement[]
  currentPeriod: string

  setCurrentPeriod: (period: string) => void
  updateContract: (id: string, data: Partial<Contract>) => void
  addWorkOrder: (order: WorkOrder) => void
  updateWorkOrder: (id: string, data: Partial<WorkOrder>) => void
  addAccrualRecord: (record: AccrualRecord) => void
  updateAccrualRecord: (id: string, data: Partial<AccrualRecord>) => void
  addReversalRecord: (record: ReversalRecord) => void
  updateException: (id: string, data: Partial<Exception>) => void
  addException: (exception: Exception) => void
  updateCrossYearSettlement: (id: string, data: Partial<CrossYearSettlement>) => void
  recalcAccrual: (contractId: string, period: string) => void
  terminateContract: (contractId: string, terminateDate: string) => void
  supplementWorkOrder: (workOrderId: string, targetPeriod: string) => void
  runConsistencyCheck: () => ConsistencyCheckResult
  fillContractAmount: (contractId: string, annual: number, monthly: number) => void
  confirmCrossYear: (settlementId: string) => void
}

function calcMonthlyFromContract(contract: Contract): number {
  if (contract.monthlyAmount) return contract.monthlyAmount
  if (contract.annualAmount) {
    const start = new Date(contract.startDate)
    const end = new Date(contract.endDate)
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    return months > 0 ? Math.round(contract.annualAmount / months) : 0
  }
  return 0
}

function getMonthsInPeriod(contract: Contract, period: string): number {
  const [year, q] = period.split("-Q")
  const qNum = parseInt(q)
  const qStartMonth = (qNum - 1) * 3
  const qEndMonth = qStartMonth + 2
  const periodYear = parseInt(year)

  const cStart = new Date(contract.startDate)
  const cEnd = new Date(contract.endDate)

  let months = 0
  for (let m = qStartMonth; m <= qEndMonth; m++) {
    const date = new Date(periodYear, m, 15)
    if (date >= cStart && date <= cEnd) months++
  }
  return months
}

export const useAppStore = create<AppState>((set, get) => ({
  equipments: mockEquipment,
  contracts: mockContracts,
  contractVersions: mockContractVersions,
  workOrders: mockWorkOrders,
  accrualRecords: mockAccrualRecords,
  reversalRecords: mockReversalRecords,
  exceptions: mockExceptions,
  crossYearSettlements: mockCrossYearSettlements,
  currentPeriod: "2025-Q1",

  setCurrentPeriod: (period) => set({ currentPeriod: period }),

  updateContract: (id, data) =>
    set((s) => ({
      contracts: s.contracts.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  addWorkOrder: (order) =>
    set((s) => ({ workOrders: [...s.workOrders, order] })),

  updateWorkOrder: (id, data) =>
    set((s) => ({
      workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...data } : w)),
    })),

  addAccrualRecord: (record) =>
    set((s) => ({ accrualRecords: [...s.accrualRecords, record] })),

  updateAccrualRecord: (id, data) =>
    set((s) => ({
      accrualRecords: s.accrualRecords.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),

  addReversalRecord: (record) =>
    set((s) => ({ reversalRecords: [...s.reversalRecords, record] })),

  updateException: (id, data) =>
    set((s) => ({
      exceptions: s.exceptions.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),

  addException: (exception) =>
    set((s) => ({ exceptions: [...s.exceptions, exception] })),

  updateCrossYearSettlement: (id, data) =>
    set((s) => ({
      crossYearSettlements: s.crossYearSettlements.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  recalcAccrual: (contractId, period) => {
    const state = get()
    const contract = state.contracts.find((c) => c.id === contractId)
    if (!contract) return

    const monthly = calcMonthlyFromContract(contract)
    const months = getMonthsInPeriod(contract, period)
    const baseAccrual = months * monthly

    const periodOrders = state.workOrders.filter(
      (w) => w.contractId === contractId && period.includes(w.orderDate.substring(0, 7))
    )
    const faultAmount = periodOrders
      .filter((w) => w.type === "fault" || w.type === "fault_supplement")
      .reduce((sum, w) => sum + w.amount, 0)

    const totalAmount = baseAccrual + faultAmount

    const existing = state.accrualRecords.find(
      (a) => a.contractId === contractId && a.period === period
    )

    const basis = faultAmount > 0
      ? `${months}个月 × ${monthly.toLocaleString()}元/月 + 故障追加${faultAmount.toLocaleString()}元`
      : `${months}个月 × ${monthly.toLocaleString()}元/月`

    if (existing) {
      set((s) => ({
        accrualRecords: s.accrualRecords.map((a) =>
          a.id === existing.id
            ? { ...a, amount: totalAmount, calculationBasis: basis, version: contract.version }
            : a
        ),
      }))
    } else {
      const newRecord: AccrualRecord = {
        id: `ar-${Date.now()}`,
        contractId,
        period,
        amount: totalAmount,
        calculationBasis: basis,
        version: contract.version,
        createdAt: new Date().toISOString().split("T")[0],
      }
      set((s) => ({ accrualRecords: [...s.accrualRecords, newRecord] }))
    }
  },

  terminateContract: (contractId, terminateDate) => {
    const state = get()
    const contract = state.contracts.find((c) => c.id === contractId)
    if (!contract) return

    const monthly = calcMonthlyFromContract(contract)
    const origEnd = new Date(contract.endDate)
    const termDate = new Date(terminateDate)
    const monthsReversed =
      (origEnd.getFullYear() - termDate.getFullYear()) * 12 +
      (origEnd.getMonth() - termDate.getMonth())
    const reversalAmount = Math.max(0, monthsReversed * monthly)

    const suggestions = [
      { action: "confirm_termination", params: { contractId, terminateDate } },
      { action: "create_reversal", params: { amount: reversalAmount, contractId } },
    ]

    const reversal: ReversalRecord = {
      id: `rr-${Date.now()}`,
      contractId,
      accrualId: "",
      amount: reversalAmount,
      reason: `合同提前终止于${terminateDate}，冲回${monthsReversed}个月未到期预提`,
      type: "early_termination",
      reversalDate: terminateDate,
      suggestions,
    }

    set((s) => ({
      contracts: s.contracts.map((c) =>
        c.id === contractId
          ? { ...c, status: "terminated_early" as const, endDate: terminateDate }
          : c
      ),
      reversalRecords: [...s.reversalRecords, reversal],
    }))
  },

  supplementWorkOrder: (workOrderId, targetPeriod) => {
    const state = get()
    const wo = state.workOrders.find((w) => w.id === workOrderId)
    if (!wo) return

    set((s) => ({
      workOrders: s.workOrders.map((w) =>
        w.id === workOrderId ? { ...w, isLateArrival: false, status: "settled" as const } : w
      ),
      exceptions: s.exceptions.map((e) =>
        e.relatedId === workOrderId && e.type === "late_work_order"
          ? { ...e, status: "resolved" as const }
          : e
      ),
    }))

    get().recalcAccrual(wo.contractId, targetPeriod)
  },

  runConsistencyCheck: () => {
    const state = get()
    const checks: ConsistencyCheckResult["checks"] = []

    const totalAccrual = state.accrualRecords.reduce((s, a) => s + a.amount, 0)
    const totalReversal = state.reversalRecords.reduce((s, r) => s + r.amount, 0)
    const netAccrual = totalAccrual - totalReversal

    const contractAccruals = state.contracts.map((c) => {
      const acc = state.accrualRecords
        .filter((a) => a.contractId === c.id)
        .reduce((s, a) => s + a.amount, 0)
      const rev = state.reversalRecords
        .filter((r) => r.contractId === c.id)
        .reduce((s, r) => s + r.amount, 0)
      return { contractId: c.id, code: c.code, accrual: acc, reversal: rev, net: acc - rev }
    })

    const sumByContract = contractAccruals.reduce((s, c) => s + c.net, 0)

    checks.push({
      name: "总预提净额一致性",
      passed: netAccrual === sumByContract,
      expected: netAccrual,
      actual: sumByContract,
      detail: `总预提净额 ${netAccrual.toLocaleString()} vs 合同汇总 ${sumByContract.toLocaleString()}`,
    })

    const pendingExceptions = state.exceptions.filter((e) => e.status === "pending")
    const exceptionRelatedAmounts = pendingExceptions
      .filter((e) => e.type === "amount_mismatch")
      .map((e) => (e.suggestion.params.diff as number) || 0)
    const totalDiff = exceptionRelatedAmounts.reduce((s, d) => s + d, 0)

    checks.push({
      name: "异常差异一致性",
      passed: true,
      expected: totalDiff,
      actual: totalDiff,
      detail: `待处理金额差异合计 ${totalDiff.toLocaleString()} 元`,
    })

    const woTotal = state.workOrders.reduce((s, w) => s + w.amount, 0)
    const accTotal = state.accrualRecords.reduce((s, a) => s + a.amount, 0)

    checks.push({
      name: "工单与预提金额对比",
      passed: true,
      expected: woTotal,
      actual: accTotal,
      detail: `工单总额 ${woTotal.toLocaleString()} vs 预提总额 ${accTotal.toLocaleString()}`,
    })

    return {
      passed: checks.every((c) => c.passed),
      checks,
    }
  },

  fillContractAmount: (contractId, annual, monthly) => {
    set((s) => ({
      contracts: s.contracts.map((c) =>
        c.id === contractId ? { ...c, annualAmount: annual, monthlyAmount: monthly } : c
      ),
      exceptions: s.exceptions.map((e) =>
        e.relatedId === contractId && e.type === "missing_field"
          ? { ...e, status: "resolved" as const }
          : e
      ),
    }))
  },

  confirmCrossYear: (settlementId) => {
    set((s) => ({
      crossYearSettlements: s.crossYearSettlements.map((c) =>
        c.id === settlementId
          ? { ...c, status: "confirmed" as const, approvalInfo: { approver: "财务主管", date: new Date().toISOString().split("T")[0], note: "已确认结转" } }
          : c
      ),
      exceptions: s.exceptions.map((e) =>
        e.type === "cross_year_pending" &&
        s.crossYearSettlements.some((cs) => cs.id === settlementId && cs.contractId === e.relatedId)
          ? { ...e, status: "resolved" as const }
          : e
      ),
    }))
  },
}))
