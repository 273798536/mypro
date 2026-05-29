import { Gate, Broadcast, ChangeRecord, GameResult, ResultComparison } from '../types';

const CHANGE_HISTORY_KEY = 'metro_evacuation_change_history';

export const detectGateChanges = (
  oldConfig: Gate[],
  newConfig: Gate[]
): ChangeRecord[] => {
  const changes: ChangeRecord[] = [];

  for (const newGate of newConfig) {
    const oldGate = oldConfig.find((g) => g.id === newGate.id);
    if (!oldGate) continue;

    const oldStr = JSON.stringify(oldGate);
    const newStr = JSON.stringify(newGate);

    if (oldStr !== newStr) {
      const affectedConclusions = findAffectedConclusions('gate', newGate.id, oldGate, newGate);

      changes.push({
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'gate_modified',
        entityId: newGate.id,
        oldValue: oldGate,
        newValue: newGate,
        affectedConclusions,
      });
    }
  }

  return changes;
};

export const detectBroadcastChanges = (
  oldBroadcasts: Broadcast[],
  newBroadcasts: Broadcast[]
): ChangeRecord[] => {
  const changes: ChangeRecord[] = [];

  for (const newBroadcast of newBroadcasts) {
    const oldBroadcast = oldBroadcasts.find((b) => b.id === newBroadcast.id);

    if (!oldBroadcast) {
      const affectedConclusions = findAffectedConclusions('broadcast', newBroadcast.id, null, newBroadcast);

      changes.push({
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'broadcast_added',
        entityId: newBroadcast.id,
        oldValue: null,
        newValue: newBroadcast,
        affectedConclusions,
      });
    } else {
      const oldStr = JSON.stringify(oldBroadcast);
      const newStr = JSON.stringify(newBroadcast);

      if (oldStr !== newStr) {
        const affectedConclusions = findAffectedConclusions(
          'broadcast',
          newBroadcast.id,
          oldBroadcast,
          newBroadcast
        );

        changes.push({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type: 'broadcast_modified',
          entityId: newBroadcast.id,
          oldValue: oldBroadcast,
          newValue: newBroadcast,
          affectedConclusions,
        });
      }
    }
  }

  return changes;
};

const findAffectedConclusions = (
  entityType: 'gate' | 'broadcast' | 'map',
  entityId: string,
  oldValue: unknown,
  newValue: unknown
): string[] => {
  const conclusions: string[] = [];

  if (entityType === 'gate') {
    const oldGate = oldValue as Gate | null;
    const newGate = newValue as Gate;

    if (oldGate && oldGate.position !== newGate.position) {
      conclusions.push(`站厅地图中${newGate.name}的位置已变更，可能影响拥堵热点结论`);
    }
    if (oldGate && oldGate.capacity !== newGate.capacity) {
      conclusions.push(`${newGate.name}通行能力从${oldGate.capacity}调整为${newGate.capacity}，将影响疏散效率评分`);
    }
    if (oldGate && oldGate.status !== newGate.status) {
      conclusions.push(`${newGate.name}初始状态从"${oldGate.status}"改为"${newGate.status}"，安全风险结论需要重新评估`);
    }
    if (oldGate && oldGate.isFaulty !== newGate.isFaulty) {
      conclusions.push(`${newGate.name}是否故障的初始设置已变更，相关分流策略结论需要更新`);
    }
  }

  if (entityType === 'broadcast') {
    const newBroadcast = newValue as Broadcast;

    if (oldValue === null) {
      conclusions.push(`新增广播"${newBroadcast.title}"，相关触发条件和冷却时间已录入`);
      if (newBroadcast.relatedLocations.length > 0) {
        conclusions.push(`该广播关联位置：${newBroadcast.relatedLocations.join('、')}，这些位置的漏发检测逻辑已更新`);
      }
    } else {
      const oldBroadcast = oldValue as Broadcast;

      if (oldBroadcast.content !== newBroadcast.content) {
        conclusions.push(`广播"${newBroadcast.title}"的内容已修改`);
      }
      if (oldBroadcast.cooldownSeconds !== newBroadcast.cooldownSeconds) {
        conclusions.push(
          `广播"${newBroadcast.title}"冷却时间从${oldBroadcast.cooldownSeconds}秒改为${newBroadcast.cooldownSeconds}秒`
        );
      }
      if (JSON.stringify(oldBroadcast.relatedLocations) !== JSON.stringify(newBroadcast.relatedLocations)) {
        conclusions.push(`广播"${newBroadcast.title}"关联位置已变更，相关漏发检测需要重新运行`);
      }
      if (oldBroadcast.triggerCondition !== newBroadcast.triggerCondition) {
        conclusions.push(`广播"${newBroadcast.title}"触发条件已变更`);
      }
    }
  }

  return conclusions;
};

export const saveChangeHistory = (changes: ChangeRecord[]): void => {
  try {
    const existing = loadChangeHistory();
    const updated = [...changes, ...existing];
    localStorage.setItem(CHANGE_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save change history:', e);
  }
};

export const loadChangeHistory = (): ChangeRecord[] => {
  try {
    const stored = localStorage.getItem(CHANGE_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load change history:', e);
  }
  return [];
};

export const compareResults = (oldResult: GameResult, newResult: GameResult): ResultComparison => {
  const differences: ResultComparison['differences'] = [];

  if (oldResult.totalScore !== newResult.totalScore) {
    const diff = newResult.totalScore - oldResult.totalScore;
    differences.push({
      category: '总分',
      field: 'totalScore',
      oldValue: oldResult.totalScore,
      newValue: newResult.totalScore,
      change: diff > 0 ? 'increase' : 'decrease',
      impact: diff > 0 ? 'positive' : 'negative',
    });
  }

  if (oldResult.grade !== newResult.grade) {
    const gradeOrder = ['F', 'D', 'C', 'B', 'A', 'S'];
    const oldIdx = gradeOrder.indexOf(oldResult.grade);
    const newIdx = gradeOrder.indexOf(newResult.grade);
    differences.push({
      category: '评级',
      field: 'grade',
      oldValue: oldResult.grade,
      newValue: newResult.grade,
      change: 'changed',
      impact: newIdx > oldIdx ? 'positive' : newIdx < oldIdx ? 'negative' : 'neutral',
    });
  }

  const oldSummary = oldResult.simulationSummary;
  const newSummary = newResult.simulationSummary;

  if (oldSummary.evacuatedPassengers !== newSummary.evacuatedPassengers) {
    const diff = newSummary.evacuatedPassengers - oldSummary.evacuatedPassengers;
    differences.push({
      category: '疏散人数',
      field: 'evacuatedPassengers',
      oldValue: oldSummary.evacuatedPassengers,
      newValue: newSummary.evacuatedPassengers,
      change: diff > 0 ? 'increase' : 'decrease',
      impact: diff > 0 ? 'positive' : 'negative',
    });
  }

  if (oldSummary.maxCongestionLevel !== newSummary.maxCongestionLevel) {
    const diff = newSummary.maxCongestionLevel - oldSummary.maxCongestionLevel;
    differences.push({
      category: '最大拥堵指数',
      field: 'maxCongestionLevel',
      oldValue: `${Math.round(oldSummary.maxCongestionLevel * 100)}%`,
      newValue: `${Math.round(newSummary.maxCongestionLevel * 100)}%`,
      change: diff > 0 ? 'increase' : 'decrease',
      impact: diff > 0 ? 'negative' : 'positive',
    });
  }

  if (oldResult.penalties.length !== newResult.penalties.length) {
    const diff = newResult.penalties.length - oldResult.penalties.length;
    differences.push({
      category: '扣分次数',
      field: 'penaltyCount',
      oldValue: oldResult.penalties.length,
      newValue: newResult.penalties.length,
      change: diff > 0 ? 'increase' : 'decrease',
      impact: diff > 0 ? 'negative' : 'positive',
    });
  }

  const oldPenaltyPoints = oldResult.penalties.reduce((sum, p) => sum + p.penaltyPoints, 0);
  const newPenaltyPoints = newResult.penalties.reduce((sum, p) => sum + p.penaltyPoints, 0);

  if (oldPenaltyPoints !== newPenaltyPoints) {
    const diff = newPenaltyPoints - oldPenaltyPoints;
    differences.push({
      category: '总扣分数',
      field: 'totalPenaltyPoints',
      oldValue: oldPenaltyPoints,
      newValue: newPenaltyPoints,
      change: diff > 0 ? 'increase' : 'decrease',
      impact: diff > 0 ? 'negative' : 'positive',
    });
  }

  const categories = ['congestion', 'missed_broadcast', 'wrong_diversion', 'safety_risk', 'cooldown_violation'] as const;
  const categoryLabels: Record<string, string> = {
    congestion: '出口拥堵',
    missed_broadcast: '广播漏发',
    wrong_diversion: '路线绕行',
    safety_risk: '安全风险',
    cooldown_violation: '广播冷却',
  };

  for (const category of categories) {
    const oldCount = oldResult.penalties.filter((p) => p.category === category).length;
    const newCount = newResult.penalties.filter((p) => p.category === category).length;

    if (oldCount !== newCount) {
      const diff = newCount - oldCount;
      differences.push({
        category: `${categoryLabels[category]}次数`,
        field: `${category}_count`,
        oldValue: oldCount,
        newValue: newCount,
        change: diff > 0 ? 'increase' : 'decrease',
        impact: diff > 0 ? 'negative' : 'positive',
      });
    }
  }

  return {
    oldResult,
    newResult,
    differences,
  };
};

export const generateComparisonSummary = (comparison: ResultComparison): string => {
  const { differences } = comparison;
  const positive = differences.filter((d) => d.impact === 'positive').length;
  const negative = differences.filter((d) => d.impact === 'negative').length;

  if (positive === 0 && negative === 0) {
    return '两次结果基本一致，配置变更对结果没有显著影响。';
  }

  const parts: string[] = [];

  if (positive > 0) {
    parts.push(`有${positive}项指标得到改善`);
  }
  if (negative > 0) {
    parts.push(`有${negative}项指标出现恶化`);
  }

  const scoreDiff = differences.find((d) => d.field === 'totalScore');
  if (scoreDiff) {
    const change = scoreDiff.change === 'increase' ? '提升' : '下降';
    const amount = Math.abs((scoreDiff.newValue as number) - (scoreDiff.oldValue as number));
    parts.push(`总分${change}${amount}分`);
  }

  return parts.join('，') + '。';
};
