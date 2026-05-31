import type { Card } from '../types/card';
import type { CityStatus } from '../types/city';
import type { RiskRecord, RiskType } from '../types/risk';
import { PUMP_DANGER, LOW_WATER_DANGER, GREEN_DANGER } from '../types/city';
import { generateId } from '../utils/common';

export function detectRisks(
  status: CityStatus,
  round: number,
  lastPlayedCard: Card | null,
): RiskRecord[] {
  const risks: RiskRecord[] = [];

  if (status.pumpLoad > PUMP_DANGER) {
    risks.push(createRiskRecord('pump_overload', status, round, lastPlayedCard));
  }

  if (status.lowWater > LOW_WATER_DANGER) {
    risks.push(createRiskRecord('low_flooding', status, round, lastPlayedCard));
  }

  if (status.greenCapacity < GREEN_DANGER) {
    risks.push(createRiskRecord('green_depleted', status, round, lastPlayedCard));
  }

  return risks;
}

function createRiskRecord(
  type: RiskType,
  status: CityStatus,
  round: number,
  lastPlayedCard: Card | null,
): RiskRecord {
  const baseRecord: Omit<RiskRecord, 'id' | 'type' | 'bottleneck' | 'nextStep' | 'penalty'> = {
    round,
    timestamp: Date.now(),
    triggerCardId: lastPlayedCard?.id || null,
    triggerCardName: lastPlayedCard?.name || null,
    citySnapshot: { ...status },
  };

  switch (type) {
    case 'pump_overload': {
      const isSevere = status.pumpLoad > 95;
      return {
        ...baseRecord,
        id: generateId(),
        type,
        bottleneck: isSevere
          ? '管网输送能力严重不足，泵站满负荷运行'
          : '管网调度不及时，泵站负载接近上限',
        nextStep: '立即调度管网扩容卡或开启备用处置通道',
        penalty: isSevere ? 30 : 15,
      };
    }
    case 'low_flooding': {
      const isSevere = status.lowWater > 200;
      return {
        ...baseRecord,
        id: generateId(),
        type,
        bottleneck: isSevere
          ? '低洼区域排水能力严重不足，积水持续上涨'
          : '低洼区域排水能力不足，积水无法及时排出',
        nextStep: '调度应急处置卡或增加临时强排设施',
        penalty: isSevere ? 25 : 12,
      };
    }
    case 'green_depleted': {
      const isSevere = status.greenCapacity < 5;
      return {
        ...baseRecord,
        id: generateId(),
        type,
        bottleneck: isSevere
          ? '海绵设施吸纳能力完全饱和，无法继续消纳雨水'
          : '海绵设施吸纳能力接近饱和，无法继续消纳雨水',
        nextStep: '调度新增雨水花园卡或转输至其他蓄滞空间',
        penalty: isSevere ? 20 : 10,
      };
    }
  }
}

export function getRiskTriggerDescription(risk: RiskRecord): string {
  if (risk.triggerCardName) {
    return `调度「${risk.triggerCardName}」后触发`;
  }
  return '未及时调度相关卡牌导致';
}

export function getRiskImpactScore(risk: RiskRecord): number {
  return risk.penalty;
}
