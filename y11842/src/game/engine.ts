import type { NodeState, Penalty, EventLog, PendingItem, ConclusionDiff } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const calculatePenalties = (
  nodes: NodeState[],
  round: number,
  pendingItems: PendingItem[]
): { penalties: Penalty[]; updatedNodes: NodeState[]; logs: EventLog[] } => {
  const penalties: Penalty[] = [];
  const updatedNodes: NodeState[] = [];
  const logs: EventLog[] = [];

  for (const node of nodes) {
    let updatedNode = { ...node };

    if (!node.isOnline) {
      updatedNode.consecutiveOfflineRounds++;
      if (updatedNode.consecutiveOfflineRounds >= 2) {
        const penaltyAmount = Math.floor(node.stakeAmount * 0.1);
        const penalty: Penalty = {
          id: generateId(),
          nodeId: node.id,
          nodeName: node.name,
          round,
          type: 'offline',
          amount: penaltyAmount,
          reason: `节点连续离线${updatedNode.consecutiveOfflineRounds}回合`,
          isMissed: false,
        };
        penalties.push(penalty);
        updatedNode.stakeAmount = Math.max(0, updatedNode.stakeAmount - penaltyAmount);
        updatedNode.healthScore = Math.max(0, updatedNode.healthScore - 10);

        logs.push({
          id: generateId(),
          round,
          type: 'penalty',
          message: `⚠️ ${node.name} 因离线被惩罚 ${penaltyAmount} 质押量`,
          severity: 'error',
          timestamp: new Date(),
        });
      }
    } else {
      updatedNode.consecutiveOfflineRounds = 0;
    }

    if (node.syncProgress < 50) {
      updatedNode.syncLagRounds++;
      if (updatedNode.syncLagRounds >= 3) {
        const penaltyAmount = 20;
        const penalty: Penalty = {
          id: generateId(),
          nodeId: node.id,
          nodeName: node.name,
          round,
          type: 'sync_violation',
          amount: penaltyAmount,
          reason: `同步进度<50%持续${updatedNode.syncLagRounds}回合`,
          isMissed: false,
        };
        penalties.push(penalty);
        updatedNode.healthScore = Math.max(0, updatedNode.healthScore - penaltyAmount);

        logs.push({
          id: generateId(),
          round,
          type: 'penalty',
          message: `⚠️ ${node.name} 因同步落后被惩罚 ${penaltyAmount} 健康分`,
          severity: 'error',
          timestamp: new Date(),
        });
      }
    } else {
      updatedNode.syncLagRounds = 0;
    }

    if (node.hasDuplicateStake) {
      const existingPenalty = penalties.find(
        (p) => p.nodeId === node.id && p.type === 'duplicate_stake'
      );
      if (!existingPenalty) {
        const penaltyAmount = Math.floor(node.stakeAmount * 0.15);
        const penalty: Penalty = {
          id: generateId(),
          nodeId: node.id,
          nodeName: node.name,
          round,
          type: 'duplicate_stake',
          amount: penaltyAmount,
          reason: '检测到重复质押标记',
          isMissed: false,
        };
        penalties.push(penalty);
        updatedNode.stakeAmount = Math.max(0, updatedNode.stakeAmount - penaltyAmount);

        logs.push({
          id: generateId(),
          round,
          type: 'penalty',
          message: `⚠️ ${node.name} 因重复质押被惩罚 ${penaltyAmount} 质押量`,
          severity: 'error',
          timestamp: new Date(),
        });
      }
    }

    updatedNodes.push(updatedNode);
  }

  for (const item of pendingItems) {
    if (!item.isResolved && item.roundsPending >= 3) {
      const penalty: Penalty = {
        id: generateId(),
        nodeId: item.nodeId,
        nodeName: item.nodeName,
        round,
        type: item.type === 'duplicate_stake' ? 'duplicate_stake' : 'sync_violation',
        amount: 50,
        reason: `待确认事项超过3回合未处理 - ${item.description}`,
        isMissed: true,
      };
      penalties.push(penalty);

      logs.push({
        id: generateId(),
        round,
        type: 'penalty',
        message: `❌ 运营失误：${item.nodeName} 的待确认事项超时未处理，追加惩罚`,
        severity: 'error',
        timestamp: new Date(),
      });
    }
  }

  return { penalties, updatedNodes, logs };
};

export const calculateConclusionDiffs = (
  originalNodes: NodeState[],
  supplementData: Record<string, number>
): ConclusionDiff[] => {
  const diffs: ConclusionDiff[] = [];

  for (const node of originalNodes) {
    const actualSync = supplementData[node.id];
    if (actualSync !== undefined && actualSync !== node.syncProgress) {
      const oldConclusion = node.syncProgress >= 80 ? '同步正常' : node.syncProgress >= 50 ? '同步延迟' : '同步严重落后';
      const newConclusion = actualSync >= 80 ? '同步正常' : actualSync >= 50 ? '同步延迟' : '同步严重落后';
      
      if (oldConclusion !== newConclusion) {
        diffs.push({
          field: `${node.name} - 同步状态结论`,
          oldValue: `${node.syncProgress}% (${oldConclusion})`,
          newValue: `${actualSync}% (${newConclusion})`,
          conclusionChange: `"${oldConclusion}" → "${newConclusion}"`,
          isCritical: Math.abs(actualSync - node.syncProgress) >= 20,
        });
      }

      diffs.push({
        field: `${node.name} - 同步进度数值`,
        oldValue: `${node.syncProgress}%`,
        newValue: `${actualSync}%`,
        conclusionChange: `偏差 ${Math.abs(actualSync - node.syncProgress)} 个百分点`,
        isCritical: Math.abs(actualSync - node.syncProgress) >= 15,
      });
    }
  }

  return diffs;
};

export const generatePendingItems = (
  nodes: NodeState[],
  round: number,
  existingItems: PendingItem[]
): PendingItem[] => {
  const items: PendingItem[] = existingItems
    .filter((item) => !item.isResolved)
    .map((item) => ({ ...item, roundsPending: item.roundsPending + 1 }));

  for (const node of nodes) {
    if (node.hasDuplicateStake) {
      const existing = items.find(
        (i) => i.nodeId === node.id && i.type === 'duplicate_stake'
      );
      if (!existing) {
        items.push({
          id: generateId(),
          nodeId: node.id,
          nodeName: node.name,
          type: 'duplicate_stake',
          description: '检测到重复质押，需要立即处理',
          roundsPending: 0,
          isResolved: false,
        });
      }
    }

    if (node.syncProgress < 50 && node.syncLagRounds >= 1) {
      const existing = items.find(
        (i) => i.nodeId === node.id && i.type === 'sync_lag'
      );
      if (!existing) {
        items.push({
          id: generateId(),
          nodeId: node.id,
          nodeName: node.name,
          type: 'sync_lag',
          description: `同步进度仅${node.syncProgress}%，严重落后`,
          roundsPending: 0,
          isResolved: false,
        });
      }
    }
  }

  return items;
};

export const calculateFinalScore = (
  nodes: NodeState[],
  totalPenalties: number,
  resourcePoints: number
): number => {
  const avgSync = nodes.reduce((sum, n) => sum + n.syncProgress, 0) / nodes.length;
  const avgHealth = nodes.reduce((sum, n) => sum + n.healthScore, 0) / nodes.length;
  const totalStake = nodes.reduce((sum, n) => sum + n.stakeAmount, 0);
  const onlineNodes = nodes.filter((n) => n.isOnline).length;

  const score =
    avgSync * 2 +
    avgHealth * 1.5 +
    totalStake * 0.1 +
    onlineNodes * 50 +
    resourcePoints * 0.5 -
    totalPenalties * 2;

  return Math.max(0, Math.round(score));
};
