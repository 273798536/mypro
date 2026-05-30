import { create } from 'zustand';
import {
  GameState,
  Position,
  PricePoint,
  ActionRecord,
  LiquidationEvent,
  Scenario,
  ActionType,
  SourceType,
} from '../types/game';
import {
  generateId,
  createInitialPosition,
  createInitialPriceHistory,
  scenarios,
} from '../utils/mockData';
import {
  calculatePrice,
  generatePricePoint,
  confirmPriceJump,
  calculateCollateralRatio,
  getPositionStatus,
} from '../utils/priceSimulator';
import { calculateMaxScore, scoringRules, createPenalty } from '../utils/scoring';

const defaultPosition: Position = {
  id: '',
  borrowAmount: 0,
  collateralAmount: 0,
  collateralType: '',
  collateralPrice: 0,
  liquidationThreshold: 0,
  liquidationPrice: 0,
  currentRatio: 0,
  status: 'safe',
  createdAt: 0,
};

const initialState: GameState = {
  gameId: '',
  status: 'idle',
  currentRound: 0,
  totalRounds: 0,
  difficulty: 'normal',
  scenario: '',
  position: defaultPosition,
  priceHistory: [],
  actionHistory: [],
  liquidationHistory: [],
  score: 0,
  maxScore: 0,
  penalties: [],
  selectedTraceId: null,
  showPriceJumpModal: false,
  showRepeatedLiqModal: false,
  showGasModal: false,
  currentPriceJump: null,
  currentLiquidationEvent: null,
  reviewRound: 0,
};

interface GameActions {
  startGame: (scenarioId: string) => void;
  nextRound: () => void;
  addCollateral: (amount: number) => void;
  repayBorrow: (amount: number) => void;
  hold: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  confirmPriceJump: (accept: boolean) => void;
  handleRepeatedLiquidation: (verify: boolean) => void;
  handleGasIssue: (resolve: boolean) => void;
  selectTrace: (actionId: string | null) => void;
  reviseAction: (actionId: string, revisedBy: string, revisionNote: string) => void;
  setReviewRound: (round: number) => void;
  finishGame: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  startGame: (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    const position = createInitialPosition(scenario);
    const priceHistory = createInitialPriceHistory(scenario);

    set({
      ...initialState,
      gameId: `game-${generateId()}`,
      status: 'playing',
      currentRound: 0,
      totalRounds: scenario.totalRounds,
      difficulty: scenario.difficulty,
      scenario: scenario.id,
      position,
      priceHistory,
      maxScore: calculateMaxScore(scenario.totalRounds),
      reviewRound: 0,
    });

    setTimeout(() => get().nextRound(), 100);
  },

  nextRound: () => {
    const state = get();
    if (state.status !== 'playing') return;
    if (state.position.status === 'liquidated') {
      get().finishGame();
      return;
    }

    const nextRound = state.currentRound + 1;
    if (nextRound > state.totalRounds) {
      get().finishGame();
      return;
    }

    const scenario = scenarios.find((s) => s.id === state.scenario);
    if (!scenario) return;

    const priceEvent = scenario.priceEvents.find((e) => e.round === nextRound);
    const lastPrice = state.priceHistory[state.priceHistory.length - 1]?.price || state.position.collateralPrice;
    
    const newPrice = priceEvent ? calculatePrice(lastPrice, priceEvent) : lastPrice * (1 + (Math.random() - 0.5) * 0.02);
    
    const eventForPrice = priceEvent || { round: nextRound, type: 'normal' as const, priceChange: 0 };
    const pricePoint = generatePricePoint(newPrice, eventForPrice, lastPrice, !priceEvent?.isMalicious);

    const newPosition = {
      ...state.position,
      collateralPrice: pricePoint.price,
      currentRatio: calculateCollateralRatio(
        state.position.collateralAmount,
        pricePoint.price,
        state.position.borrowAmount
      ),
    };
    newPosition.status = getPositionStatus(newPosition.currentRatio, state.position.liquidationThreshold);

    const actionRecord: ActionRecord = {
      id: `action-${generateId()}`,
      round: nextRound,
      type: 'price_update',
      source: 'oracle',
      timestamp: Date.now(),
      explanation: `预言机更新价格: ${lastPrice.toFixed(2)} → ${newPrice.toFixed(2)} ${pricePoint.isJump ? '(异常跳变)' : ''}`,
      positionSnapshot: { ...newPosition },
      priceSnapshot: { ...pricePoint },
      scoreChange: 0,
      isRevised: false,
    };

    set({
      currentRound: nextRound,
      position: newPosition,
      priceHistory: [...state.priceHistory, pricePoint],
      actionHistory: [...state.actionHistory, actionRecord],
    });

    if (pricePoint.isJump && pricePoint.jumpBranch) {
      set({
        showPriceJumpModal: true,
        currentPriceJump: pricePoint,
      });
    }
  },

  addCollateral: (amount: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const newPosition = {
      ...state.position,
      collateralAmount: state.position.collateralAmount + amount,
      currentRatio: calculateCollateralRatio(
        state.position.collateralAmount + amount,
        state.position.collateralPrice,
        state.position.borrowAmount
      ),
    };
    newPosition.status = getPositionStatus(newPosition.currentRatio, state.position.liquidationThreshold);

    const scoreChange = newPosition.status !== 'liquidated' && state.position.status === 'danger'
      ? scoringRules.correctCollateralAdd
      : 5;

    const actionRecord: ActionRecord = {
      id: `action-${generateId()}`,
      round: state.currentRound,
      type: 'add_collateral',
      source: 'player',
      amount,
      timestamp: Date.now(),
      explanation: `玩家补充 ${amount} ${state.position.collateralType} 抵押物`,
      positionSnapshot: { ...newPosition },
      priceSnapshot: state.priceHistory[state.priceHistory.length - 1],
      scoreChange,
      isRevised: false,
    };

    set({
      position: newPosition,
      score: state.score + scoreChange,
      actionHistory: [...state.actionHistory, actionRecord],
    });

    get().nextRound();
  },

  repayBorrow: (amount: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const newPosition = {
      ...state.position,
      borrowAmount: Math.max(0, state.position.borrowAmount - amount),
      currentRatio: calculateCollateralRatio(
        state.position.collateralAmount,
        state.position.collateralPrice,
        Math.max(0, state.position.borrowAmount - amount)
      ),
    };
    newPosition.status = getPositionStatus(newPosition.currentRatio, state.position.liquidationThreshold);

    const scoreChange = newPosition.status !== 'liquidated' && state.position.status === 'danger'
      ? scoringRules.correctRepay
      : 5;

    const actionRecord: ActionRecord = {
      id: `action-${generateId()}`,
      round: state.currentRound,
      type: 'repay',
      source: 'player',
      amount,
      timestamp: Date.now(),
      explanation: `玩家偿还 ${amount.toFixed(2)} USD 借贷`,
      positionSnapshot: { ...newPosition },
      priceSnapshot: state.priceHistory[state.priceHistory.length - 1],
      scoreChange,
      isRevised: false,
    };

    set({
      position: newPosition,
      score: state.score + scoreChange,
      actionHistory: [...state.actionHistory, actionRecord],
    });

    get().nextRound();
  },

  hold: () => {
    const state = get();
    if (state.status !== 'playing') return;

    if (state.position.status === 'liquidated') {
      const liquidationEvent: LiquidationEvent = {
        id: `liq-${generateId()}`,
        round: state.currentRound,
        positionId: state.position.id,
        triggerPrice: state.position.collateralPrice,
        triggerRatio: state.position.currentRatio,
        isRepeated: state.liquidationHistory.length > 0,
        hasGasIssue: Math.random() > 0.7,
        verifier: '协议方核实',
        status: 'pending',
        penaltyScore: scoringRules.liquidation,
      };

      if (liquidationEvent.isRepeated) {
        set({
          showRepeatedLiqModal: true,
          currentLiquidationEvent: liquidationEvent,
        });
        return;
      }

      if (liquidationEvent.hasGasIssue) {
        set({
          showGasModal: true,
          currentLiquidationEvent: liquidationEvent,
        });
        return;
      }

      const penalty = createPenalty(
        state.currentRound,
        'liquidation',
        '抵押率低于清算阈值，仓位被清算',
        scoringRules.liquidation,
        `action-${generateId()}`
      );

      const actionRecord: ActionRecord = {
        id: penalty.linkedActionId,
        round: state.currentRound,
        type: 'liquidation',
        source: 'system',
        timestamp: Date.now(),
        explanation: '系统执行清算，抵押率跌破清算线',
        positionSnapshot: { ...state.position },
        priceSnapshot: state.priceHistory[state.priceHistory.length - 1],
        scoreChange: scoringRules.liquidation,
        isRevised: false,
      };

      set({
        liquidationHistory: [...state.liquidationHistory, { ...liquidationEvent, status: 'executed' }],
        penalties: [...state.penalties, penalty],
        actionHistory: [...state.actionHistory, actionRecord],
        score: state.score + scoringRules.liquidation,
      });

      get().finishGame();
      return;
    }

    const scoreChange = state.position.status === 'safe' ? scoringRules.holdStillSafe : 0;
    const actionRecord: ActionRecord = {
      id: `action-${generateId()}`,
      round: state.currentRound,
      type: 'hold',
      source: 'player',
      timestamp: Date.now(),
      explanation: '玩家选择观望，未采取操作',
      positionSnapshot: { ...state.position },
      priceSnapshot: state.priceHistory[state.priceHistory.length - 1],
      scoreChange,
      isRevised: false,
    };

    set({
      score: state.score + scoreChange + scoringRules.safeRound,
      actionHistory: [...state.actionHistory, actionRecord],
    });

    get().nextRound();
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  restartGame: () => {
    const state = get();
    if (state.scenario) {
      get().startGame(state.scenario);
    }
  },

  confirmPriceJump: (accept: boolean) => {
    const state = get();
    if (!state.currentPriceJump) return;

    const confirmedPrice = confirmPriceJump(state.currentPriceJump, accept);
    
    const newPosition = {
      ...state.position,
      collateralPrice: confirmedPrice.price,
      currentRatio: calculateCollateralRatio(
        state.position.collateralAmount,
        confirmedPrice.price,
        state.position.borrowAmount
      ),
    };
    newPosition.status = getPositionStatus(newPosition.currentRatio, state.position.liquidationThreshold);

    const scoreChange = !accept && state.currentPriceJump.jumpBranch?.status === 'pending'
      ? scoringRules.avoidPriceJumpTrap
      : accept && newPosition.status === 'liquidated'
      ? scoringRules.missedPriceJump
      : 0;

    const actionRecord: ActionRecord = {
      id: `action-${generateId()}`,
      round: state.currentRound,
      type: 'price_update',
      source: 'oracle',
      timestamp: Date.now(),
      explanation: `价格跳变${accept ? '已确认' : '被拒绝'}，最终价格: ${confirmedPrice.price.toFixed(2)} USD`,
      positionSnapshot: { ...newPosition },
      priceSnapshot: confirmedPrice,
      scoreChange,
      isRevised: false,
    };

    const updatedPriceHistory = [...state.priceHistory];
    if (updatedPriceHistory.length > 0) {
      updatedPriceHistory[updatedPriceHistory.length - 1] = confirmedPrice;
    }

    set({
      position: newPosition,
      priceHistory: updatedPriceHistory,
      actionHistory: [...state.actionHistory, actionRecord],
      score: state.score + scoreChange,
      showPriceJumpModal: false,
      currentPriceJump: null,
    });
  },

  handleRepeatedLiquidation: (verify: boolean) => {
    const state = get();
    if (!state.currentLiquidationEvent) return;

    const penalty = createPenalty(
      state.currentRound,
      verify ? 'repeated_liquidation_verified' : 'repeated_liquidation',
      verify ? '已核实重复清算，取消执行' : '未核实重复清算，执行双重清算',
      verify ? 0 : scoringRules.repeatedLiquidation,
      `action-${generateId()}`
    );

    const actionRecord: ActionRecord = {
      id: penalty.linkedActionId,
      round: state.currentRound,
      type: 'liquidation',
      source: 'system',
      timestamp: Date.now(),
      explanation: verify ? '玩家核实重复清算，取消本次清算' : '玩家未核实重复清算，遭受双重惩罚',
      positionSnapshot: { ...state.position },
      priceSnapshot: state.priceHistory[state.priceHistory.length - 1],
      scoreChange: penalty.score,
      isRevised: false,
    };

    set({
      liquidationHistory: [...state.liquidationHistory, {
        ...state.currentLiquidationEvent,
        status: verify ? 'cancelled' : 'executed',
      }],
      penalties: [...state.penalties, penalty],
      actionHistory: [...state.actionHistory, actionRecord],
      score: state.score + penalty.score,
      showRepeatedLiqModal: false,
      currentLiquidationEvent: null,
    });

    if (!verify) {
      get().finishGame();
    }
  },

  handleGasIssue: (resolve: boolean) => {
    const state = get();
    if (!state.currentLiquidationEvent) return;

    const penalty = createPenalty(
      state.currentRound,
      resolve ? 'gas_resolved' : 'gas_shortage',
      resolve ? '已解决Gas问题，清算正常执行' : 'Gas不足导致清算失败，额外惩罚',
      resolve ? 0 : scoringRules.gasShortage,
      `action-${generateId()}`
    );

    const actionRecord: ActionRecord = {
      id: penalty.linkedActionId,
      round: state.currentRound,
      type: 'liquidation',
      source: 'system',
      timestamp: Date.now(),
      explanation: resolve ? '玩家解决Gas问题，清算正常执行' : 'Gas不足导致清算异常',
      positionSnapshot: { ...state.position },
      priceSnapshot: state.priceHistory[state.priceHistory.length - 1],
      scoreChange: penalty.score,
      isRevised: false,
    };

    set({
      liquidationHistory: [...state.liquidationHistory, {
        ...state.currentLiquidationEvent,
        status: resolve ? 'executed' : 'pending',
      }],
      penalties: [...state.penalties, penalty],
      actionHistory: [...state.actionHistory, actionRecord],
      score: state.score + penalty.score,
      showGasModal: false,
      currentLiquidationEvent: null,
    });

    get().finishGame();
  },

  selectTrace: (actionId: string | null) => {
    set({ selectedTraceId: actionId });
  },

  reviseAction: (actionId: string, revisedBy: string, revisionNote: string) => {
    const state = get();
    const updatedHistory = state.actionHistory.map((action) => {
      if (action.id === actionId) {
        return {
          ...action,
          isRevised: true,
          revisedBy,
          revisedAt: Date.now(),
          revisionNote,
        };
      }
      return action;
    });

    set({ actionHistory: updatedHistory });
  },

  setReviewRound: (round: number) => {
    set({ reviewRound: round });
  },

  finishGame: () => {
    set({ status: 'finished' });
  },
}));
