import type {
  Resources,
  Activity,
  ActivitySelection,
  CarbonRecord,
  AnomalyEvent,
  AnomalyType,
  PendingReduction,
} from '@/types';
import { ANOMALY_MESSAGES, GAME_CONFIG } from '@/data/gameConfig';
import { generateId } from './carbonCalculator';

export function detectOverdraft(
  currentResources: Resources,
  totalCost: Resources
): AnomalyEvent | null {
  const overdraftFields: string[] = [];
  const data: Record<string, number | string> = {};
  if (currentResources.budget < totalCost.budget) {
    overdraftFields.push('经费');
    data.overdraftBudget = totalCost.budget - currentResources.budget;
  }
  if (currentResources.electricity < totalCost.electricity) {
    overdraftFields.push('用电');
    data.overdraftElectricity = totalCost.electricity - currentResources.electricity;
  }
  if (currentResources.transport < totalCost.transport) {
    overdraftFields.push('交通');
    data.overdraftTransport = totalCost.transport - currentResources.transport;
  }
  if (overdraftFields.length === 0) return null;
  return {
    id: generateId(),
    round: 0,
    type: 'overdraft',
    severity: ANOMALY_MESSAGES.overdraft.severity,
    description: `${ANOMALY_MESSAGES.overdraft.description}：${overdraftFields.join('、')}不足`,
    detected: true,
    resolved: false,
    detectedAt: Date.now(),
    data,
  };
}

export function detectDoubleOffset(
  newRecord: CarbonRecord,
  existingRecords: CarbonRecord[],
  activityId?: string
): AnomalyEvent | null {
  if (newRecord.type !== 'reduction' || !newRecord.isOffset) return null;
  const matchingRecords = existingRecords.filter(
    r =>
      r.type === 'reduction' &&
      r.isOffset &&
      r.sourceActivityId === activityId &&
      r.amount === newRecord.amount &&
      r.id !== newRecord.id
  );
  if (matchingRecords.length === 0) return null;
  return {
    id: generateId(),
    round: newRecord.round,
    type: 'double_offset',
    severity: ANOMALY_MESSAGES.double_offset.severity,
    description: `${ANOMALY_MESSAGES.double_offset.description}：检测到 ${matchingRecords.length + 1} 条相同的抵扣记录`,
    activityId,
    detected: true,
    resolved: false,
    detectedAt: Date.now(),
    data: {
      duplicateCount: matchingRecords.length + 1,
      amount: newRecord.amount,
    },
  };
}

export function detectDelay(
  activity: Activity,
  forceTrigger: boolean = false
): { shouldDelay: boolean; anomaly: AnomalyEvent | null; delayRounds: number } {
  if (!activity.isLowCarbon) {
    return { shouldDelay: false, anomaly: null, delayRounds: 0 };
  }
  const shouldDelay = forceTrigger || Math.random() < activity.delayRisk;
  if (!shouldDelay) {
    return { shouldDelay: false, anomaly: null, delayRounds: 0 };
  }
  const delayRounds = forceTrigger ? 3 : GAME_CONFIG.DELAY_ROUNDS;
  const anomaly: AnomalyEvent = {
    id: generateId(),
    round: 0,
    type: 'delay',
    severity: ANOMALY_MESSAGES.delay.severity,
    description: `${ANOMALY_MESSAGES.delay.description}："${activity.name}"将延迟 ${delayRounds} 回合生效`,
    activityId: activity.id,
    activityName: activity.name,
    detected: true,
    resolved: false,
    detectedAt: Date.now(),
    data: {
      delayRounds,
      activityName: activity.name,
    },
  };
  return { shouldDelay, anomaly, delayRounds };
}

export function createPendingReduction(
  activity: Activity,
  activitySelection: ActivitySelection,
  delayRounds: number,
  currentRound: number
): PendingReduction {
  return {
    id: generateId(),
    activityId: activity.id,
    activityName: activity.name,
    amount: activity.carbonReduction * activitySelection.count,
    originalRound: currentRound,
    effectiveRound: currentRound + delayRounds,
    applied: false,
  };
}

export function getAnomalyLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    overdraft: '预算透支',
    double_offset: '重复抵扣',
    delay: '方案延迟',
  };
  return labels[type];
}

export function getAnomalyColor(type: AnomalyType): string {
  const colors: Record<AnomalyType, string> = {
    overdraft: 'text-burnt-400',
    double_offset: 'text-burnt-400',
    delay: 'text-yellow-400',
  };
  return colors[type];
}

export function getAnomalyBgColor(type: AnomalyType): string {
  const colors: Record<AnomalyType, string> = {
    overdraft: 'bg-burnt-400/20 border-burnt-400/50',
    double_offset: 'bg-burnt-400/20 border-burnt-400/50',
    delay: 'bg-yellow-400/20 border-yellow-400/50',
  };
  return colors[type];
}
