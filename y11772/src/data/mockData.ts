import type { CashFlowItem, Department, CurrencyRate, AuditEntry } from "@/types"

export const DEPARTMENTS: Department[] = [
  { id: "sales", name: "销售部", color: "#4fc3f7" },
  { id: "procurement", name: "采购部", color: "#81c784" },
  { id: "rd", name: "研发部", color: "#ba68c8" },
  { id: "marketing", name: "市场部", color: "#ffb74d" },
  { id: "operations", name: "运营部", color: "#f06292" },
]

export const CURRENCIES = ["CNY", "USD", "EUR", "JPY"] as const

export const CURRENCY_RATES: CurrencyRate[] = [
  { from: "CNY", to: "CNY", rate: 1, updatedAt: "2026-05-27" },
  { from: "USD", to: "CNY", rate: 7.24, updatedAt: "2026-05-27" },
  { from: "EUR", to: "CNY", rate: 7.89, updatedAt: "2026-05-27" },
  { from: "JPY", to: "CNY", rate: 0.047, updatedAt: "2026-05-27" },
  { from: "CNY", to: "USD", rate: 0.138, updatedAt: "2026-05-27" },
  { from: "CNY", to: "EUR", rate: 0.127, updatedAt: "2026-05-27" },
  { from: "CNY", to: "JPY", rate: 21.28, updatedAt: "2026-05-27" },
]

function makeAuditTrail(itemId: string, count: number): AuditEntry[] {
  const fields = ["amount", "dueDate", "confidence"]
  const reasons = ["数据源更新修正", "手工校对修正", "汇率变动调整"]
  const operators = ["张财务", "李主管", "王CFO"]
  const trail: AuditEntry[] = []
  for (let i = 0; i < count; i++) {
    trail.push({
      id: `audit-${itemId}-${i}`,
      itemId,
      timestamp: new Date(2026, 4, 27 - i * 3).toISOString(),
      field: fields[i % fields.length],
      oldValue: i === 0 ? null : `旧值${i}`,
      newValue: `新值${i + 1}`,
      reason: reasons[i % reasons.length],
      operator: operators[i % operators.length],
    })
  }
  return trail
}

function generateItems(): CashFlowItem[] {
  const items: CashFlowItem[] = []
  const deptIds = DEPARTMENTS.map((d) => d.id)
  const sources: Array<"collection_plan" | "payment_plan" | "fund_report"> = ["collection_plan", "payment_plan", "fund_report"]

  for (let i = 0; i < 60; i++) {
    const deptId = deptIds[i % deptIds.length]
    const currency = CURRENCIES[i % CURRENCIES.length]
    const isCNY = currency === "CNY"
    const amount = Math.round((Math.random() * 800 + 100) * 10000)
    const monthOffset = Math.floor(i / 5)
    const dueDate = new Date(2026, (5 + monthOffset) % 12, 1 + (i % 28))
    const source = sources[i % sources.length]
    const confidence = i % 7 === 0 ? Math.round((Math.random() * 0.4 + 0.1) * 100) / 100 : Math.round((Math.random() * 0.3 + 0.7) * 100) / 100
    const hasDateMisalignment = i === 3 || i === 19 || i === 37
    const hasUnconverted = (i % 9 === 0) && !isCNY
    const type = i % 3 === 0 ? "receipt" : "payment"

    items.push({
      id: `cf-${String(i).padStart(3, "0")}`,
      type,
      department: deptId,
      currency,
      amount,
      amountInBaseCurrency: hasUnconverted ? null : Math.round(amount * (CURRENCY_RATES.find((r) => r.from === currency && r.to === "CNY")?.rate ?? 1)),
      confidence,
      dueDate: hasDateMisalignment
        ? new Date(2025, 0, 5).toISOString().slice(0, 10)
        : dueDate.toISOString().slice(0, 10),
      source,
      sourceId: `${source}-${String(i).padStart(3, "0")}`,
      isCurrencyConverted: !hasUnconverted,
      auditTrail: makeAuditTrail(`cf-${String(i).padStart(3, "0")}`, i % 5 === 0 ? 2 : 0),
    })
  }
  return items
}

export const MOCK_CASH_FLOW_ITEMS: CashFlowItem[] = generateItems()
