import { create } from 'zustand';
import {
  GameState,
  StakeRecord,
  ValidatorNode,
  PenaltyEvent,
  OperationLog,
} from '../game/types';
import { GAME_CONFIG, VALIDATOR_NODES } from '../game/config';
import {
  generateId,
  processRound,
  isDuplicateStake,
  createDuplicateStakeWarning,
  calculateUnlockMisclickPenalty,
  calculateNodeStake,
  calculateExpectedReward,
  getNextSettlementRound,
} from '../game/engine';

interface GameStore extends GameState {
  startGame: () => void;
  resetGame: () => void;
  selectNode: (nodeId: string | null) => void;
  stake: (nodeId: string, amount: number) => PenaltyEvent | null;
  unlock: (stakeId: string) => PenaltyEvent | null;
  advanceRound: () => void;
  dismissPendingPenalty: () => void;
  addOperationLog: (type: OperationLog['type'], description: string) => void;
  getNodeById: (nodeId: string) => ValidatorNode | undefined;
  getStakeRecordsByNode: (nodeId: string) => StakeRecord[];
  getTotalStaked: () => number;
}

const getInitialState = (): GameState => ({
  currentRound: 1,
  maxRounds: GAME_CONFIG.MAX_ROUNDS,
  totalBalance: GAME_CONFIG.INITIAL_BALANCE,
  initialBalance: GAME_CONFIG.INITIAL_BALANCE,
  stakeRecords: [],
  unlockRecords: [],
  penaltyEvents: [],
  rewardEvents: [],
  rewardPool: 0,
  totalPenalty: 0,
  totalReward: 0,
  selectedNodeId: null,
  nodes: VALIDATOR_NODES.map((n) => ({ ...n })),
  isGameOver: false,
  isGameStarted: false,
  operationLog: [],
  pendingPenalty: null,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),

  startGame: () => {
    set((state) => {
      const log: OperationLog = {
        id: generateId(),
        round: 1,
        type: 'game_start',
        description: '游戏开始，初始资金 ' + GAME_CONFIG.INITIAL_BALANCE + ' 枚代币',
        stateSnapshot: { totalBalance: GAME_CONFIG.INITIAL_BALANCE },
        timestamp: Date.now(),
      };
      return {
        ...getInitialState(),
        isGameStarted: true,
        operationLog: [log],
      };
    });
  },

  resetGame: () => {
    set(getInitialState());
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  stake: (nodeId: string, amount: number) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === nodeId);

    if (!node || amount <= 0 || amount > state.totalBalance) {
      return null;
    }

    const isDuplicate = isDuplicateStake(nodeId, state.stakeRecords);
    const stakeRecord: StakeRecord = {
      id: generateId(),
      nodeId,
      amount,
      timestamp: Date.now(),
      round: state.currentRound,
      isDuplicate,
      isUnlocked: false,
    };

    let duplicateWarning: PenaltyEvent | null = null;
    const newPenaltyEvents = [...state.penaltyEvents];

    if (isDuplicate) {
      duplicateWarning = createDuplicateStakeWarning(node, state.currentRound);
      newPenaltyEvents.push(duplicateWarning);
    }

    const newStakeRecords = [...state.stakeRecords, stakeRecord];
    const newBalance = state.totalBalance - amount;

    const log: OperationLog = {
      id: generateId(),
      round: state.currentRound,
      type: 'stake',
      description: `向节点「${node.name}」质押 ${amount} 枚代币${isDuplicate ? '（重复质押）' : ''}`,
      stateSnapshot: { totalBalance: newBalance, stakeRecords: newStakeRecords },
      timestamp: Date.now(),
    };

    set({
      stakeRecords: newStakeRecords,
      totalBalance: newBalance,
      penaltyEvents: newPenaltyEvents,
      operationLog: [...state.operationLog, log],
      pendingPenalty: duplicateWarning,
    });

    return duplicateWarning;
  },

  unlock: (stakeId: string) => {
    const state = get();
    const stakeRecord = state.stakeRecords.find((s) => s.id === stakeId);

    if (!stakeRecord || stakeRecord.isUnlocked) {
      return null;
    }

    const node = state.nodes.find((n) => n.id === stakeRecord.nodeId);
    if (!node) return null;

    const nextSettlement = getNextSettlementRound(state.currentRound);
    const roundsUntilSettlement = nextSettlement - state.currentRound;
    const expectedReward = calculateExpectedReward(node, stakeRecord.amount, roundsUntilSettlement);

    let misclickPenalty: PenaltyEvent | null = null;
    let penaltyAmount = 0;

    if (roundsUntilSettlement <= GAME_CONFIG.UNLOCK_MISCLICK_THRESHOLD) {
      misclickPenalty = calculateUnlockMisclickPenalty(
        state.currentRound,
        expectedReward,
        node.name,
        node.id
      );
      if (misclickPenalty) {
        penaltyAmount = misclickPenalty.amount;
      }
    }

    const unlockAmount = stakeRecord.amount - penaltyAmount;
    const newBalance = state.totalBalance + unlockAmount;

    const newStakeRecords = state.stakeRecords.map((s) =>
      s.id === stakeId ? { ...s, isUnlocked: true } : s
    );

    const newPenaltyEvents = misclickPenalty
      ? [...state.penaltyEvents, misclickPenalty]
      : state.penaltyEvents;

    const newTotalPenalty = state.totalPenalty + penaltyAmount;

    const log: OperationLog = {
      id: generateId(),
      round: state.currentRound,
      type: 'unlock',
      description: `从节点「${node.name}」解锁 ${stakeRecord.amount} 枚代币${penaltyAmount > 0 ? `，扣除解锁误点惩罚 ${penaltyAmount}` : ''}`,
      stateSnapshot: { totalBalance: newBalance, stakeRecords: newStakeRecords },
      timestamp: Date.now(),
    };

    set({
      stakeRecords: newStakeRecords,
      totalBalance: newBalance,
      penaltyEvents: newPenaltyEvents,
      totalPenalty: newTotalPenalty,
      operationLog: [...state.operationLog, log],
      pendingPenalty: misclickPenalty,
    });

    return misclickPenalty;
  },

  advanceRound: () => {
    const state = get();

    if (state.isGameOver || !state.isGameStarted) {
      return;
    }

    const result = processRound(state.nodes, state.stakeRecords, state.currentRound);

    let updatedNodes = [...state.nodes];
    result.nodeUpdates.forEach((update) => {
      const index = updatedNodes.findIndex((n) => n.id === update.id);
      if (index !== -1 && update.isOnline !== undefined) {
        updatedNodes[index] = { ...updatedNodes[index], isOnline: update.isOnline };
      }
    });

    const totalReward = result.rewards.reduce((sum, r) => sum + r.amount, 0);
    const totalPenaltyFromRound = result.penalties.reduce((sum, p) => sum + p.amount, 0);

    const newBalance = state.totalBalance + totalReward - totalPenaltyFromRound;
    const newRewardPool = state.rewardPool + totalReward;
    const newTotalReward = state.totalReward + totalReward;
    const newTotalPenalty = state.totalPenalty + totalPenaltyFromRound;

    const isGameOver = state.currentRound >= state.maxRounds;

    const roundLog: OperationLog = {
      id: generateId(),
      round: state.currentRound,
      type: 'round_advance',
      description: `第 ${state.currentRound} 回合经营完成${isGameOver ? '，游戏结束' : ''}`,
      stateSnapshot: { totalBalance: newBalance },
      timestamp: Date.now(),
    };

    const rewardLogs = result.rewards.map((r) => ({
      id: generateId(),
      round: state.currentRound,
      type: 'reward' as const,
      description: `节点「${r.nodeName}」奖励 +${r.amount}`,
      stateSnapshot: {},
      timestamp: Date.now(),
    }));

    const penaltyLogs = result.penalties
      .filter((p) => p.amount > 0)
      .map((p) => ({
        id: generateId(),
        round: state.currentRound,
        type: 'penalty' as const,
        description: `节点「${p.nodeName}」惩罚 -${p.amount}`,
        stateSnapshot: {},
        timestamp: Date.now(),
      }));

    const firstOfflinePenalty = result.penalties.find((p) => p.type === 'offline' && p.amount > 0) || null;

    set({
      currentRound: isGameOver ? state.currentRound : state.currentRound + 1,
      nodes: updatedNodes,
      rewardEvents: [...state.rewardEvents, ...result.rewards],
      penaltyEvents: [...state.penaltyEvents, ...result.penalties],
      totalBalance: newBalance,
      rewardPool: newRewardPool,
      totalReward: newTotalReward,
      totalPenalty: newTotalPenalty,
      isGameOver,
      operationLog: [...state.operationLog, roundLog, ...rewardLogs, ...penaltyLogs],
      pendingPenalty: firstOfflinePenalty,
    });
  },

  dismissPendingPenalty: () => {
    set({ pendingPenalty: null });
  },

  addOperationLog: (type: OperationLog['type'], description: string) => {
    const state = get();
    const log: OperationLog = {
      id: generateId(),
      round: state.currentRound,
      type,
      description,
      stateSnapshot: {},
      timestamp: Date.now(),
    };
    set({ operationLog: [...state.operationLog, log] });
  },

  getNodeById: (nodeId: string) => {
    return get().nodes.find((n) => n.id === nodeId);
  },

  getStakeRecordsByNode: (nodeId: string) => {
    return get().stakeRecords.filter((s) => s.nodeId === nodeId && !s.isUnlocked);
  },

  getTotalStaked: () => {
    const state = get();
    return state.stakeRecords
      .filter((s) => !s.isUnlocked)
      .reduce((sum, s) => sum + s.amount, 0);
  },
}));
