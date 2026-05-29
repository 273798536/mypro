import type { Discount, FeeCalculationResult, MonthlyCard, TempParkingRecord } from '@/types';
import { CARD_MONTHLY_FEES } from '@/utils/constants';
import { isExpired } from '@/utils/format';

export const calculateRenewalFee = (
  monthlyCard: MonthlyCard,
  tempParkingRecords: TempParkingRecord[],
  discounts: Discount[],
  renewalMonths: number
): FeeCalculationResult => {
  const breakdown: FeeCalculationResult['breakdown'] = [];
  const appliedDiscounts: Discount[] = [];
  
  const monthlyFee = CARD_MONTHLY_FEES[monthlyCard.cardType] || 300;
  const baseFee = monthlyFee * renewalMonths;
  
  breakdown.push({
    description: `基础费用 (${renewalMonths}个月 × ${monthlyFee}元/月)`,
    amount: baseFee,
    type: 'base',
  });

  const undeductedRecords = tempParkingRecords.filter(
    (r) => !r.isDeducted && r.feeAmount > 0
  );
  const tempParkingDeduction = Math.min(
    undeductedRecords.reduce((sum, r) => sum + r.feeAmount, 0),
    baseFee
  );

  if (tempParkingDeduction > 0) {
    breakdown.push({
      description: `临停抵扣 (${undeductedRecords.length}条记录)`,
      amount: -tempParkingDeduction,
      type: 'deduction',
    });
  }

  let discountAmount = 0;
  let remainingFee = baseFee - tempParkingDeduction;

  const validDiscounts = discounts.filter(
    (d) => d.isActive && !isExpired(d.expiryDate) && d.usedCount < d.maxUsage
  );

  validDiscounts.sort((a, b) => {
    const order = { percentage: 1, fixed: 2, freeMonths: 3 };
    return order[a.type] - order[b.type];
  });

  for (const discount of validDiscounts) {
    if (remainingFee <= 0) break;

    let thisDiscountAmount = 0;

    switch (discount.type) {
      case 'percentage':
        thisDiscountAmount = Math.round(remainingFee * (discount.value / 100));
        break;
      case 'fixed':
        thisDiscountAmount = Math.min(discount.value, remainingFee);
        break;
      case 'freeMonths':
        const freeMonths = Math.min(discount.value, renewalMonths);
        thisDiscountAmount = freeMonths * monthlyFee;
        discount.value = discount.value - freeMonths;
        break;
    }

    if (thisDiscountAmount > 0) {
      discountAmount += thisDiscountAmount;
      remainingFee -= thisDiscountAmount;
      appliedDiscounts.push(discount);

      breakdown.push({
        description: `${discount.name} (${getDiscountDescription(discount)})`,
        amount: -thisDiscountAmount,
        type: 'discount',
      });
    }
  }

  const totalAmount = Math.max(0, baseFee - tempParkingDeduction - discountAmount);

  return {
    baseFee,
    tempParkingDeduction,
    discountAmount,
    totalAmount,
    appliedDiscounts,
    tempParkingRecords: undeductedRecords,
    breakdown,
  };
};

const getDiscountDescription = (discount: Discount): string => {
  switch (discount.type) {
    case 'percentage':
      return `${discount.value}%折扣`;
    case 'fixed':
      return `减${discount.value}元`;
    case 'freeMonths':
      return `赠${discount.value}个月`;
    default:
      return '';
  }
};

export const checkReviewStatus = (
  monthlyCard: MonthlyCard,
  tempParkingRecords: TempParkingRecord[],
  discounts: Discount[]
): 'normal' | 'warning' | 'error' => {
  if (monthlyCard.status !== 'active') {
    return 'error';
  }

  const expiredDiscounts = discounts.filter((d) => isExpired(d.expiryDate));
  if (expiredDiscounts.length > 0) {
    return 'warning';
  }

  const largeDeduction = tempParkingRecords
    .filter((r) => !r.isDeducted)
    .reduce((sum, r) => sum + r.feeAmount, 0);
  if (largeDeduction > 500) {
    return 'warning';
  }

  return 'normal';
};
