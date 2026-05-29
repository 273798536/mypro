import type {
  Equipment,
  Contract,
  ContractVersionChange,
  WorkOrder,
  AccrualRecord,
  ReversalRecord,
  Exception,
  CrossYearSettlement,
} from "@/types"

export const mockEquipment: Equipment[] = [
  { id: "eq-001", code: "CNC-001", name: "数控铣床 A", category: "机加工", remark: "2024年大修后运行正常，偶有异响", status: "active" },
  { id: "eq-002", code: "INJ-002", name: "注塑机 B", category: "成型", remark: "", status: "active" },
  { id: "eq-003", code: "PRS-003", name: "液压冲床 C", category: "冲压", remark: "台账备注：该设备已超设计寿命，建议关注", status: "active" },
]

export const mockContracts: Contract[] = [
  {
    id: "ct-001", code: "WB-2024-001", equipmentId: "eq-001", version: "1.0",
    startDate: "2024-01-01", endDate: "2024-12-31",
    annualAmount: 120000, monthlyAmount: 10000,
    isCrossYear: false, status: "completed",
  },
  {
    id: "ct-002", code: "WB-2024-002", equipmentId: "eq-002", version: "1.0",
    startDate: "2024-07-01", endDate: "2025-06-30",
    annualAmount: 180000, monthlyAmount: 15000,
    isCrossYear: true, status: "active",
  },
  {
    id: "ct-003", code: "WB-2024-003", equipmentId: "eq-003", version: "2.0",
    startDate: "2024-03-01", endDate: "2024-09-30",
    annualAmount: null, monthlyAmount: null,
    isCrossYear: false, status: "terminated_early",
  },
  {
    id: "ct-004", code: "WB-2025-001", equipmentId: "eq-001", version: "1.0",
    startDate: "2025-01-01", endDate: "2025-12-31",
    annualAmount: 132000, monthlyAmount: 11000,
    isCrossYear: false, status: "active",
  },
]

export const mockContractVersions: ContractVersionChange[] = [
  {
    id: "cv-001", contractId: "ct-003", version: "2.0",
    effectiveDate: "2024-06-01",
    changes: {
      annualAmount: { old: 60000, new: 72000 },
      endDate: { old: "2024-12-31", new: "2024-09-30" },
    },
    reason: "合同续签时调整金额并缩短周期",
  },
]

export const mockWorkOrders: WorkOrder[] = [
  {
    id: "wo-001", code: "WO-2024-001", contractId: "ct-001", equipmentId: "eq-001",
    type: "routine", amount: 8000, orderDate: "2024-03-15", receivedDate: "2024-03-15",
    isLateArrival: false, status: "settled",
  },
  {
    id: "wo-002", code: "WO-2024-002", contractId: "ct-002", equipmentId: "eq-002",
    type: "routine", amount: 12000, orderDate: "2024-09-20", receivedDate: "2024-09-20",
    isLateArrival: false, status: "settled",
  },
  {
    id: "wo-003", code: "WO-2024-003", contractId: "ct-003", equipmentId: "eq-003",
    type: "fault", amount: 18000, orderDate: "2024-05-10", receivedDate: "2024-05-10",
    isLateArrival: false, status: "settled",
  },
  {
    id: "wo-004", code: "WO-2024-004", contractId: "ct-002", equipmentId: "eq-002",
    type: "fault", amount: 25000, orderDate: "2024-08-05", receivedDate: "2024-11-20",
    isLateArrival: true, status: "pending",
  },
  {
    id: "wo-005", code: "WO-2024-005", contractId: "ct-003", equipmentId: "eq-003",
    type: "fault_supplement", amount: 9500, orderDate: "2024-07-12", receivedDate: "2024-07-12",
    isLateArrival: false, status: "settled",
  },
  {
    id: "wo-006", code: "WO-2025-001", contractId: "ct-004", equipmentId: "eq-001",
    type: "routine", amount: 5500, orderDate: "2025-02-10", receivedDate: "2025-04-15",
    isLateArrival: true, status: "pending",
  },
]

export const mockAccrualRecords: AccrualRecord[] = [
  {
    id: "ar-001", contractId: "ct-001", period: "2024-Q1", amount: 30000,
    calculationBasis: "3个月 × 10,000元/月", version: "1.0", createdAt: "2024-04-01",
  },
  {
    id: "ar-002", contractId: "ct-001", period: "2024-Q2", amount: 30000,
    calculationBasis: "3个月 × 10,000元/月", version: "1.0", createdAt: "2024-07-01",
  },
  {
    id: "ar-003", contractId: "ct-001", period: "2024-Q3", amount: 30000,
    calculationBasis: "3个月 × 10,000元/月", version: "1.0", createdAt: "2024-10-01",
  },
  {
    id: "ar-004", contractId: "ct-001", period: "2024-Q4", amount: 30000,
    calculationBasis: "3个月 × 10,000元/月", version: "1.0", createdAt: "2025-01-01",
  },
  {
    id: "ar-005", contractId: "ct-002", period: "2024-Q3", amount: 45000,
    calculationBasis: "3个月 × 15,000元/月", version: "1.0", createdAt: "2024-10-01",
  },
  {
    id: "ar-006", contractId: "ct-002", period: "2024-Q4", amount: 45000,
    calculationBasis: "3个月 × 15,000元/月", version: "1.0", createdAt: "2025-01-01",
  },
  {
    id: "ar-007", contractId: "ct-003", period: "2024-Q1", amount: 5000,
    calculationBasis: "1个月 × 5,000元/月(估算)", version: "2.0", createdAt: "2024-04-01",
  },
  {
    id: "ar-008", contractId: "ct-003", period: "2024-Q2", amount: 15000,
    calculationBasis: "3个月 × 5,000元/月(估算)", version: "2.0", createdAt: "2024-07-01",
  },
  {
    id: "ar-009", contractId: "ct-004", period: "2025-Q1", amount: 33000,
    calculationBasis: "3个月 × 11,000元/月", version: "1.0", createdAt: "2025-04-01",
  },
]

export const mockReversalRecords: ReversalRecord[] = [
  {
    id: "rr-001", contractId: "ct-003", accrualId: "ar-008", amount: 10000,
    reason: "合同提前终止，冲回7-9月未到期预提",
    type: "early_termination", reversalDate: "2024-09-30",
    suggestions: [
      { action: "confirm_termination", params: { contractId: "ct-003", terminateDate: "2024-06-30" } },
      { action: "adjust_accrual", params: { accrualId: "ar-008", newAmount: 5000 } },
    ],
  },
]

export const mockExceptions: Exception[] = [
  {
    id: "ex-001", type: "missing_field", relatedId: "ct-003",
    description: "合同 WB-2024-003 缺少年度金额和月度金额",
    severity: "critical", status: "pending",
    suggestion: {
      action: "fill_contract_amount",
      description: "根据已有工单金额估算月均费用为5,000元，建议补充年度金额60,000元",
      params: { contractId: "ct-003", suggestedAnnual: 60000, suggestedMonthly: 5000 },
    },
    createdAt: "2024-03-01",
  },
  {
    id: "ex-002", type: "late_work_order", relatedId: "wo-004",
    description: "工单 WO-2024-004 延迟3个月到账（8月工单11月才收到）",
    severity: "warning", status: "pending",
    suggestion: {
      action: "supplement_work_order",
      description: "将工单WO-2024-004补录到合同WB-2024-002的2024-Q3期间，重算该期间预提",
      params: { workOrderId: "wo-004", targetPeriod: "2024-Q3" },
    },
    createdAt: "2024-11-20",
  },
  {
    id: "ex-003", type: "late_work_order", relatedId: "wo-006",
    description: "工单 WO-2025-001 延迟2个月到账（2月工单4月才收到）",
    severity: "warning", status: "pending",
    suggestion: {
      action: "supplement_work_order",
      description: "将工单WO-2025-001补录到合同WB-2025-001的2025-Q1期间，重算该期间预提",
      params: { workOrderId: "wo-006", targetPeriod: "2025-Q1" },
    },
    createdAt: "2025-04-15",
  },
  {
    id: "ex-004", type: "cross_year_pending", relatedId: "ct-002",
    description: "合同 WB-2024-002 跨年（2024.07-2025.06），2025年部分待结转确认",
    severity: "critical", status: "pending",
    suggestion: {
      action: "confirm_cross_year",
      description: "合同2025年1-6月预提金额为90,000元（6个月×15,000元/月），请确认结转金额",
      params: { contractId: "ct-002", currentYearAmount: 90000, nextYearAmount: 90000 },
    },
    createdAt: "2025-01-01",
  },
  {
    id: "ex-005", type: "amount_mismatch", relatedId: "ct-003",
    description: "合同 WB-2024-003 工单归集金额与预提金额不一致：归集27,500元 vs 预提20,000元",
    severity: "warning", status: "pending",
    suggestion: {
      action: "reconcile_amount",
      description: "差异7,500元，建议补提或确认故障追加金额后调整",
      params: { contractId: "ct-003", diff: 7500 },
    },
    createdAt: "2024-08-01",
  },
]

export const mockCrossYearSettlements: CrossYearSettlement[] = [
  {
    id: "cys-001", contractId: "ct-002",
    fromPeriod: "2024", toPeriod: "2025",
    currentYearAmount: 90000, nextYearAmount: 90000,
    status: "pending", approvalInfo: null,
  },
]

export const mockPeriods = [
  "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4",
  "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4",
]
