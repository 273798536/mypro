import { create } from 'zustand';
import type {
  GameState,
  NodeState,
  EventLog,
  DecisionOption,
  Decision,
  ConclusionDiff,
} from '@/types';
import { initialNodes, networkEventPool, generateRoundDecisions } from '@/data/gameData';
import {
  calculatePenalties,
  calculateConclusionDiffs,
  generatePendingItems,
  calculateFinalScore,
} from '@/game/engine';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface GameActions {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  makeDecision: (optionId: string) => void;
  resolvePendingItem: (itemId: string) => void;
  supplementSyncData: (nodeId: string, actualSync: number) => ConclusionDiff[];
  replayDecision: (round: number) => void;
  exitReplay: () => void;
  triggerNewRound: () => void;
}

const createInitialState = (): GameState => ({
  currentRound: 0,
  maxRounds: 10,
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  totalScore: 0,
  totalPenalties: 0,
  resourcePoints: 100,
  nodes: JSON.parse(JSON.stringify(initialNodes)),
  eventLogs: [],
  penalties: [],
  decisions: [],
  pendingItems: [],
  currentDecisionOptions: [],
  awaitingDecision: false,
  replayMode: false,
  replayRound: 0,
  supplementData: {},
  conclusionDiffs: [],
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...createInitialState(),

  startGame: () => {
    set(createInitialState());
    const state = get();
    const initialLog: EventLog = {
      id: generateId(),
      round: 0,
      type: 'system',
      message: '🚀 游戏开始！保护你的验证节点，抵御网络攻击和同步问题。',
      severity: 'info',
      timestamp: new Date(),
    };
    set({ isPlaying: true, currentRound: 1, eventLogs: [initialLog] });
    get().triggerNewRound();
  },

  triggerNewRound: () => {
    const state = get();
    const round = state.currentRound;

    const eventLog: EventLog = {
      id: generateId(),
      round,
      type: 'system',
      message: `📍 第 ${round} 回合开始`,
      severity: 'info',
      timestamp: new Date(),
    };

    const randomEvent = networkEventPool[Math.floor(Math.random() * networkEventPool.length)];
    const affectedNodeIndex = Math.floor(Math.random() * state.nodes.length);
    const affectedNode = state.nodes[affectedNodeIndex];

    const networkLog: EventLog = {
      id: generateId(),
      round,
      type: 'network',
      message: `🌐 ${randomEvent.message}${randomEvent.affectedNodeId ? ` - 影响 ${affectedNode.name}` : ''}`,
      severity: randomEvent.severity,
      timestamp: new Date(),
    };

    let updatedNodes = state.nodes.map((node, idx) => {
      if (idx === affectedNodeIndex && randomEvent.effect) {
        return {
          ...node,
          ...randomEvent.effect,
          syncProgress: Math.max(0, Math.min(100, node.syncProgress + (randomEvent.effect.syncProgress || 0))),
          healthScore: Math.max(0, Math.min(100, node.healthScore + (randomEvent.effect.healthScore || 0))),
        };
      }
      return node;
    });

    const pendingItems = generatePendingItems(updatedNodes, round, state.pendingItems);

    const { penalties, updatedNodes: penalizedNodes, logs: penaltyLogs } = calculatePenalties(
      updatedNodes,
      round,
      pendingItems
    );

    updatedNodes = penalizedNodes;

    const decisionOptions = generateRoundDecisions(round, pendingItems.filter((p) => !p.isResolved).length);

    const totalPenalties = state.totalPenalties + penalties.reduce((sum, p) => sum + p.amount, 0);

    set((prev) => ({
      eventLogs: [...prev.eventLogs, eventLog, networkLog, ...penaltyLogs],
      nodes: updatedNodes,
      penalties: [...prev.penalties, ...penalties],
      pendingItems,
      totalPenalties,
      currentDecisionOptions: decisionOptions,
      awaitingDecision: true,
    }));
  },

  pauseGame: () => set({ isPaused: true }),

  resumeGame: () => set({ isPaused: false }),

  restartGame: () => {
    set(createInitialState());
  },

  endGame: () => {
    const state = get();
    const finalScore = calculateFinalScore(state.nodes, state.totalPenalties, state.resourcePoints);

    const endLog: EventLog = {
      id: generateId(),
      round: state.currentRound,
      type: 'system',
      message: `🏁 游戏结束！最终得分：${finalScore}`,
      severity: 'info',
      timestamp: new Date(),
    };

    set((prev) => ({
      isPlaying: false,
      isGameOver: true,
      totalScore: finalScore,
      eventLogs: [...prev.eventLogs, endLog],
      awaitingDecision: false,
    }));
  },

  makeDecision: (optionId: string) => {
    const state = get();
    const option = state.currentDecisionOptions.find((o) => o.id === optionId);
    if (!option) return;

    const decision: Decision = {
      id: generateId(),
      round: state.currentRound,
      optionId,
      description: option.title,
      consequences: option.effects,
    };

    const decisionLog: EventLog = {
      id: generateId(),
      round: state.currentRound,
      type: 'decision',
      message: `🎯 决策：${option.title}`,
      severity: 'info',
      timestamp: new Date(),
    };

    let updatedNodes = state.nodes.map((node) => {
      let newNode = { ...node };
      
      if (option.effects.syncChange) {
        newNode.syncProgress = Math.max(0, Math.min(100, newNode.syncProgress + option.effects.syncChange));
      }
      
      if (option.effects.onlineChange !== undefined) {
        newNode.isOnline = option.effects.onlineChange;
        if (option.effects.onlineChange) {
          newNode.consecutiveOfflineRounds = 0;
        }
      }

      if (option.title === '处理待确认事项') {
        newNode.hasDuplicateStake = false;
      }

      if (option.title === '紧急修复重复质押') {
        newNode.hasDuplicateStake = false;
      }

      return newNode;
    });

    let pendingItems = state.pendingItems;
    if (option.title === '处理待确认事项' || option.title === '紧急修复重复质押') {
      pendingItems = state.pendingItems.map((item) => ({ ...item, isResolved: true }));
      
      const resolveLog: EventLog = {
        id: generateId(),
        round: state.currentRound,
        type: 'system',
        message: '✅ 待确认事项已处理',
        severity: 'info',
        timestamp: new Date(),
      };
      
      set((prev) => ({
        eventLogs: [...prev.eventLogs, resolveLog],
      }));
    }

    const newResourcePoints = state.resourcePoints - option.effects.resourceCost;

    const nextRound = state.currentRound + 1;
    const shouldEnd = nextRound > state.maxRounds;

    set((prev) => ({
      decisions: [...prev.decisions, decision],
      eventLogs: [...prev.eventLogs, decisionLog],
      nodes: updatedNodes,
      pendingItems,
      resourcePoints: newResourcePoints,
      awaitingDecision: false,
    }));

    if (shouldEnd) {
      setTimeout(() => get().endGame(), 500);
    } else {
      setTimeout(() => {
        set({ currentRound: nextRound });
        get().triggerNewRound();
      }, 500);
    }
  },

  resolvePendingItem: (itemId: string) => {
    set((prev) => ({
      pendingItems: prev.pendingItems.map((item) =>
        item.id === itemId ? { ...item, isResolved: true } : item
      ),
    }));

    const state = get();
    const item = state.pendingItems.find((i) => i.id === itemId);
    if (item) {
      const log: EventLog = {
        id: generateId(),
        round: state.currentRound,
        type: 'system',
        message: `✅ ${item.nodeName} 的 ${item.type === 'duplicate_stake' ? '重复质押' : '同步落后'} 已处理`,
        severity: 'info',
        timestamp: new Date(),
      };
      set((prev) => ({
        eventLogs: [...prev.eventLogs, log],
      }));
    }
  },

  supplementSyncData: (nodeId: string, actualSync: number): ConclusionDiff[] => {
    const state = get();
    const newSupplementData = { ...state.supplementData, [nodeId]: actualSync };
    
    const diffs = calculateConclusionDiffs(state.nodes, newSupplementData);
    
    set({
      supplementData: newSupplementData,
      conclusionDiffs: diffs,
    });

    return diffs;
  },

  replayDecision: (round: number) => {
    set({ replayMode: true, replayRound: round });
  },

  exitReplay: () => {
    set({ replayMode: false, replayRound: 0 });
  },
}));
