import { useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  GameState,
  GameAction,
  FlightRecord,
} from '../types/game';
import {
  updatePhysics,
  generateWind,
  createInitialRocket,
  createInitialEnvironment,
} from '../utils/physics';
import { checkCollision } from '../utils/collision';
import { calculateScore } from '../utils/scoring';
import { createFlightFrame, createFlightRecord, saveFlightRecord } from '../utils/flightRecorder';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function createInitialState(): GameState {
  return {
    phase: 'idle',
    rocket: createInitialRocket(CANVAS_WIDTH),
    environment: createInitialEnvironment(CANVAS_WIDTH, CANVAS_HEIGHT),
    score: 0,
    flightData: [],
    replaySpeed: 1,
    replayFrameIndex: 0,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...createInitialState(),
        phase: 'playing',
      };

    case 'PAUSE_GAME':
      if (state.phase !== 'playing') return state;
      return { ...state, phase: 'paused' };

    case 'RESUME_GAME':
      if (state.phase !== 'paused') return state;
      return { ...state, phase: 'playing' };

    case 'RESET_GAME':
      return createInitialState();

    case 'SET_THRUST':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        rocket: {
          ...state.rocket,
          thrust: action.payload * state.rocket.maxThrust,
        },
      };

    case 'UPDATE': {
      if (state.phase !== 'playing') return state;

      const { dt } = action.payload;
      const thrustInput = state.rocket.thrust / state.rocket.maxThrust;

      const physicsResult = updatePhysics(
        state.rocket,
        state.environment,
        dt,
        thrustInput
      );

      const wind = generateWind(
        state.environment.windSpeed,
        state.environment.windDirection,
        dt
      );

      const newEnv = {
        ...state.environment,
        windSpeed: wind.speed,
        windDirection: wind.direction,
      };

      const collision = checkCollision(physicsResult.rocket, newEnv);

      if (collision.collided) {
        const scoreResult = calculateScore(
          physicsResult.rocket,
          newEnv,
          collision.success
        );

        const newFlightData = [
          ...state.flightData,
          createFlightFrame(Date.now(), physicsResult.rocket, thrustInput),
        ];

        const record = createFlightRecord(
          newFlightData,
          newEnv,
          collision.success,
          scoreResult.totalScore,
          collision.failureReason
        );

        saveFlightRecord(record);

        return {
          ...state,
          phase: 'ended',
          rocket: physicsResult.rocket,
          environment: newEnv,
          score: scoreResult.totalScore,
          failureReason: collision.failureReason,
          flightData: newFlightData,
        };
      }

      return {
        ...state,
        rocket: physicsResult.rocket,
        environment: newEnv,
        flightData: [
          ...state.flightData,
          createFlightFrame(Date.now(), physicsResult.rocket, thrustInput),
        ],
      };
    }

    case 'END_GAME':
      return {
        ...state,
        phase: 'ended',
        score: action.payload.score,
        failureReason: action.payload.reason,
      };

    case 'START_REPLAY':
      return {
        ...state,
        phase: 'replaying',
        replayFrameIndex: 0,
        flightData: action.payload.frames,
      };

    case 'SET_REPLAY_SPEED':
      return { ...state, replaySpeed: action.payload };

    case 'SET_REPLAY_FRAME':
      return { ...state, replayFrameIndex: action.payload };

    case 'EXIT_REPLAY':
      return {
        ...createInitialState(),
        phase: 'idle',
      };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const thrustInputRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  const startGame = useCallback(() => {
    thrustInputRef.current = 0;
    dispatch({ type: 'START_GAME' });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const resumeGame = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, []);

  const resetGame = useCallback(() => {
    thrustInputRef.current = 0;
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const setThrust = useCallback((thrust: number) => {
    thrustInputRef.current = thrust;
    dispatch({ type: 'SET_THRUST', payload: thrust });
  }, []);

  const startReplay = useCallback((record: FlightRecord) => {
    dispatch({ type: 'START_REPLAY', payload: record });
  }, []);

  const setReplaySpeed = useCallback((speed: number) => {
    dispatch({ type: 'SET_REPLAY_SPEED', payload: speed });
  }, []);

  const setReplayFrame = useCallback((frame: number) => {
    dispatch({ type: 'SET_REPLAY_FRAME', payload: frame });
  }, []);

  const exitReplay = useCallback(() => {
    dispatch({ type: 'EXIT_REPLAY' });
  }, []);

  useEffect(() => {
    if (state.phase !== 'playing') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      dispatch({ type: 'UPDATE', payload: { dt } });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'replaying') return;

    const interval = setInterval(() => {
      dispatch({
        type: 'SET_REPLAY_FRAME',
        payload: Math.min(
          state.replayFrameIndex + state.replaySpeed,
          state.flightData.length - 1
        ),
      });
    }, 16);

    return () => clearInterval(interval);
  }, [state.phase, state.replayFrameIndex, state.replaySpeed, state.flightData.length]);

  const getCurrentRocket = () => {
    if (state.phase === 'replaying' && state.flightData[state.replayFrameIndex]) {
      return state.flightData[state.replayFrameIndex].rocket;
    }
    return state.rocket;
  };

  return {
    state,
    rocket: getCurrentRocket(),
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    setThrust,
    startReplay,
    setReplaySpeed,
    setReplayFrame,
    exitReplay,
  };
}
