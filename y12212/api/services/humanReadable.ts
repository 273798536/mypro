import type {
  Bill,
  BillDetail,
  BillException,
  UserProfile,
  UserType,
  AllocationMethod,
} from '../../shared/types.js'
import {
  USER_TYPE_LABELS,
  USER_CATEGORY_LABELS,
  BILL_STATUS_LABELS,
  EXCEPTION_TYPE_LABELS,
  ALLOCATION_METHOD_LABELS,
} from '../../shared/types.js'
import type { TierBreakdown, TierCalculationResult } from './tierPricing.js'
import type { AllocationResult, AllocationValidation } from './combinedAllocation.js'

export function generateTierExplanation(userType: UserType, calculation: TierCalculationResult): string {
  const typeLabel = USER_TYPE_LABELS[userType]
  let lines = [`${typeLabel}用水阶梯计费明细：`]
  for (const bd of calculation.breakdown) {
    lines.push(`  第${bd.tier}阶梯：${bd.usage}吨 × ${bd.price_per_ton}元/吨 = ${bd.amount.toFixed(2)}元`)
  }
  lines.push(`  合计：${calculation.total_usage}吨，总计${calculation.total_amount.toFixed(2)}元`)
  return lines.join('\n')
}

export function generateAllocationExplanation(
  method: AllocationMethod,
  results: AllocationResult[],
  totalUsage: number
): string {
  const methodLabel = ALLOCATION_METHOD_LABELS[method]
  let lines = [`合表分摊方式：${methodLabel}，总用水量${totalUsage}吨`]
  for (const r of results) {
    lines.push(`  ${r.name}(${r.user_no})：占比${(r.ratio * 100).toFixed(1)}%，分摊${r.allocated_usage.toFixed(2)}吨`)
  }
  return lines.join('\n')
}

export function generateAllocationValidationExplanation(validation: AllocationValidation): string {
  if (validation.is_valid) {
    return `分摊校验通过：分摊合计${validation.allocated_sum.toFixed(2)}吨，与总量${validation.total_usage.toFixed(2)}吨一致（差额${validation.difference.toFixed(2)}吨，${validation.difference_percent.toFixed(2)}%）。`
  }
  return `分摊校验未通过：分摊合计${validation.allocated_sum.toFixed(2)}吨，与总量${validation.total_usage.toFixed(2)}吨相差${validation.difference.toFixed(2)}吨（${validation.difference_percent.toFixed(2)}%），差额超过1%，请核实分摊比例。`
}

export function generateExceptionSummary(exceptions: BillException[]): string {
  if (exceptions.length === 0) {
    return '该账单未检测到异常。'
  }
  let lines = [`检测到${exceptions.length}项异常：`]
  for (const ex of exceptions) {
    const typeLabel = EXCEPTION_TYPE_LABELS[ex.type]
    const severityLabel = ex.severity === 'high' ? '高' : ex.severity === 'medium' ? '中' : '低'
    lines.push(`  [${typeLabel}][${severityLabel}] ${ex.human_readable}`)
  }
  return lines.join('\n')
}

export function generateBillReviewExplanation(
  bill: Bill,
  userProfile: UserProfile,
  details: BillDetail[],
  exceptions: BillException[]
): string {
  const typeLabel = USER_TYPE_LABELS[bill.user_type]
  const categoryLabel = USER_CATEGORY_LABELS[bill.user_category]
  const statusLabel = BILL_STATUS_LABELS[bill.status]

  let lines = [
    `账单复核报告`,
    `用户：${userProfile.name}(${bill.user_no})`,
    `用户类型：${typeLabel} | ${categoryLabel}`,
    `账单月份：${bill.billing_month}`,
    `用水量：${bill.total_usage}吨`,
    `计算金额：${bill.calculated_amount.toFixed(2)}元`,
    `状态：${statusLabel}`,
  ]

  if (userProfile.discount_rate) {
    lines.push(`减免比例：${(userProfile.discount_rate * 100).toFixed(0)}%`)
  }

  if (details.length > 0) {
    lines.push(``, `阶梯明细：`)
    for (const d of details) {
      lines.push(`  第${d.tier}阶梯：${d.usage}吨 × ${d.price_per_ton}元/吨 = ${d.amount.toFixed(2)}元`)
    }
  }

  if (exceptions.length > 0) {
    lines.push(``, generateExceptionSummary(exceptions))
  }

  return lines.join('\n')
}

export function generateBatchSummary(
  billingMonth: string,
  totalBills: number,
  totalAmount: number,
  exceptionCount: number,
  approvedCount: number,
  rejectedCount: number
): string {
  return [
    `${billingMonth}批次账单汇总`,
    `总账单数：${totalBills}`,
    `总金额：${totalAmount.toFixed(2)}元`,
    `异常数：${exceptionCount}`,
    `已通过：${approvedCount}`,
    `已驳回：${rejectedCount}`,
  ].join('\n')
}
