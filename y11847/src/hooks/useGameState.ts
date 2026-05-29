import { useReducer, useCallback } from 'react';
import { GameState, GameAction, GameStep } from '../types/game';
import { initialCityState, initialHandCards, rainCards } from '../data/cards';
import { applyCardEffect, calculateRoundScore, checkAlerts, createTraceNode } from '../utils/calcEngine';

const TOTAL_ROUNDS = 5;

const initialState: GameState = {
  phase: 'start',
  currentRound: 0,
  totalRounds: TOTAL_ROUNDS,
  score: 0,
  cityState: { ...initialCityState },
  handCards: [],
  steps: [],
  activeAlerts: [],
  confirmedAlerts: []
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const rainCard = rainCards[Math.floor(Math.random() * rainCards.length)];
      const { newState, trace } = applyCardEffect({ ...initialCityState }, rainCard);
      const alerts = checkAlerts(newState, 0);
      const { score: roundScore } = calculateRoundScore(initialCityState, newState);

      const firstStep: GameStep = {
        index: 0,
        action: `初始降雨: ${rainCard.name}`,
        cardUsed: rainCard,
        stateBefore: { ...initialCityState },
        stateAfter: newState,
        calcTrace: trace,
        scoreChange: roundScore,
        scoreReason: '初始状态',
        alerts,
        timestamp: Date.now()
      };

      return {
        ...initialState,
        phase: 'playing',
        currentRound: 1,
        score: roundScore,
        cityState: newState,
        handCards: initialHandCards.map((card, i) => ({ ...card, id: `${card.id}-${Date.now()}-${i}` })),
        currentRainCard: rainCard,
        steps: [firstStep],
        activeAlerts: alerts
      };
    }

    case 'PLAY_CARD': {
      const stateBefore = { ...state.cityState };
      const { newState, trace } = applyCardEffect(stateBefore, action.card);
      const newAlerts = checkAlerts(newState, state.steps.length);
      const { score: scoreChange, reason } = calculateRoundScore(stateBefore, newState);

      const step: GameStep = {
        index: state.steps.length,
        action: `使用: ${action.card.name}`,
        cardUsed: action.card,
        stateBefore,
        stateAfter: newState,
        calcTrace: trace,
        scoreChange,
        scoreReason: reason,
        alerts: newAlerts,
        timestamp: Date.now()
      };

      return {
        ...state,
        cityState: newState,
        handCards: state.handCards.filter((c) => c.id !== action.card.id),
        steps: [...state.steps, step],
        score: state.score + scoreChange,
        activeAlerts: [...state.activeAlerts, ...newAlerts],
      };
    }

    case 'END_ROUND': {
      const nextRound = state.currentRound + 1;

      if (nextRound > state.totalRounds) {
        return {
          ...state,
          phase: 'ended',
          currentRound: state.totalRounds
        };
      }

      const rainCard = rainCards[Math.floor(Math.random() * rainCards.length)];
      const stateBefore = { ...state.cityState };
      const { newState, trace } = applyCardEffect(stateBefore, rainCard);
      const newAlerts = checkAlerts(newState, state.steps.length);
      const { score: scoreChange, reason } = calculateRoundScore(stateBefore, newState);

      const recoveredPump = Math.max(0, newState.pumpLoad - 15);

      const finalState = { ...newState, pumpLoad: recoveredPump };

      const step: GameStep = {
        index: state.steps.length,
        action: `第${nextRound}轮降雨: ${rainCard.name}`,
        cardUsed: rainCard,
        stateBefore,
        stateAfter: finalState,
        calcTrace: createTraceNode(
          `回合结束: ${rainCard.name} + 泵站冷却`,
          0,
          undefined,
          rainCard.id,
          [
            createTraceNode('泵站冷却', recoveredPump, `${newState.pumpLoad} - 15`, '回合结束冷却')
          ]
        ),
        scoreChange,
        scoreReason: reason + '; 泵站自然冷却 -15%',
        alerts: newAlerts,
        timestamp: Date.now()
      };

      return {
        ...state,
        currentRound: nextRound,
        cityState: finalState,
        currentRainCard: rainCard,
        handCards: initialHandCards.map((card, i) => ({ ...card, id: `${card.id}-${Date.now()}-${i}` })),
        steps: [...state.steps, step],
        score: state.score + scoreChange,
        activeAlerts: [...state.activeAlerts, ...newAlerts],
      };
    }

    case 'CONFIRM_ALERT': {
      const alert = state.activeAlerts.find((a) => a.id === action.alertId);
      if (!alert) return state;

      return {
        ...state,
        activeAlerts: state.activeAlerts.filter((a) => a.id !== action.alertId),
        confirmedAlerts: [...state.confirmedAlerts, { ...alert, confirmed: true }]
      };
    }

    case 'END_GAME':
      return { ...state, phase: 'ended' };

    case 'RESET_GAME':
      return { ...initialState };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const playCard = useCallback((card: any) => {
    dispatch({ type: 'PLAY_CARD', card });
  }, []);

  const endRound = useCallback(() => {
    dispatch({ type: 'END_ROUND' });
  }, []);

  const confirmAlert = useCallback((alertId: string) => {
    dispatch({ type: 'CONFIRM_ALERT', alertId });
  }, []);

  const endGame = useCallback(() => {
    dispatch({ type: 'END_GAME' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  return {
    state,
    startGame,
    playCard,
    endRound,
    confirmAlert,
    endGame,
    resetGame
  };
}
