import { Card, CityState, CalcTraceNode, Alert, AlertType } from '../types/game';

let nodeIdCounter = 0;
const generateNodeId = () => `node-${++nodeIdCounter}`;

export const createTraceNode = (
  label: string,
  value: number,
  formula?: string,
  source?: string,
  children?: CalcTraceNode[]
): CalcTraceNode => ({
  id: generateNodeId(),
  label,
  value,
  formula,
  source,
  children
});

export const applyCardEffect = (
  state: CityState,
  card: Card
): { newState: CityState; trace: CalcTraceNode } => {
  const stateBefore = { ...state };
  const children: CalcTraceNode[] = [];
  let newState = { ...state };

  if (card.effect.waterChange !== undefined) {
    const oldValue = newState.waterLevel;
    newState.waterLevel = Math.max(0, newState.waterLevel + card.effect.waterChange);
    children.push(
      createTraceNode(
        '积水水位',
        newState.waterLevel,
        `${oldValue} + (${card.effect.waterChange})`,
        card.name
      )
    );
  }

  if (card.effect.pumpLoad !== undefined) {
    const oldValue = newState.pumpLoad;
    newState.pumpLoad = Math.min(newState.pumpCapacity, Math.max(0, newState.pumpLoad + card.effect.pumpLoad));
    children.push(
      createTraceNode(
        '泵站负荷',
        newState.pumpLoad,
        `${oldValue} + (${card.effect.pumpLoad})`,
        card.name
      )
    );
  }

  if (card.effect.gardenCapacity !== undefined) {
    const oldValue = newState.gardenCapacity;
    newState.gardenCapacity = Math.min(newState.gardenMaxCapacity, Math.max(0, newState.gardenCapacity + card.effect.gardenCapacity));
    children.push(
      createTraceNode(
        '绿地容量',
        newState.gardenCapacity,
        `${oldValue} + (${card.effect.gardenCapacity})`,
        card.name
      )
    );
  }

  if (card.type === 'rain' && (card.id === 'rain-heavy' || card.id === 'rain-storm')) {
    const extraWater = card.id === 'rain-heavy' ? 15 : 30;
    const oldValue = newState.lowAreaWater;
    newState.lowAreaWater = Math.max(0, newState.lowAreaWater + extraWater);
    children.push(
      createTraceNode(
        '低洼积水',
        newState.lowAreaWater,
        `${oldValue} + ${extraWater}`,
        `${card.name} 影响`
      )
    );
  }

  if (card.type === 'pipe') {
    const drainLow = card.id.includes('divert') ? 25 : 10;
    const oldValue = newState.lowAreaWater;
    newState.lowAreaWater = Math.max(0, newState.lowAreaWater - drainLow);
    children.push(
      createTraceNode(
        '低洼积水',
        newState.lowAreaWater,
        `${oldValue} - ${drainLow}`,
        `${card.name} 疏排`
      )
    );
  }

  const mainTrace = createTraceNode(
    `使用卡牌: ${card.name}`,
    0,
    undefined,
    card.id,
    children
  );

  return { newState, trace: mainTrace };
};

export const calculateRoundScore = (
  stateBefore: CityState,
  stateAfter: CityState
): { score: number; reason: string } => {
  let score = 0;
  const reasons: string[] = [];

  const waterChange = stateAfter.waterLevel - stateBefore.waterLevel;
  if (waterChange < 0) {
    const bonus = Math.abs(waterChange);
    score += bonus;
    reasons.push(`水位下降 +${bonus}分`);
  } else if (waterChange > 0) {
    const penalty = Math.floor(waterChange * 0.5);
    score -= penalty;
    reasons.push(`水位上升 -${penalty}分`);
  }

  if (stateAfter.waterLevel > 80) {
    score -= 20;
    reasons.push('水位过高 -20分');
  } else if (stateAfter.waterLevel < 30) {
    score += 10;
    reasons.push('水位良好 +10分');
  }

  if (stateAfter.pumpLoad > 90) {
    score -= 30;
    reasons.push('泵站过载 -30分');
  } else if (stateAfter.pumpLoad < 70) {
    score += 5;
    reasons.push('泵站运行良好 +5分');
  }

  if (stateAfter.gardenCapacity <= 0) {
    score -= 25;
    reasons.push('绿地容量耗尽 -25分');
  } else if (stateAfter.gardenCapacity > 50) {
    score += 8;
    reasons.push('绿地储备充足 +8分');
  }

  if (stateAfter.lowAreaWater > 50) {
    score -= 35;
    reasons.push('低洼积水严重 -35分');
  } else if (stateAfter.lowAreaWater < 20) {
    score += 12;
    reasons.push('低洼排水良好 +12分');
  }

  return { score, reason: reasons.join('; ') };
};

export const checkAlerts = (state: CityState, stepIndex: number): Alert[] => {
  const alerts: Alert[] = [];
  let alertCounter = 0;

  if (state.pumpLoad > 90) {
    alerts.push({
      id: `alert-${stepIndex}-${alertCounter++}`,
      type: 'pump_overload',
      message: `泵站负荷已达 ${state.pumpLoad}%，超过安全阈值90%！请立即降低负荷或等待冷却。`,
      severity: state.pumpLoad >= 100 ? 'critical' : 'warning',
      stepIndex,
      confirmed: false
    });
  }

  if (state.lowAreaWater > 50) {
    alerts.push({
      id: `alert-${stepIndex}-${alertCounter++}`,
      type: 'low_area_flood',
      message: `低洼积水已达 ${state.lowAreaWater}，可能造成居民区内涝！请使用管网分流疏排。`,
      severity: state.lowAreaWater > 80 ? 'critical' : 'warning',
      stepIndex,
      confirmed: false
    });
  }

  if (state.gardenCapacity <= 0) {
    alerts.push({
      id: `alert-${stepIndex}-${alertCounter++}`,
      type: 'garden_depleted',
      message: '绿地容量已耗尽！雨水花园无法继续蓄水，请更换调度策略。',
      severity: 'critical',
      stepIndex,
      confirmed: false
    });
  }

  return alerts;
};

export const getAlertIcon = (type: AlertType): string => {
  switch (type) {
    case 'pump_overload':
      return '⚡';
    case 'low_area_flood':
      return '🌊';
    case 'garden_depleted':
      return '🌱';
    default:
      return '⚠️';
  }
};

export const getAlertTitle = (type: AlertType): string => {
  switch (type) {
    case 'pump_overload':
      return '泵站过载';
    case 'low_area_flood':
      return '低洼积水';
    case 'garden_depleted':
      return '绿地耗尽';
    default:
      return '警告';
  }
};
