import { getDb } from '../database/init.js'
import type { Bill, UserProfile, BillException, ExceptionType } from '../../shared/types.js'

export interface DetectedException {
  type: ExceptionType
  severity: 'low' | 'medium' | 'high'
  description: string
  human_readable: string
}

export function detectReadingGap(bill: Bill): DetectedException | null {
  if (bill.total_usage === 0) {
    return {
      type: 'reading_gap',
      severity: 'high',
      description: `用户${bill.user_no}本月用水量为0`,
      human_readable: `该户本月抄表读数为0或与上月读数持平，可能存在漏抄或未抄表情况，请核实后再复核。`,
    }
  }
  return null
}

export function detectDiscountExpired(userProfile: UserProfile, billingMonth: string): DetectedException | null {
  if (!userProfile.discount_rate || !userProfile.discount_expire_date) return null

  const expireDate = userProfile.discount_expire_date
  const billingDate = billingMonth + '-01'

  if (expireDate < billingDate) {
    return {
      type: 'discount_expired',
      severity: 'medium',
      description: `用户${userProfile.user_no}减免优惠已于${expireDate}到期`,
      human_readable: `该户享受的减免优惠已于${expireDate}到期，当前账单仍按减免后金额计算，需确认是否续期或按原价重新计费。`,
    }
  }
  return null
}

export function detectAllocationError(
  bill: Bill,
  groupBills: Bill[]
): DetectedException | null {
  if (!bill.combined_group_id || groupBills.length === 0) return null

  const allocatedSum = groupBills.reduce((sum, b) => sum + b.calculated_amount, 0)
  const totalAmount = bill.calculated_amount * groupBills.length
  const diff = Math.abs(allocatedSum - totalAmount)
  const diffPercent = totalAmount > 0 ? (diff / totalAmount) * 100 : 0

  if (diffPercent > 1) {
    return {
      type: 'allocation_error',
      severity: 'medium',
      description: `合表户${bill.combined_group_id}分摊差额${diff.toFixed(2)}元，占比${diffPercent.toFixed(2)}%`,
      human_readable: `合表户${bill.combined_group_id}分摊后各户水费合计${allocatedSum.toFixed(2)}元，与整表应缴${totalAmount.toFixed(2)}元相差${diff.toFixed(2)}元，差额超过1%，请核实分摊比例是否正确。`,
    }
  }
  return null
}

export function detectAllExceptions(
  bill: Bill,
  userProfile: UserProfile,
  groupBills?: Bill[]
): DetectedException[] {
  const exceptions: DetectedException[] = []

  const readingGap = detectReadingGap(bill)
  if (readingGap) exceptions.push(readingGap)

  const discountExpired = detectDiscountExpired(userProfile, bill.billing_month)
  if (discountExpired) exceptions.push(discountExpired)

  if (groupBills && groupBills.length > 0) {
    const allocationError = detectAllocationError(bill, groupBills)
    if (allocationError) exceptions.push(allocationError)
  }

  return exceptions
}
