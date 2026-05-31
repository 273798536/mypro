import { create } from 'zustand';
import type {
  RiskLevel,
  GameState,
  Operation,
  GameStateWithHistory,
  GraphNode,
  RiskReport,
  FalsePositiveItem,
  ChainLengthIssue,
  TagLagIssue,
  Level,
} from '../types';
import { getLevelById } from '../data/levels';

interface GameStore {
  stateWithHistory: GameStateWithHistory | null;
  currentLevel: Level | null;
  selectedNodeId: string | null;
  showFailureModal: boolean;
  latestFeedback: string | null;
  feedbackType: 'success' | 'error' | 'warning' | null;
  loadLevel: (levelId: string) => void;
  markNode: (nodeId: string, level: RiskLevel) => void;
  undo: () => void;
  redo: () => void;
  submit: () => void;
  reset: () => void;
  jumpToStep: (stepIndex: number) => void;
  setSelectedNode: (nodeId: string | null) => void;
  closeFailureModal: () => void;
  clearFeedback: () => void;
  generateReport: () => RiskReport | null;
}

function createInitialState(levelId: string): GameState {
  const level = getLevelById(levelId);
  if (!level) throw new Error(`Level ${levelId} not found`);

  const nodeStates: Record<string, RiskLevel> = {};
  level.nodes.forEach((node) => {
    nodeStates[node.id] = 'unknown';
  });

  return {
    levelId,
    status: 'playing',
    mistakes: 0,
    nodeStates,
    operations: [],
    startTime: new Date().toISOString(),
  };
}

function checkMarkCorrectness(
  node: GraphNode,
  newValue: RiskLevel,
  level: Level
): { isCorrect: boolean; feedback: string } {
  const trueLevel = node.trueRiskLevel;

  if (newValue === trueLevel) {
    return { isCorrect: true, feedback: `标记正确！${node.name} 确实是${getRiskLevelText(trueLevel)}。` };
  }

  if (node.falsePositiveType) {
    if (node.falsePositiveType === 'device-sharing') {
      return {
        isCorrect: false,
        feedback: `误伤警告！${node.name} 是正常用户，与其他用户共享设备但无风险行为。证据：${node.falsePositiveReason}`,
      };
    }
    if (node.falsePositiveType === 'chain-too-long') {
      return {
        isCorrect: false,
        feedback: `关系链过长误判！${node.name} 与核心风险节点的关系链已达${node.chainLength}度，属于过度关联。证据：${node.falsePositiveReason}`,
      };
    }
    if (node.falsePositiveType === 'tag-lag' && node.tagLagInfo) {
      return {
        isCorrect: false,
        feedback: `标签滞后误判！${node.name} 的风险标签已从${getRiskLevelText(node.tagLagInfo.oldTag)}更新为${getRiskLevelText(node.tagLagInfo.newTag)}。请查看最新材料。证据：${node.tagLagInfo.evidence}`,
      };
    }
  }

  if (node.tagLagInfo && newValue === node.tagLagInfo.oldTag) {
    return {
      isCorrect: false,
      feedback: `标签滞后！${node.name} 的风险状态已变化。历史标签为${getRiskLevelText(node.tagLagInfo.oldTag)}，最新状态为${getRiskLevelText(node.tagLagInfo.newTag)}。`,
    };
  }

  if (newValue === 'blacklist' && trueLevel !== 'blacklist') {
    return {
      isCorrect: false,
      feedback: `误判！${node.name} 不应被标记为黑名单。正确等级是${getRiskLevelText(trueLevel)}。请仔细查看相关材料。`,
    };
  }

  if (newValue === 'safe' && trueLevel !== 'safe') {
    return {
      isCorrect: false,
      feedback: `漏判！${node.name} 存在风险，正确等级是${getRiskLevelText(trueLevel)}。请查看相关材料寻找证据。`,
    };
  }

  return {
    isCorrect: false,
    feedback: `标记错误。${node.name} 的正确风险等级是${getRiskLevelText(trueLevel)}，你标记为${getRiskLevelText(newValue)}。`,
  };
}

function getRiskLevelText(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    unknown: '未标记',
    safe: '安全',
    suspicious: '可疑',
    blacklist: '黑名单',
  };
  return map[level];
}

function getActionType(level: RiskLevel): 'mark-safe' | 'mark-suspicious' | 'mark-blacklist' {
  if (level === 'safe') return 'mark-safe';
  if (level === 'suspicious') return 'mark-suspicious';
  return 'mark-blacklist';
}

function findChainLengthIssues(level: Level): ChainLengthIssue[] {
  const issues: ChainLengthIssue[] = [];
  const blacklistNodes = level.nodes.filter((n) => n.trueRiskLevel === 'blacklist');

  level.nodes.forEach((node) => {
    if (node.chainLength && node.chainLength >= 3 && node.trueRiskLevel === 'safe') {
      const chain: string[] = [];
      const currentId = node.id;
      const visited = new Set<string>();

      function traceBack(id: string, depth: number, maxDepth: number): boolean {
        if (depth > maxDepth || visited.has(id)) return false;
        visited.add(id);

        const currentNode = level.nodes.find((n) => n.id === id);
        if (!currentNode) return false;

        if (currentNode.trueRiskLevel === 'blacklist') {
          chain.unshift(currentNode.name);
          return true;
        }

        const incomingEdges = level.edges.filter((e) => e.targetId === id);
        for (const edge of incomingEdges) {
          if (traceBack(edge.sourceId, depth + 1, maxDepth)) {
            chain.unshift(currentNode.name);
            return true;
          }
        }
        return false;
      }

      traceBack(node.id, 0, node.chainLength);

      issues.push({
        chain,
        chainLength: node.chainLength,
        description: `节点 ${node.name} 与黑名单节点的关系链长达 ${node.chainLength} 度，容易造成过度关联误判。`,
        suggestion: `对于关系链超过2度的节点，需要结合具体业务场景和交易行为进行判断，不能简单地"一人得道，鸡犬升天"。`,
      });
    }
  });

  return issues;
}

function findFalsePositives(
  level: Level,
  nodeStates: Record<string, RiskLevel>
): FalsePositiveItem[] {
  const items: FalsePositiveItem[] = [];

  level.nodes.forEach((node) => {
    const playerMark = nodeStates[node.id];
    if (playerMark !== node.trueRiskLevel) {
      items.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        playerMark,
        correctMark: node.trueRiskLevel,
        reason: node.falsePositiveReason || '未正确识别风险等级',
        evidence: node.tagLagInfo?.evidence || '请查看相关材料进行核实',
      });
    }
  });

  return items;
}

function findTagLagIssues(level: Level): TagLagIssue[] {
  const issues: TagLagIssue[] = [];

  level.nodes.forEach((node) => {
    if (node.tagLagInfo) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        oldTag: node.tagLagInfo.oldTag,
        newTag: node.tagLagInfo.newTag,
        timeDiff: node.tagLagInfo.updateTime,
        impact: `如果使用历史标签${getRiskLevelText(node.tagLagInfo.oldTag)}进行判断，会导致${getRiskLevelText(node.tagLagInfo.oldTag) === 'blacklist' ? '误伤正常用户' : '漏判高风险用户'}。`,
      });
    }
  });

  return issues;
}

export const useGameStore = create<GameStore>((set, get) => ({
  stateWithHistory: null,
  currentLevel: null,
  selectedNodeId: null,
  showFailureModal: false,
  latestFeedback: null,
  feedbackType: null,

  loadLevel: (levelId: string) => {
    const level = getLevelById(levelId);
    if (!level) return;

    const initialState = createInitialState(levelId);
    set({
      currentLevel: level,
      stateWithHistory: {
        past: [],
        present: initialState,
        future: [],
      },
      selectedNodeId: null,
      showFailureModal: false,
      latestFeedback: null,
      feedbackType: null,
    });
  },

  markNode: (nodeId: string, level: RiskLevel) => {
    const { stateWithHistory, currentLevel } = get();
    if (!stateWithHistory || !currentLevel) return;
    if (stateWithHistory.present.status !== 'playing') return;

    const node = currentLevel.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const { past, present } = stateWithHistory;
    const oldValue = present.nodeStates[nodeId];

    if (oldValue === level) return;

    const { isCorrect, feedback } = checkMarkCorrectness(node, level, currentLevel);

    const operation: Operation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      action: getActionType(level),
      oldValue,
      newValue: level,
      timestamp: new Date().toISOString(),
      isCorrect,
      feedback,
    };

    const newMistakes = isCorrect ? present.mistakes : present.mistakes + 1;
    const newNodeStates = { ...present.nodeStates, [nodeId]: level };
    const newOperations = [...present.operations, operation];

    let newStatus = present.status;
    let showFailure = false;

    if (newMistakes >= currentLevel.maxMistakes) {
      newStatus = 'failed';
      showFailure = true;
    }

    const allMarked = Object.values(newNodeStates).every((s) => s !== 'unknown');
    if (allMarked && newStatus === 'playing') {
      const correctCount = newOperations.filter((op) => op.isCorrect).length;
      const totalCount = newOperations.length;
      if (correctCount / totalCount >= 0.7) {
        newStatus = 'completed';
      }
    }

    const newPresent: GameState = {
      ...present,
      mistakes: newMistakes,
      nodeStates: newNodeStates,
      operations: newOperations,
      status: newStatus,
      endTime: newStatus !== 'playing' ? new Date().toISOString() : undefined,
    };

    set({
      stateWithHistory: {
        past: [...past, present],
        present: newPresent,
        future: [],
      },
      showFailureModal: showFailure,
      latestFeedback: feedback,
      feedbackType: isCorrect ? 'success' : 'error',
    });
  },

  undo: () => {
    const { stateWithHistory } = get();
    if (!stateWithHistory || stateWithHistory.past.length === 0) return;

    const { past, present, future } = stateWithHistory;
    const newPresent = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      stateWithHistory: {
        past: newPast,
        present: newPresent,
        future: [present, ...future],
      },
    });
  },

  redo: () => {
    const { stateWithHistory } = get();
    if (!stateWithHistory || stateWithHistory.future.length === 0) return;

    const { past, present, future } = stateWithHistory;
    const newPresent = future[0];
    const newFuture = future.slice(1);

    set({
      stateWithHistory: {
        past: [...past, present],
        present: newPresent,
        future: newFuture,
      },
    });
  },

  submit: () => {
    const { stateWithHistory, currentLevel } = get();
    if (!stateWithHistory || !currentLevel) return;

    const { present } = stateWithHistory;

    const allMarked = Object.values(present.nodeStates).every((s) => s !== 'unknown');
    if (!allMarked) {
      set({
        latestFeedback: '还有节点未标记，请先标记所有节点后再提交。',
        feedbackType: 'warning',
      });
      return;
    }

    const correctCount = present.operations.filter((op) => op.isCorrect).length;
    const totalCount = present.operations.length;
    const accuracy = correctCount / totalCount;

    const newStatus: GameState['status'] = accuracy >= 0.7 ? 'completed' : 'failed';

    set({
      stateWithHistory: {
        ...stateWithHistory,
        present: {
          ...present,
          status: newStatus,
          endTime: new Date().toISOString(),
        },
      },
      showFailureModal: newStatus === 'failed',
    });
  },

  reset: () => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    get().loadLevel(currentLevel.id);
  },

  jumpToStep: (stepIndex: number) => {
    const { stateWithHistory } = get();
    if (!stateWithHistory) return;

    const { past, present, future } = stateWithHistory;
    const allStates = [...past, present, ...future];

    if (stepIndex < 0 || stepIndex >= allStates.length) return;

    const newPast = allStates.slice(0, stepIndex);
    const newPresent = allStates[stepIndex];
    const newFuture = allStates.slice(stepIndex + 1);

    set({
      stateWithHistory: {
        past: newPast,
        present: newPresent,
        future: newFuture,
      },
    });
  },

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  closeFailureModal: () => {
    set({ showFailureModal: false });
  },

  clearFeedback: () => {
    set({ latestFeedback: null, feedbackType: null });
  },

  generateReport: (): RiskReport | null => {
    const { stateWithHistory, currentLevel } = get();
    if (!stateWithHistory || !currentLevel) return null;

    const { present } = stateWithHistory;

    const blacklistCount = Object.values(present.nodeStates).filter(
      (s) => s === 'blacklist'
    ).length;
    const safeCount = Object.values(present.nodeStates).filter((s) => s === 'safe').length;
    const suspiciousCount = Object.values(present.nodeStates).filter(
      (s) => s === 'suspicious'
    ).length;

    const correctCount = present.operations.filter((op) => op.isCorrect).length;
    const totalCount = present.operations.length;
    const accuracyRate = totalCount > 0 ? correctCount / totalCount : 0;

    const falsePositives = findFalsePositives(currentLevel, present.nodeStates);
    const chainLengthIssues = findChainLengthIssues(currentLevel);
    const tagLagIssues = findTagLagIssues(currentLevel);

    const trainingPoints: string[] = [];

    if (currentLevel.focusPoint === 'chain-length') {
      trainingPoints.push(
        '关系链传导不是线性的，超过3度的关联需要结合具体证据判断，不能简单牵连。',
        '核心风险节点的直接关联（1-2度）风险较高，但也需要验证交易行为的异常性。',
        '正常的商业往来（如供应商、客户）即使有资金往来也不构成风险。'
      );
    } else if (currentLevel.focusPoint === 'device-sharing') {
      trainingPoints.push(
        '设备共享不等于风险关联，需要区分家人共用、同事共用与团伙作案。',
        '判断设备共享是否有风险，关键看账户之间的资金往来和交易行为，而不仅仅是共用设备。',
        '稳定的家庭/办公场景下的设备共享通常是正常的，频繁更换设备和IP才是风险信号。'
      );
    } else if (currentLevel.focusPoint === 'tag-lag') {
      trainingPoints.push(
        '风险标签有保质期，必须关注标签的更新时间，历史标签不能代表当前状态。',
        '曾经有风险不代表永远有风险，信用修复、案件解决后标签应及时更新。',
        '原本安全的用户也可能变成高风险，持续监控和动态更新标签至关重要。',
        '做出判断前，务必查看最新的材料和证据，不要被历史标签先入为主。'
      );
    }

    return {
      levelId: currentLevel.id,
      levelTitle: currentLevel.title,
      generateTime: new Date().toISOString(),
      totalNodes: currentLevel.nodes.length,
      blacklistCount,
      safeCount,
      suspiciousCount,
      falsePositives,
      chainLengthIssues,
      tagLagIssues,
      playerOperations: present.operations,
      accuracyRate,
      trainingPoints,
    };
  },
}));
