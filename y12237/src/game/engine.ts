import {
  ValidatorNode,
  StakeRecord,
  PenaltyEvent,
  RewardEvent,
  RoundResult,
  GameState,
  PenaltyType,
} from './types';
import { GAME_CONFIG, RISK_LEVEL_CONFIG, PENALTY_TEMPLATES } from './config';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const calculateNodeStake = (nodeId: string, stakeRecords: StakeRecord[]): number => {
  return stakeRecords
    .filter((s) => s.nodeId === nodeId && !s.isUnlocked)
    .reduce((sum, s) => sum + s.amount, 0);
};

export const isDuplicateStake = (nodeId: string, stakeRecords: StakeRecord[]): boolean => {
  return stakeRecords.some((s) => s.nodeId === nodeId && !s.isUnlocked);
};

export const calculateDuplicatePenaltyMultiplier = (
  nodeId: string,
  stakeRecords: StakeRecord[]
): number => {
  const stakeCount = stakeRecords.filter((s) => s.nodeId === nodeId && !s.isUnlocked).length;
  return stakeCount > 0 ? Math.pow(GAME_CONFIG.DUPLICATE_PENALTY_MULTIPLIER, stakeCount) : 1;
};

export const shouldNodeGoOffline = (node: ValidatorNode): boolean => {
  const riskConfig = RISK_LEVEL_CONFIG[node.riskLevel];
  return Math.random() < riskConfig.offlineChance;
};

export const calculateOfflinePenalty = (
  node: ValidatorNode,
  stakeAmount: number,
  round: number
): PenaltyEvent | null => {
  if (stakeAmount <= 0) return null;

  const riskConfig = RISK_LEVEL_CONFIG[node.riskLevel];
  const penaltyAmount = Math.round(
    stakeAmount * riskConfig.basePenaltyRate * node.penaltyCoefficient
  );

  const template = PENALTY_TEMPLATES.offline;
  const details = template.reasonTemplate(
    node.name,
    round,
    node.uptime,
    RISK_LEVEL_CONFIG[node.riskLevel].label
  );
  details.push(`计算公式：${template.formula}`);
  details.push(`实际计算：${stakeAmount} × ${riskConfig.basePenaltyRate} × ${node.penaltyCoefficient} = ${penaltyAmount}`);

  return {
    id: generateId(),
    type: 'offline',
    nodeId: node.id,
    nodeName: node.name,
    round,
    amount: penaltyAmount,
    reason: `节点 ${node.name} 离线`,
    suggestion: template.suggestions.join('\n'),
    details,
    timestamp: Date.now(),
  };
};

export const calculateUnlockMisclickPenalty = (
  requestRound: number,
  expectedReward: number,
  nodeName: string,
  nodeId: string
): PenaltyEvent | null => {
  const nextSettlementRound =
    Math.ceil(requestRound / GAME_CONFIG.REWARD_SETTLEMENT_INTERVAL) *
    GAME_CONFIG.REWARD_SETTLEMENT_INTERVAL;
  const roundsUntilSettlement = nextSettlementRound - requestRound;

  if (roundsUntilSettlement <= GAME_CONFIG.UNLOCK_MISCLICK_THRESHOLD && expectedReward > 0) {
    const penaltyAmount = Math.round(expectedReward * 0.5);
    const template = PENALTY_TEMPLATES.unlock_misclick;
    const details = template.reasonTemplate(requestRound, nextSettlementRound);
    details.push(`计算公式：${template.formula}`);
    details.push(`实际计算：${expectedReward} × 50% = ${penaltyAmount}`);

    return {
      id: generateId(),
      type: 'unlock_misclick',
      nodeId,
      nodeName,
      round: requestRound,
      amount: penaltyAmount,
      reason: '解锁时机不当',
      suggestion: template.suggestions.join('\n'),
      details,
      timestamp: Date.now(),
    };
  }

  return null;
};

export const createDuplicateStakeWarning = (
  node: ValidatorNode,
  round: number
): PenaltyEvent => {
  const template = PENALTY_TEMPLATES.duplicate;
  const details = template.reasonTemplate(node.name);
  details.push(`风险说明：${template.formula}`);

  return {
    id: generateId(),
    type: 'duplicate',
    nodeId: node.id,
    nodeName: node.name,
    round,
    amount: 0,
    reason: '重复质押风险提示',
    suggestion: template.suggestions.join('\n'),
    details,
    timestamp: Date.now(),
  };
};

export const calculateReward = (
  node: ValidatorNode,
  stakeAmount: number,
  round: number
): RewardEvent | null => {
  if (stakeAmount <= 0 || !node.isOnline) return null;

  const roundYieldRate = node.yieldRate / 100 / 12;
  const rewardAmount = Math.round(stakeAmount * roundYieldRate);

  return {
    id: generateId(),
    nodeId: node.id,
    nodeName: node.name,
    round,
    amount: rewardAmount,
    yieldRate: node.yieldRate,
    timestamp: Date.now(),
  };
};

export const processRound = (
  nodes: ValidatorNode[],
  stakeRecords: StakeRecord[],
  currentRound: number
): RoundResult => {
  const rewards: RewardEvent[] = [];
  const penalties: PenaltyEvent[] = [];
  const nodeUpdates: Partial<ValidatorNode>[] = [];

  const updatedNodes = nodes.map((node) => {
    const wasOnline = node.isOnline;
    const goesOffline = shouldNodeGoOffline(node);
    const isOnline = !goesOffline;

    if (goesOffline) {
      nodeUpdates.push({ id: node.id, isOnline: false });
    } else if (!wasOnline && Math.random() < 0.7) {
      nodeUpdates.push({ id: node.id, isOnline: true });
    }

    const stakeAmount = calculateNodeStake(node.id, stakeRecords);

    if (goesOffline) {
      const penalty = calculateOfflinePenalty({ ...node, isOnline: false }, stakeAmount, currentRound);
      if (penalty) {
        penalties.push(penalty);
      }
    }

    if (isOnline && stakeAmount > 0) {
      const reward = calculateReward({ ...node, isOnline }, stakeAmount, currentRound);
      if (reward) {
        rewards.push(reward);
      }
    }

    return { ...node, isOnline: goesOffline ? false : !wasOnline ? Math.random() < 0.7 : wasOnline };
  });

  nodeUpdates.forEach((update) => {
    const index = updatedNodes.findIndex((n) => n.id === update.id);
    if (index !== -1 && update.isOnline !== undefined) {
      updatedNodes[index].isOnline = update.isOnline;
    }
  });

  return { rewards, penalties, nodeUpdates: updatedNodes.map((n) => ({ id: n.id, isOnline: n.isOnline })) };
};

export const calculateExpectedReward = (
  node: ValidatorNode,
  stakeAmount: number,
  rounds: number
): number => {
  const roundYieldRate = node.yieldRate / 100 / 12;
  return Math.round(stakeAmount * roundYieldRate * rounds);
};

export const getNextSettlementRound = (currentRound: number): number => {
  return (
    Math.ceil(currentRound / GAME_CONFIG.REWARD_SETTLEMENT_INTERVAL) *
    GAME_CONFIG.REWARD_SETTLEMENT_INTERVAL
  );
};

export const isSettlementRound = (round: number): boolean => {
  return round % GAME_CONFIG.REWARD_SETTLEMENT_INTERVAL === 0;
};

export const calculateFinalScore = (state: GameState): { score: number; grade: string; analysis: string[] } => {
  const returnRate = ((state.totalBalance - state.initialBalance) / state.initialBalance) * 100;
  const penaltyCount = state.penaltyEvents.filter((p) => p.type === 'offline').length;
  const duplicateCount = state.penaltyEvents.filter((p) => p.type === 'duplicate').length;

  let score = 100;
  const analysis: string[] = [];

  score += returnRate * 2;
  score -= penaltyCount * 15;
  score -= duplicateCount * 5;

  if (returnRate > 5) {
    analysis.push(`🎉 收益率 ${returnRate.toFixed(1)}%，表现优秀！`);
  } else if (returnRate > 0) {
    analysis.push(`📈 收益率 ${returnRate.toFixed(1)}%，稳步增长`);
  } else {
    analysis.push(`📉 收益率 ${returnRate.toFixed(1)}%，需要优化策略`);
  }

  if (penaltyCount === 0) {
    analysis.push('✅ 无离线惩罚，节点选择策略优秀');
  } else {
    analysis.push(`⚠️ 发生 ${penaltyCount} 次离线惩罚，建议分散风险`);
    score = Math.max(0, score);
  }

  if (duplicateCount === 0) {
    analysis.push('✅ 质押分散合理');
  } else {
    analysis.push(`💡 存在 ${duplicateCount} 次重复质押，注意集中度风险`);
  }

  let grade = 'F';
  if (score >= 90) grade = 'S';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 50) grade = 'D';

  return { score: Math.max(0, Math.round(score)), grade, analysis };
};
