import { Penalty, Gate, Exit, Broadcast } from '../types';
import { getLocationName } from './locationUtils';

interface PenaltyTemplate {
  category: Penalty['category'];
  reason: string;
  getHumanReadable: (locationRef: string, gates: Gate[], exits: Exit[], context?: Record<string, unknown>) => string;
  getSuggestion: (locationRef: string, gates: Gate[], exits: Exit[], context?: Record<string, unknown>) => string;
  basePoints: number;
  locationType: Penalty['locationType'];
}

const penaltyTemplates: Record<string, PenaltyTemplate> = {
  exit_congestion_high: {
    category: 'congestion',
    reason: '出口拥堵超过阈值',
    getHumanReadable: (locationRef, _gates, exits) => {
      const exit = exits.find((e) => e.id === locationRef);
      const level = exit?.congestionLevel ?? 0;
      const percentage = Math.round(level * 100);
      return `${getLocationName(locationRef, _gates, exits)}拥堵指数达到${percentage}%，超过80%的安全阈值，乘客排队长度超过15米。`;
    },
    getSuggestion: (locationRef, _gates, exits) => {
      const exitName = getLocationName(locationRef, _gates, exits);
      const otherExits = exits.filter((e) => e.id !== locationRef);
      const suggestions = otherExits.map((e) => e.name).join('、');
      return `建议立即播放分流广播，引导乘客前往${suggestions}出站，同时安排工作人员在${exitName}进行人工疏导。`;
    },
    basePoints: 30,
    locationType: 'exit',
  },
  exit_congestion_medium: {
    category: 'congestion',
    reason: '出口拥堵接近阈值',
    getHumanReadable: (locationRef, _gates, exits) => {
      const exit = exits.find((e) => e.id === locationRef);
      const level = exit?.congestionLevel ?? 0;
      const percentage = Math.round(level * 100);
      return `${getLocationName(locationRef, _gates, exits)}拥堵指数达到${percentage}%，接近60%的预警阈值，需要关注。`;
    },
    getSuggestion: (locationRef, _gates, exits) => {
      const exitName = getLocationName(locationRef, _gates, exits);
      return `建议监控${exitName}客流情况，准备播放分流广播，必要时设置临时分流引导。`;
    },
    basePoints: 15,
    locationType: 'exit',
  },
  gate_congestion: {
    category: 'congestion',
    reason: '闸机区域拥堵',
    getHumanReadable: (locationRef, _gates) => {
      const gate = _gates.find((g) => g.id === locationRef);
      const gateName = getLocationName(locationRef, _gates, []);
      const status = gate?.status === 'faulty' ? '故障' : gate?.status === 'closed' ? '关闭' : '限流';
      return `${gateName}处于${status}状态但未及时分流，导致闸机前聚集乘客超过20人，形成拥堵瓶颈。`;
    },
    getSuggestion: (locationRef, _gates) => {
      const gateName = getLocationName(locationRef, _gates, []);
      const normalGates = _gates.filter((g) => g.status === 'normal' && g.id !== locationRef);
      const suggestions = normalGates.map((g) => g.name).join('、');
      return `建议立即播放闸机故障分流广播，引导乘客从${suggestions}通行，同时在${gateName}前设置封控区。`;
    },
    basePoints: 25,
    locationType: 'gate',
  },
  missed_broadcast: {
    category: 'missed_broadcast',
    reason: '广播漏发',
    getHumanReadable: (locationRef, _gates, exits, context) => {
      const broadcastTitle = context?.broadcastTitle as string;
      const locationName = getLocationName(locationRef, _gates, exits);
      const delaySeconds = context?.delaySeconds as number;
      return `当${locationName}出现拥堵时，"${broadcastTitle}"广播延迟${delaySeconds}秒播放，未能及时引导乘客分流。`;
    },
    getSuggestion: (locationRef, _gates, exits, context) => {
      const broadcastTitle = context?.broadcastTitle as string;
      return `建议牢记"${broadcastTitle}"的触发条件，当监测到相关区域拥堵时应在10秒内启动播放。`;
    },
    basePoints: 20,
    locationType: 'area',
  },
  broadcast_cooldown_violation: {
    category: 'cooldown_violation',
    reason: '广播冷却时间内重复播放',
    getHumanReadable: (_locationRef, _gates, _exits, context) => {
      const broadcastTitle = context?.broadcastTitle as string;
      const cooldown = context?.cooldown as number;
      const timeSinceLast = context?.timeSinceLast as number;
      return `"${broadcastTitle}"广播冷却时间为${cooldown}秒，但仅间隔${timeSinceLast}秒就重复播放，可能造成乘客听觉疲劳和信息忽略。`;
    },
    getSuggestion: () => {
      return '建议合理安排广播播放顺序，同一内容广播间隔至少达到冷却时间，可穿插其他类型广播。';
    },
    basePoints: 10,
    locationType: 'area',
  },
  wrong_diversion: {
    category: 'wrong_diversion',
    reason: '分流路线不合理',
    getHumanReadable: (locationRef, _gates, exits, context) => {
      const fromGate = getLocationName(locationRef, _gates, []);
      const toExitId = context?.toExitId as string;
      const toExit = getLocationName(toExitId, [], exits);
      const congestion = context?.targetCongestion as number;
      const percentage = Math.round(congestion * 100);
      return `将${fromGate}的乘客引导至${toExit}，但该出口拥堵指数已达${percentage}%，分流后反而加剧拥堵。`;
    },
    getSuggestion: () => {
      return '建议在设置分流路线前先查看各出口拥堵情况，选择拥堵指数低于40%的出口作为分流目标。';
    },
    basePoints: 35,
    locationType: 'gate',
  },
  no_lockdown_for_faulty_gate: {
    category: 'safety_risk',
    reason: '故障闸机未设置封控区',
    getHumanReadable: (locationRef, _gates) => {
      const gateName = getLocationName(locationRef, _gates, []);
      return `${gateName}发生故障已超过30秒，但未设置封控区，仍有乘客试图靠近，存在安全隐患。`;
    },
    getSuggestion: (locationRef, _gates) => {
      const gateName = getLocationName(locationRef, _gates, []);
      return `建议在${gateName}故障后15秒内设置封控区，并播放区域封控通知广播。`;
    },
    basePoints: 40,
    locationType: 'gate',
  },
  passenger_stuck: {
    category: 'safety_risk',
    reason: '乘客长时间滞留',
    getHumanReadable: (locationRef, _gates, exits, context) => {
      const locationName = getLocationName(locationRef, _gates, exits);
      const stuckSeconds = context?.stuckSeconds as number;
      return `${locationName}附近有乘客滞留超过${stuckSeconds}秒未能疏散，存在踩踏风险。`;
    },
    getSuggestion: () => {
      return '建议加强对重点区域的监控，发现乘客滞留立即广播引导或调整分流策略。';
    },
    basePoints: 45,
    locationType: 'area',
  },
  gate_not_restricted: {
    category: 'safety_risk',
    reason: '故障闸机未及时关闭',
    getHumanReadable: (locationRef, _gates) => {
      const gateName = getLocationName(locationRef, _gates, []);
      return `${gateName}发生故障后未及时设置为关闭或限流状态，仍有乘客试图通过。`;
    },
    getSuggestion: (locationRef, _gates) => {
      const gateName = getLocationName(locationRef, _gates, []);
      return `建议${gateName}故障告警后立即将其状态改为关闭，防止乘客误入。`;
    },
    basePoints: 30,
    locationType: 'gate',
  },
};

export const createPenalty = (
  templateKey: string,
  locationRef: string,
  timestamp: number,
  gates: Gate[],
  exits: Exit[],
  context?: Record<string, unknown>,
  multiplier: number = 1
): Penalty => {
  const template = penaltyTemplates[templateKey];
  if (!template) {
    throw new Error(`Unknown penalty template: ${templateKey}`);
  }

  const id = `penalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    penaltyPoints: Math.round(template.basePoints * multiplier),
    category: template.category,
    reason: template.reason,
    humanReadableReason: template.getHumanReadable(locationRef, gates, exits, context),
    locationRef,
    locationType: template.locationType,
    timestamp,
    suggestion: template.getSuggestion(locationRef, gates, exits, context),
  };
};

export const getPenaltyCategoryLabel = (category: Penalty['category']): string => {
  const labels: Record<Penalty['category'], string> = {
    congestion: '出口拥堵',
    missed_broadcast: '广播漏发',
    wrong_diversion: '路线绕行',
    safety_risk: '安全风险',
    cooldown_violation: '广播冷却',
  };
  return labels[category];
};

export const getPenaltyCategoryColor = (category: Penalty['category']): string => {
  const colors: Record<Penalty['category'], string> = {
    congestion: '#FFB800',
    missed_broadcast: '#1E88E5',
    wrong_diversion: '#FB8C00',
    safety_risk: '#E53935',
    cooldown_violation: '#888899',
  };
  return colors[category];
};

export const checkBroadcastTriggers = (
  gates: Gate[],
  exits: Exit[],
  broadcasts: Broadcast[],
  currentTime: number,
  lastBroadcastTimes: Record<string, number>
): Array<{ broadcast: Broadcast; locationRef: string; delay: number }> => {
  const missed: Array<{ broadcast: Broadcast; locationRef: string; delay: number }> = [];

  for (const broadcast of broadcasts) {
    if (!broadcast.triggerCondition) continue;

    for (const locationRef of broadcast.relatedLocations) {
      let shouldHaveTriggered = false;
      let triggerTime = 0;

      if (broadcast.triggerCondition === 'gate_fault' && locationRef.startsWith('gate-')) {
        const gate = gates.find((g) => g.id === locationRef);
        if (gate?.isFaulty) {
          shouldHaveTriggered = true;
          triggerTime = currentTime - 15;
        }
      }

      if (broadcast.triggerCondition === 'exit_congestion' && locationRef.startsWith('exit-')) {
        const exit = exits.find((e) => e.id === locationRef);
        if (exit && exit.congestionLevel > 0.6) {
          shouldHaveTriggered = true;
          triggerTime = currentTime - 10;
        }
      }

      if (broadcast.triggerCondition === 'lockdown_set' && locationRef.startsWith('gate-')) {
        const gate = gates.find((g) => g.id === locationRef);
        if (gate?.isFaulty) {
          shouldHaveTriggered = true;
          triggerTime = currentTime - 20;
        }
      }

      const lastPlayed = lastBroadcastTimes[broadcast.id] ?? 0;
      if (shouldHaveTriggered && lastPlayed < triggerTime) {
        missed.push({
          broadcast,
          locationRef,
          delay: currentTime - triggerTime,
        });
      }
    }
  }

  return missed;
};
