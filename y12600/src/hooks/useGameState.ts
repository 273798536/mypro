import { useReducer, useCallback, useEffect } from 'react';
import type {
  GameState,
  GameAction,
  AnnotationResult,
  GameStats,
  InspectionRecord,
} from '../types';
import { sampleRecords } from '../data/samples';

const initialState: GameState = {
  phase: 'idle',
  currentRecordIndex: 0,
  records: sampleRecords,
  results: [],
  startTime: null,
  elapsedTime: 0,
  isPaused: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'playing',
        startTime: Date.now(),
        elapsedTime: 0,
        currentRecordIndex: 0,
        results: [],
        isPaused: false,
      };

    case 'PAUSE':
      return {
        ...state,
        phase: 'paused',
        isPaused: true,
      };

    case 'RESUME':
      return {
        ...state,
        phase: 'playing',
        isPaused: false,
        startTime: Date.now() - state.elapsedTime,
      };

    case 'RESTART':
      return {
        ...initialState,
        records: state.records,
      };

    case 'ANNOTATE':
      return {
        ...state,
        results: [...state.results, action.payload],
      };

    case 'NEXT_RECORD': {
      const nextIndex = state.currentRecordIndex + 1;
      if (nextIndex >= state.records.length) {
        return {
          ...state,
          phase: 'finished',
        };
      }
      return {
        ...state,
        currentRecordIndex: nextIndex,
      };
    }

    case 'FINISH':
      return {
        ...state,
        phase: 'finished',
      };

    case 'TICK':
      if (state.phase !== 'playing' || state.startTime === null) {
        return state;
      }
      return {
        ...state,
        elapsedTime: Date.now() - state.startTime,
      };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    let interval: number | undefined;
    if (state.phase === 'playing') {
      interval = window.setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.phase]);

  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);
  const finish = useCallback(() => dispatch({ type: 'FINISH' }), []);

  const annotate = useCallback((result: AnnotationResult) => {
    dispatch({ type: 'ANNOTATE', payload: result });
    setTimeout(() => {
      dispatch({ type: 'NEXT_RECORD' });
    }, 1500);
  }, []);

  const nextRecord = useCallback(() => dispatch({ type: 'NEXT_RECORD' }), []);

  const getCurrentRecord = useCallback((): InspectionRecord | null => {
    return state.records[state.currentRecordIndex] || null;
  }, [state.records, state.currentRecordIndex]);

  const getStats = useCallback((): GameStats => {
    const { records, results } = state;
    const hits = results.filter((r) => r.isHit).length;
    const misses = results.filter((r) => !r.isHit).length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalDistance = results.reduce((sum, r) => sum + r.distance, 0);
    const averageDistance = results.length > 0 ? totalDistance / results.length : 0;

    const pendingCount = records.filter(
      (r) => r.status === 'pending' && results.some((res) => res.recordId === r.id)
    ).length;
    const errorCount = records.filter(
      (r) => r.status === 'error' && results.some((res) => res.recordId === r.id)
    ).length;
    const flippedCount = records.filter(
      (r) => r.status === 'flipped' && results.some((res) => res.recordId === r.id)
    ).length;

    return {
      totalRecords: records.length,
      completedRecords: results.length,
      hits,
      misses,
      pendingCount,
      errorCount,
      flippedCount,
      totalScore,
      averageDistance,
    };
  }, [state.records, state.results]);

  const isCurrentRecordAnnotated = useCallback((): boolean => {
    const current = getCurrentRecord();
    if (!current) return false;
    return state.results.some((r) => r.recordId === current.id);
  }, [state.results, getCurrentRecord]);

  const getHitRate = useCallback((): number => {
    const stats = getStats();
    if (stats.completedRecords === 0) return 0;
    return Math.round((stats.hits / stats.completedRecords) * 100);
  }, [getStats]);

  return {
    state,
    start,
    pause,
    resume,
    restart,
    finish,
    annotate,
    nextRecord,
    getCurrentRecord,
    getStats,
    isCurrentRecordAnnotated,
    getHitRate,
  };
}
