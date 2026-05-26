import type { GameState, GameAction, LevelConfig, Notification } from '../types/game';
import { createEmptyGrid, getRandomPosition } from '../utils/gridUtils';
import { createSubmarine } from '../utils/submarineAI';
import { generateNoiseSources } from '../utils/sonarUtils';

export const initialGameState: GameState = {
  status: 'idle',
  currentLevel: 1,
  turn: 0,
  maxTurns: 15,
  energy: 100,
  maxEnergy: 100,
  scanCost: 10,
  cooldown: 0,
  cooldownTime: 1,
  grid: [],
  gridSize: 8,
  submarine: {
    id: '',
    position: { x: 0, y: 0 },
    direction: 'right',
    speed: 1,
    trajectory: [],
    isTurning: false
  },
  noiseSources: [],
  scanHistory: [],
  playerActions: [],
  guessPosition: null,
  notifications: [],
  score: 0,
  result: null,
  failReason: null,
  startTime: 0
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME': {
      const level = action.payload.level;
      const grid = createEmptyGrid(level.gridSize);
      const startPosition = getRandomPosition(level.gridSize);
      const submarine = createSubmarine(startPosition, level.submarineSpeed);
      const noiseSources = generateNoiseSources(
        level.noiseSourceCount,
        level.gridSize,
        level.noiseIntensityRange,
        [startPosition]
      );

      return {
        ...initialGameState,
        status: 'playing',
        currentLevel: level.id,
        turn: 1,
        maxTurns: level.maxTurns,
        energy: level.maxEnergy,
        maxEnergy: level.maxEnergy,
        scanCost: level.scanCost,
        cooldownTime: level.cooldownTime,
        grid,
        gridSize: level.gridSize,
        submarine,
        noiseSources,
        startTime: Date.now()
      };
    }

    case 'SCAN_CELL': {
      if (state.status !== 'playing' || state.cooldown > 0 || state.energy < state.scanCost) {
        return state;
      }

      return {
        ...state,
        energy: state.energy - state.scanCost,
        cooldown: state.cooldownTime,
        notifications: state.notifications
      };
    }

    case 'MARK_CELL': {
      const newGrid = state.grid.map(row => row.map(cell => ({ ...cell })));
      const cell = newGrid[action.payload.position.y]?.[action.payload.position.x];
      
      if (cell) {
        cell.marked = true;
      }

      return {
        ...state,
        grid: newGrid
      };
    }

    case 'UNMARK_CELL': {
      const newGrid = state.grid.map(row => row.map(cell => ({ ...cell })));
      const cell = newGrid[action.payload.position.y]?.[action.payload.position.x];
      
      if (cell) {
        cell.marked = false;
      }

      return {
        ...state,
        grid: newGrid
      };
    }

    case 'SUBMIT_GUESS': {
      return {
        ...state,
        guessPosition: action.payload.position,
        status: 'finished'
      };
    }

    case 'END_TURN': {
      if (state.status !== 'playing') return state;

      const newTurn = state.turn + 1;
      const newCooldown = Math.max(0, state.cooldown - 1);

      let newState: GameState = {
        ...state,
        turn: newTurn,
        cooldown: newCooldown
      };

      if (newTurn > state.maxTurns) {
        newState.status = 'finished';
        newState.result = 'failed';
        newState.failReason = '回合数已用尽';
      }

      if (state.energy <= 0) {
        newState.status = 'finished';
        newState.result = 'failed';
        newState.failReason = '能量已耗尽';
      }

      return newState;
    }

    case 'UPDATE_COOLDOWN': {
      return {
        ...state,
        cooldown: Math.max(0, action.payload.value)
      };
    }

    case 'ADD_NOTIFICATION': {
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    }

    case 'REMOVE_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload.id)
      };
    }

    case 'FINISH_GAME': {
      return {
        ...state,
        status: 'finished',
        result: action.payload.result,
        failReason: action.payload.reason || null,
        score: action.payload.score
      };
    }

    case 'RESET_GAME': {
      return initialGameState;
    }

    default:
      return state;
  }
}

export function createNotification(
  type: Notification['type'],
  message: string,
  duration: number = 3000
): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    timestamp: Date.now(),
    duration
  };
}
