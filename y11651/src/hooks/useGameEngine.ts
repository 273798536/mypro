import { useCallback, useEffect, useRef } from 'react';
import type { Point, LevelConfig, PlayerAction, ScoreResult } from '../types/game';
import { useGame } from '../store/gameContext';
import { createNotification } from '../store/gameReducer';
import { useSonarSystem } from './useSonarSystem';
import { moveSubmarine, getDirectionName } from '../utils/submarineAI';
import { calculateScore, analyzeFailureReason, generateSuccessTips } from '../utils/scoringUtils';
import { saveReplay, updateHighScore, unlockLevel } from '../utils/storage';
import { getLevelById } from '../data/levels';

export function useGameEngine() {
  const { state, dispatch } = useGame();
  const { scanCell } = useSonarSystem();
  const gameStateRef = useRef(state);

  useEffect(() => {
    gameStateRef.current = state;
  }, [state]);

  const initGame = useCallback((level: LevelConfig) => {
    dispatch({ type: 'INIT_GAME', payload: { level } });
  }, [dispatch]);

  const handleScan = useCallback((position: Point) => {
    const scanResult = scanCell(position);
    
    if (scanResult) {
      if (scanResult.hasNoise) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: createNotification(
            'warning',
            `检测到噪声干扰！噪声强度: ${scanResult.noiseLevel}%`,
            3000
          )
        });
      }

      if (scanResult.detectedTarget) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: createNotification(
            'success',
            `发现目标！回波强度: ${scanResult.echoStrength}%`,
            3000
          )
        });
      }

      return scanResult;
    }
    
    return null;
  }, [scanCell, dispatch]);

  const handleMark = useCallback((position: Point) => {
    const cell = state.grid[position.y]?.[position.x];
    if (!cell) return;

    const playerAction: PlayerAction = {
      type: cell.marked ? 'unmark' : 'mark',
      position,
      turn: state.turn,
      timestamp: Date.now()
    };

    if (cell.marked) {
      dispatch({ type: 'UNMARK_CELL', payload: { position, playerAction } });
    } else {
      dispatch({ type: 'MARK_CELL', payload: { position, playerAction } });
    }
  }, [state.grid, state.turn, dispatch]);

  const endTurn = useCallback(() => {
    if (state.status !== 'playing') return;

    const currentState = gameStateRef.current;
    const levelConfig = getLevelById(currentState.currentLevel);
    if (!levelConfig) return;

    const newSubmarine = moveSubmarine(
      currentState.submarine,
      currentState.gridSize,
      levelConfig.turnProbability
    );

    if (newSubmarine.isTurning) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: createNotification(
          'info',
          `检测到目标转向！新方向: ${getDirectionName(newSubmarine.direction)}`,
          3000
        )
      });
    }

    dispatch({ type: 'END_TURN', payload: { submarine: newSubmarine } });

    setTimeout(() => {
      const updatedState = gameStateRef.current;
      if (updatedState.energy < updatedState.maxEnergy * 0.2 && updatedState.energy > 0) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: createNotification(
            'danger',
            `能量不足！剩余: ${updatedState.energy}`,
            3000
          )
        });
      }
    }, 50);

    return newSubmarine;
  }, [state.status, dispatch]);

  const submitGuess = useCallback((position: Point): ScoreResult | null => {
    if (state.status !== 'playing') return null;

    const scoreResult = calculateScore(state, position);
    const isSuccess = scoreResult.accuracy >= 50;

    dispatch({ type: 'SUBMIT_GUESS', payload: { position } });

    dispatch({
      type: 'FINISH_GAME',
      payload: {
        result: isSuccess ? 'success' : 'failed',
        reason: isSuccess ? undefined : '定位不准确',
        score: scoreResult.score
      }
    });

    const levelConfig = getLevelById(state.currentLevel);
    if (levelConfig && isSuccess) {
      updateHighScore(state.currentLevel, scoreResult.score);
      unlockLevel(state.currentLevel + 1);
    }

    return scoreResult;
  }, [state, dispatch]);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, [dispatch]);

  const addNotification = useCallback((type: 'info' | 'warning' | 'danger' | 'success', message: string, duration?: number) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: createNotification(type, message, duration)
    });
  }, [dispatch]);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
  }, [dispatch]);

  useEffect(() => {
    if (state.status === 'finished') {
      const levelConfig = getLevelById(state.currentLevel);
      if (levelConfig) {
        const replay = {
          id: `replay-${Date.now()}`,
          levelId: state.currentLevel,
          startTime: state.startTime,
          endTime: Date.now(),
          finalScore: state.score,
          result: state.result || 'failed',
          failReason: state.failReason,
          actions: state.playerActions,
          submarineTrajectory: state.submarine.trajectory,
          scanHistory: state.scanHistory,
          levelConfig,
          guessPosition: state.guessPosition,
          actualPosition: state.submarine.position,
          turnsUsed: state.turn,
          energyLeft: state.energy,
          maxEnergy: state.maxEnergy
        };
        saveReplay(replay);
      }
    }
  }, [state.status, state.currentLevel, state.score, state.result, state.failReason, state.startTime, state.playerActions, state.submarine.trajectory, state.submarine.position, state.scanHistory, state.guessPosition, state.turn, state.energy, state.maxEnergy]);

  return {
    initGame,
    handleScan,
    handleMark,
    endTurn,
    submitGuess,
    resetGame,
    addNotification,
    removeNotification
  };
}
