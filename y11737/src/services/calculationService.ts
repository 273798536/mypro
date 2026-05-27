import dayjs from 'dayjs';
import type { CalculationResult } from '@/types';

export function calculateDiscountInterest(
  amount: number,
  discountRate: number,
  discountDate: string,
  dueDate: string,
  rateVersion: string = 'v1.0'
): CalculationResult {
  const days = dayjs(dueDate).diff(dayjs(discountDate), 'day');
  const actualDays = Math.max(days, 0);
  
  const discountAmount = amount * (discountRate / 100) * (actualDays / 360);
  const actualAmount = amount - discountAmount;
  
  const formula = `贴现利息 = 票面金额 × 贴现率 × 计息天数 ÷ 360`;
  
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    actualAmount: Math.round(actualAmount * 100) / 100,
    days: actualDays,
    formula,
    version: rateVersion,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function validateCalculationResult(
  result: CalculationResult,
  amount: number
): { valid: boolean; message?: string } {
  if (result.days <= 0) {
    return { valid: false, message: '计息天数小于等于0，请检查到期日' };
  }
  
  const rateThreshold = 0.15;
  if (result.discountAmount > amount * rateThreshold) {
    return { valid: false, message: `贴现利息超过票面金额的${rateThreshold * 100}%，请人工复核` };
  }
  
  return { valid: true };
}
