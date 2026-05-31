import type { Calculation, Cost, Payment, Exception } from '@/types';
import { generateId } from '@/utils/storage';

export function detectExceptions(
  calculation: Calculation,
  costs: Cost[],
  payments: Payment[]
): Exception[] {
  const exceptions: Exception[] = [];
  const now = new Date().toISOString();
  
  const delayedCosts = costs.filter(c => c.isDelayed);
  delayedCosts.forEach(cost => {
    exceptions.push({
      id: generateId('exc'),
      calculationId: calculation.id,
      type: 'cost_delay',
      severity: 'high',
      status: 'open',
      triggerSource: `投流消耗 ${cost.costDate} ${cost.channel}`,
      triggerSourceId: cost.id,
      blockPoint: '消耗数据未及时到账，影响成本核算准确性',
      nextStep: '请联系渠道确认消耗数据，补录后重新测算',
      createdAt: now,
    });
  });
  
  const splitPayments = payments.filter(p => p.isSplit);
  splitPayments.forEach(payment => {
    exceptions.push({
      id: generateId('exc'),
      calculationId: calculation.id,
      type: 'payment_split',
      severity: 'medium',
      status: 'open',
      triggerSource: `渠道回款 ${payment.paymentDate} ${payment.channel}`,
      triggerSourceId: payment.id,
      blockPoint: '该笔回款为拆分回款，需确认对应关系',
      nextStep: '请核对拆分来源，确保回款与剧集对应正确',
      createdAt: now,
    });
  });
  
  if (costs.length === 0) {
    exceptions.push({
      id: generateId('exc'),
      calculationId: calculation.id,
      type: 'data_missing',
      severity: 'high',
      status: 'open',
      triggerSource: '投流消耗数据',
      triggerSourceId: 'none',
      blockPoint: '测算周期内没有投流消耗数据',
      nextStep: '请检查是否漏录投流消耗数据，或调整测算周期',
      createdAt: now,
    });
  }
  
  if (payments.length === 0) {
    exceptions.push({
      id: generateId('exc'),
      calculationId: calculation.id,
      type: 'data_missing',
      severity: 'medium',
      status: 'open',
      triggerSource: '渠道回款数据',
      triggerSourceId: 'none',
      blockPoint: '测算周期内没有渠道回款数据',
      nextStep: '请确认是否有回款未录入，或联系渠道催要结算单',
      createdAt: now,
    });
  }
  
  return exceptions;
}

export function determineCalculationStatus(
  exceptions: Exception[]
): 'normal' | 'exception' {
  const openExceptions = exceptions.filter(e => e.status !== 'resolved');
  return openExceptions.length > 0 ? 'exception' : 'normal';
}

export function resolveException(exception: Exception, remark?: string): Exception {
  return {
    ...exception,
    status: 'resolved',
    remark: remark || exception.remark,
    resolvedAt: new Date().toISOString(),
  };
}

export function updateExceptionStatus(
  exception: Exception,
  status: Exception['status'],
  remark?: string
): Exception {
  return {
    ...exception,
    status,
    remark: remark || exception.remark,
    resolvedAt: status === 'resolved' ? new Date().toISOString() : exception.resolvedAt,
  };
}

export function cleanOldExceptions(
  calculationId: string,
  allExceptions: Exception[]
): Exception[] {
  return allExceptions.filter(e => e.calculationId !== calculationId);
}

export function mergeExceptions(
  existing: Exception[],
  newOnes: Exception[],
  calculationId: string
): Exception[] {
  const cleaned = cleanOldExceptions(calculationId, existing);
  return [...cleaned, ...newOnes];
}
