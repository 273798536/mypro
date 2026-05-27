import dayjs from 'dayjs';
import type { Endorsement, RiskItem, Bill } from '@/types';
import { RISK_TYPES } from '@/types';

export function validateBillNumber(billNumber: string): RiskItem | null {
  const cleanNumber = billNumber.replace(/\s/g, '');
  
  if (cleanNumber.length !== 16 && cleanNumber.length !== 30) {
    return {
      type: RISK_TYPES.BILL_NUMBER_INVALID,
      level: 'high',
      message: `票据号码格式错误，应为16位或30位，当前为${cleanNumber.length}位`,
      resolved: false,
    };
  }
  
  const validPattern = /^[0-9]+$/;
  if (!validPattern.test(cleanNumber)) {
    return {
      type: RISK_TYPES.BILL_NUMBER_INVALID,
      level: 'high',
      message: '票据号码格式错误，应仅包含数字',
      resolved: false,
    };
  }
  
  return null;
}

export function checkEndorsementChain(endorsements: Endorsement[]): RiskItem[] {
  const risks: RiskItem[] = [];
  
  if (endorsements.length === 0) {
    return risks;
  }
  
  const sorted = [...endorsements].sort((a, b) => a.sequence - b.sequence);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (current.endorsee.trim() !== next.endorser.trim()) {
      risks.push({
        type: RISK_TYPES.ENDORSEMENT_BROKEN,
        level: 'high',
        message: `背书链断裂：第${current.sequence}手被背书人「${current.endorsee}」与第${next.sequence}手背书人「${next.endorser}」不一致`,
        resolved: false,
      });
      next.isBroken = true;
    }
  }
  
  return risks;
}

export function checkDueDate(dueDate: string, thresholdDays: number = 7): RiskItem | null {
  const daysUntilDue = dayjs(dueDate).diff(dayjs(), 'day');
  
  if (daysUntilDue < 0) {
    return {
      type: RISK_TYPES.DUE_DATE_NEAR,
      level: 'high',
      message: `票据已过期${Math.abs(daysUntilDue)}天`,
      resolved: false,
    };
  }
  
  if (daysUntilDue <= thresholdDays) {
    return {
      type: RISK_TYPES.DUE_DATE_NEAR,
      level: 'medium',
      message: `距离到期日仅剩${daysUntilDue}天`,
      resolved: false,
    };
  }
  
  return null;
}

export function checkDiscountRateVersion(
  usedVersion: string,
  latestVersion: string
): RiskItem | null {
  if (usedVersion !== latestVersion) {
    return {
      type: RISK_TYPES.DISCOUNT_RATE_OUTDATED,
      level: 'high',
      message: `贴现率版本错误：当前使用${usedVersion}，最新版本为${latestVersion}`,
      resolved: false,
    };
  }
  
  return null;
}

export function checkCalculationAbnormal(
  discountAmount: number,
  actualAmount: number,
  amount: number
): RiskItem | null {
  if (discountAmount <= 0) {
    return {
      type: RISK_TYPES.CALCULATION_ABNORMAL,
      level: 'high',
      message: '贴现利息小于等于0，请检查计算参数',
      resolved: false,
    };
  }
  
  if (actualAmount <= 0) {
    return {
      type: RISK_TYPES.CALCULATION_ABNORMAL,
      level: 'high',
      message: '实付金额小于等于0，请检查计算参数',
      resolved: false,
    };
  }
  
  const ratio = discountAmount / amount;
  if (ratio > 0.2) {
    return {
      type: RISK_TYPES.CALCULATION_ABNORMAL,
      level: 'medium',
      message: `贴现利息占票面金额的${(ratio * 100).toFixed(1)}%，超出正常范围，请人工复核`,
      resolved: false,
    };
  }
  
  return null;
}

export function assessAllRisks(bill: Bill, latestRateVersion: string): RiskItem[] {
  const risks: RiskItem[] = [];
  
  const billNumberRisk = validateBillNumber(bill.billNumber);
  if (billNumberRisk) risks.push(billNumberRisk);
  
  const endorsementRisks = checkEndorsementChain(bill.endorsements);
  risks.push(...endorsementRisks);
  
  const dueDateRisk = checkDueDate(bill.dueDate);
  if (dueDateRisk) risks.push(dueDateRisk);
  
  const rateRisk = checkDiscountRateVersion(bill.discountRateVersion, latestRateVersion);
  if (rateRisk) risks.push(rateRisk);
  
  const calcRisk = checkCalculationAbnormal(
    bill.calculation.discountAmount,
    bill.calculation.actualAmount,
    bill.amount
  );
  if (calcRisk) risks.push(calcRisk);
  
  return risks;
}

export function hasHighRisk(risks: RiskItem[]): boolean {
  return risks.some(r => r.level === 'high' && !r.resolved);
}

export function getRiskSummary(risks: RiskItem[]) {
  const unresolved = risks.filter(r => !r.resolved);
  const high = unresolved.filter(r => r.level === 'high').length;
  const medium = unresolved.filter(r => r.level === 'medium').length;
  const low = unresolved.filter(r => r.level === 'low').length;
  
  return {
    total: unresolved.length,
    high,
    medium,
    low,
    hasHighRisk: high > 0,
  };
}
