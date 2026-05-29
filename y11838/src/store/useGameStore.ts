import { create } from 'zustand';
import type {
  IndustryCard,
  FundPosition,
  NewsEvent,
  GameState,
  ImportData,
  ValidationResult,
  RiskEvent,
} from '@/types';
import { validateImportData } from '@/utils/validator';
import {
  createInitialGameState,
  createDecision,
  executeDecision,
  advanceRound,
  finishGame,
  calculateTotalAssets,
  calculateIndustryWeight,
  getCurrentNews,
} from '@/utils/gameEngine';

interface GameStore {
  industryCards: IndustryCard[];
  newsEvents: NewsEvent[];
  positions: FundPosition[];
  gameState: GameState | null;
  validationResult: ValidationResult | null;
  currentRiskEvents: RiskEvent[];
  lastDecisionResult: {
    success: boolean;
    message: string;
    riskEvents: RiskEvent[];
  } | null;

  importData: (data: ImportData) => ValidationResult;
  startGame: (initialCash: number, totalRounds: number, feeRate?: number) => void;
  makeDecision: (
    newsEventId: string,
    action: 'buy' | 'sell' | 'hold',
    amount: number
  ) => { success: boolean; message: string };
  nextRound: () => void;
  finishCurrentGame: () => void;
  resetGame: () => void;
  clearLastResult: () => void;

  getTotalAssets: () => number;
  getIndustryWeight: (industryCardId: string) => number;
  getCurrentNews: () => NewsEvent | null;
  getIndustryById: (id: string) => IndustryCard | undefined;
  getPositionByIndustryId: (id: string) => FundPosition | undefined;
}

export const useGameStore = create<GameStore>((set, get) => ({
  industryCards: [],
  newsEvents: [],
  positions: [],
  gameState: null,
  validationResult: null,
  currentRiskEvents: [],
  lastDecisionResult: null,

  importData: (data: ImportData) => {
    const result = validateImportData(data);
    set({
      industryCards: data.industryCards || [],
      newsEvents: data.newsEvents || [],
      positions: data.positions || [],
      validationResult: result,
    });
    return result;
  },

  startGame: (initialCash: number, totalRounds: number, feeRate = 0.003) => {
    const state = get();
    const initialPositions = state.validationResult?.valid
      ? JSON.parse(JSON.stringify(state.positions || []))
      : [];

    const initialState = createInitialGameState(
      initialPositions,
      initialCash,
      totalRounds,
      feeRate
    );

    set({
      gameState: initialState,
      currentRiskEvents: [],
      lastDecisionResult: null,
    });
  },

  makeDecision: (newsEventId: string, action: 'buy' | 'sell' | 'hold', amount: number) => {
    const state = get();
    if (!state.gameState) {
      return { success: false, message: '游戏尚未开始' };
    }

    const newsEvent = state.newsEvents.find((n) => n.id === newsEventId);
    if (!newsEvent) {
      return { success: false, message: '新闻事件不存在' };
    }

    const decision = createDecision(
      newsEventId,
      newsEvent.industryCardId,
      action,
      amount,
      state.gameState.currentRound
    );

    try {
      const { newState, riskEvents } = executeDecision(
        state.gameState,
        decision,
        newsEvent,
        state.industryCards
      );

      newState.riskEvents = [...state.gameState.riskEvents, ...riskEvents];

      set({
        gameState: newState,
        currentRiskEvents: riskEvents,
        lastDecisionResult: {
          success: true,
          message: action === 'hold' ? '已持有观望' : `已${action === 'buy' ? '加仓' : '减仓'} ${amount.toLocaleString()} 元`,
          riskEvents,
        },
      });

      return {
        success: true,
        message: action === 'hold' ? '已持有观望' : `已${action === 'buy' ? '加仓' : '减仓'} ${amount.toLocaleString()} 元`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '操作失败',
      };
    }
  },

  nextRound: () => {
    const state = get();
    if (!state.gameState) return;

    const newState = advanceRound(state.gameState);
    set({
      gameState: newState,
      currentRiskEvents: [],
      lastDecisionResult: null,
    });
  },

  finishCurrentGame: () => {
    const state = get();
    if (!state.gameState) return;

    const finalState = finishGame(state.gameState);
    set({
      gameState: finalState,
    });
  },

  resetGame: () => {
    set({
      gameState: null,
      currentRiskEvents: [],
      lastDecisionResult: null,
      validationResult: null,
    });
  },

  clearLastResult: () => {
    set({
      lastDecisionResult: null,
      currentRiskEvents: [],
    });
  },

  getTotalAssets: () => {
    const state = get();
    if (!state.gameState) return 0;
    return calculateTotalAssets(state.gameState);
  },

  getIndustryWeight: (industryCardId: string) => {
    const state = get();
    if (!state.gameState) return 0;
    return calculateIndustryWeight(state.gameState, industryCardId);
  },

  getCurrentNews: () => {
    const state = get();
    if (!state.gameState) return null;
    return getCurrentNews(state.newsEvents, state.gameState.currentRound);
  },

  getIndustryById: (id: string) => {
    const state = get();
    return state.industryCards.find((c) => c.id === id);
  },

  getPositionByIndustryId: (id: string) => {
    const state = get();
    return state.gameState?.positions.find((p) => p.industryCardId === id);
  },
}));
