import type { CashFlowItem, RiskFlag } from "@/types"

export function detectRisks(items: CashFlowItem[]): RiskFlag[] {
  const flags: RiskFlag[] = []
  const now = new Date()

  items.forEach((item) => {
    const dueDate = new Date(item.dueDate)
    if (dueDate < now) {
      flags.push({
        id: `risk-dm-${item.id}`,
        type: "date_misalignment",
        itemId: item.id,
        message: `日期错位：${item.dueDate} 早于当前日期`,
        severity: "critical",
      })
    }

    if (!item.isCurrencyConverted || item.amountInBaseCurrency === null) {
      flags.push({
        id: `risk-cu-${item.id}`,
        type: "currency_unconverted",
        itemId: item.id,
        message: `币种未换算：${item.currency} 金额尚未转换为基准币种`,
        severity: "warning",
      })
    }

    if (item.confidence < 0.6) {
      flags.push({
        id: `risk-lc-${item.id}`,
        type: "low_confidence",
        itemId: item.id,
        message: `低置信度：${(item.confidence * 100).toFixed(0)}%，数据可靠性存疑`,
        severity: "info",
      })
    }
  })

  return flags
}
