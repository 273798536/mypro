import { create } from 'zustand';
import { GameState, RoundLog, ScoreDetail } from '../types/game';
import { drawWeatherCard, calculateInflow } from '../utils/weather';
import { calculateScore, checkFailure, calculateRiskScore } from '../utils/scoring';
import {
  MAX_ROUNDS,
  INITIAL_RESERVOIR_LEVEL,
  GATE_FLOW_RATE,
  OVERFLOW_LINE,
} from '../data/constants';

interface GameStore extends GameState {
  startGame: () => void;
  setGateOpening: (value: number) => void;
  toggleWarning: () => void;
  nextRound: () => void;
  resetGame: () => void;
  loadFromLogs: (logs: RoundLog[], scoreDetails: ScoreDetail[]) => void;
  setReplayRound: (round: number) => void;
  replayRound: number;
}

const getInitialState = (): GameState => ({
  round: 0,
  maxRounds: MAX_ROUNDS,
  weather: {
    type: 'sunny',
    name: '晴天',
    inflowMin: 2,
    inflowMax: 5,
    color: '#f6ad55',
    icon: 'Sun',
    description: '上游来水较少，可适度蓄水',
  },
  upstreamInflow: 0,
  reservoirLevel: INITIAL_RESERVOIR_LEVEL,
  gateOpening: 0,
  warningIssued: false,
  riskScore: 0,
  totalScore: 0,
  status: 'playing',
  failureReason: null,
  logs: [],
  scoreDetails: [],
  consecutiveOverflow: 0,
  started: false,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),
  replayRound: 0,

  startGame: () => {
    const weather = drawWeatherCard();
    const inflow = calculateInflow(weather);
    
    set({
      ...getInitialState(),
      round: 1,
      weather,
      upstreamInflow: inflow,
      started: true,
    });
  },

  setGateOpening: (value: number) => {
    set({ gateOpening: Math.max(0, Math.min(100, value)) });
  },

  toggleWarning: () => {
    set((state) => ({ warningIssued: !state.warningIssued }));
  },

  nextRound: () => {
    const state = get();
    
    if (state.status !== 'playing' || !state.started) return;

    const previousLevel = state.reservoirLevel;
    const previousGateOpening = state.gateOpening;
    const gateFlow = state.gateOpening * GATE_FLOW_RATE;
    const newLevel = Math.max(0, Math.min(100, previousLevel + state.upstreamInflow - gateFlow));
    
    const scoringResult = calculateScore(
      state.round,
      newLevel,
      state.gateOpening,
      state.warningIssued,
      previousLevel,
      previousGateOpening,
      state.weather,
      state.upstreamInflow
    );

    const newConsecutiveOverflow = newLevel >= OVERFLOW_LINE 
      ? state.consecutiveOverflow + 1 
      : 0;

    const newRiskScore = calculateRiskScore(newLevel, state.warningIssued, newConsecutiveOverflow);
    const newTotalScore = state.totalScore + scoringResult.scoreChange;

    const log: RoundLog = {
      round: state.round,
      weather: { ...state.weather },
      upstreamInflow: state.upstreamInflow,
      gateOpening: state.gateOpening,
      storageChange: newLevel - previousLevel,
      reservoirLevel: newLevel,
      warningIssued: state.warningIssued,
      scoreChange: scoringResult.scoreChange,
      events: scoringResult.events,
      downstreamFlow: gateFlow,
    };

    const failureCheck = checkFailure(newLevel, newConsecutiveOverflow, newRiskScore);

    const isLastRound = state.round >= state.maxRounds;
    const newStatus = failureCheck.failed ? 'failed' : isLastRound ? 'success' : 'playing';

    if (isLastRound && !failureCheck.failed && newLevel < OVERFLOW_LINE) {
      scoringResult.details.push({
        round: state.round,
        category: '成功通关',
        score: 50,
        reason: `成功完成所有 ${state.maxRounds} 回合调度，最终水位 ${newLevel.toFixed(1)}`,
        icon: 'Trophy',
      });
      scoringResult.scoreChange += 50;
      scoringResult.events.push('成功通关：完成所有回合');
    }

    const nextWeather = drawWeatherCard();
    const nextInflow = calculateInflow(nextWeather);

    set({
      reservoirLevel: newLevel,
      totalScore: newTotalScore + (failureCheck.failed || isLastRound ? scoringResult.scoreChange - (newTotalScore - state.totalScore) : 0),
      riskScore: newRiskScore,
      consecutiveOverflow: newConsecutiveOverflow,
      logs: [...state.logs, log],
      scoreDetails: [...state.scoreDetails, ...scoringResult.details],
      status: newStatus,
      failureReason: failureCheck.reason,
      warningIssued: false,
      gateOpening: 0,
      round: state.round + 1,
      weather: nextWeather,
      upstreamInflow: nextInflow,
    });
  },

  resetGame: () => {
    set({
      ...getInitialState(),
      replayRound: 0,
    });
  },

  loadFromLogs: (logs: RoundLog[], scoreDetails: ScoreDetail[]) => {
    set({
      logs,
      scoreDetails,
    });
  },

  setReplayRound: (round: number) => {
    set({ replayRound: round });
  },
}));
