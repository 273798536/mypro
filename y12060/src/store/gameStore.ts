import { create } from 'zustand';
import {
  GameSession,
  GameStatus,
  GameMode,
  Difficulty,
  CameraView,
  CollisionRecord,
  RoutePoint,
  DataConflict,
  GameScore,
  Task
} from '../types/game';
import { Forklift } from '../types/forklift';
import { DEFAULT_FORKLIFT } from '../config/forklifts';
import { DEFAULT_SHELF_LAYOUT } from '../config/shelves';
import { DIFFICULTY_CONFIG, PENALTY_CONFIG } from '../config/levels';

const createInitialScore = (): GameScore => ({
  total: 1000,
  maxPossible: 1000,
  timeBonus: 0,
  collisionPenalties: 0,
  speedPenalties: 0,
  blindzonePenalties: 0,
  overheightPenalties: 0
});

const createInitialSession = (): GameSession => ({
  id: `session-${Date.now()}`,
  mode: 'training',
  difficulty: 'easy',
  selectedForklift: DEFAULT_FORKLIFT,
  selectedShelfConfig: DEFAULT_SHELF_LAYOUT,
  startTime: null,
  endTime: null,
  pauseTime: 0,
  totalPauseDuration: 0,
  score: createInitialScore(),
  violations: [],
  route: [],
  conflicts: [],
  status: 'idle',
  cameraView: 'third'
});

interface GameStore {
  session: GameSession;
  tasks: Task[];
  currentTaskIndex: number;
  isInBlindZone: boolean;
  blindZoneStartTime: number;
  lastCollisionTime: number;
  showCollisionEffect: boolean;
  warningMessage: string | null;
  
  setMode: (mode: GameMode) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setForklift: (forklift: Forklift) => void;
  setShelfConfig: (configId: string) => void;
  setCameraView: (view: CameraView) => void;
  setConflicts: (conflicts: DataConflict[]) => void;
  
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  finishGame: () => void;
  quitGame: () => void;
  
  addViolation: (violation: Omit<CollisionRecord, 'id' | 'sessionId' | 'pointsDeducted'>) => void;
  addRoutePoint: (point: RoutePoint) => void;
  updateScore: (updates: Partial<GameScore>) => void;
  setTasks: (tasks: Task[]) => void;
  completeTask: (taskId: string) => void;
  
  setInBlindZone: (value: boolean) => void;
  setShowCollisionEffect: (value: boolean) => void;
  setWarningMessage: (message: string | null) => void;
  
  resetSession: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: createInitialSession(),
  tasks: [],
  currentTaskIndex: 0,
  isInBlindZone: false,
  blindZoneStartTime: 0,
  lastCollisionTime: 0,
  showCollisionEffect: false,
  warningMessage: null,

  setMode: (mode) => set((state) => ({
    session: { ...state.session, mode }
  })),

  setDifficulty: (difficulty) => set((state) => ({
    session: { ...state.session, difficulty }
  })),

  setForklift: (forklift) => set((state) => ({
    session: { ...state.session, selectedForklift: forklift }
  })),

  setShelfConfig: (configId) => set((state) => ({
    session: { ...state.session, selectedShelfConfig: configId }
  })),

  setCameraView: (cameraView) => set((state) => ({
    session: { ...state.session, cameraView }
  })),

  setConflicts: (conflicts) => set((state) => ({
    session: { ...state.session, conflicts }
  })),

  startGame: () => set((state) => ({
    session: {
      ...state.session,
      id: `session-${Date.now()}`,
      status: 'playing',
      startTime: Date.now(),
      endTime: null,
      pauseTime: 0,
      totalPauseDuration: 0,
      score: createInitialScore(),
      violations: [],
      route: []
    },
    currentTaskIndex: 0,
    isInBlindZone: false,
    blindZoneStartTime: 0,
    lastCollisionTime: 0,
    showCollisionEffect: false,
    warningMessage: null
  })),

  pauseGame: () => set((state) => ({
    session: {
      ...state.session,
      status: 'paused',
      pauseTime: Date.now()
    }
  })),

  resumeGame: () => set((state) => ({
    session: {
      ...state.session,
      status: 'playing',
      totalPauseDuration: state.session.totalPauseDuration + (Date.now() - state.session.pauseTime)
    }
  })),

  restartGame: () => {
    const { mode, difficulty, selectedForklift, selectedShelfConfig, conflicts, cameraView } = get().session;
    set({
      session: {
        ...createInitialSession(),
        id: `session-${Date.now()}`,
        mode,
        difficulty,
        selectedForklift,
        selectedShelfConfig,
        conflicts,
        cameraView
      },
      tasks: [],
      currentTaskIndex: 0,
      isInBlindZone: false,
      blindZoneStartTime: 0,
      lastCollisionTime: 0,
      showCollisionEffect: false,
      warningMessage: null
    });
  },

  finishGame: () => set((state) => {
    const timeBonus = state.session.mode === 'training' ? 0 :
      Math.max(0, Math.floor((state.session.score.maxPossible - (Date.now() - (state.session.startTime || Date.now())) / 1000) * 2));
    
    return {
      session: {
        ...state.session,
        status: 'finished',
        endTime: Date.now(),
        score: {
          ...state.session.score,
          timeBonus,
          total: state.session.score.total + timeBonus
        }
      }
    };
  }),

  quitGame: () => set({
    session: createInitialSession(),
    tasks: [],
    currentTaskIndex: 0
  }),

  addViolation: (violation) => set((state) => {
    const now = Date.now();
    const cooldown = DIFFICULTY_CONFIG[state.session.difficulty].collisionCooldown;
    
    if (now - state.lastCollisionTime < cooldown && violation.type === 'shelf') {
      return state;
    }

    const penaltyConfig = PENALTY_CONFIG[violation.type];
    const penalty = 'minor' in penaltyConfig 
      ? penaltyConfig[violation.severity].points 
      : penaltyConfig.points;

    const scoreKey = violation.type === 'shelf' ? 'collisionPenalties' :
                     violation.type === 'overheight' ? 'overheightPenalties' :
                     'blindzonePenalties';

    const newViolation: CollisionRecord = {
      ...violation,
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: state.session.id,
      pointsDeducted: penalty
    };

    const multiplier = DIFFICULTY_CONFIG[state.session.difficulty].scoreMultiplier;
    const actualPenalty = Math.floor(penalty * multiplier);

    return {
      session: {
        ...state.session,
        violations: [...state.session.violations, newViolation],
        score: {
          ...state.session.score,
          [scoreKey]: state.session.score[scoreKey] + actualPenalty,
          total: Math.max(0, state.session.score.total - actualPenalty)
        }
      },
      lastCollisionTime: now,
      showCollisionEffect: true,
      warningMessage: PENALTY_CONFIG[violation.type][violation.severity]?.label || PENALTY_CONFIG[violation.type].label
    };
  }),

  addRoutePoint: (point) => set((state) => {
    const maxPoints = 10000;
    const route = [...state.session.route, point];
    if (route.length > maxPoints) {
      route.shift();
    }
    return {
      session: { ...state.session, route }
    };
  }),

  updateScore: (updates) => set((state) => ({
    session: {
      ...state.session,
      score: { ...state.session.score, ...updates }
    }
  })),

  setTasks: (tasks) => set({ tasks }),

  completeTask: (taskId) => set((state) => {
    const tasks = state.tasks.map(t => 
      t.id === taskId ? { ...t, completed: true, timestamp: Date.now() } : t
    );
    const currentTaskIndex = tasks.findIndex(t => !t.completed);
    return { tasks, currentTaskIndex };
  }),

  setInBlindZone: (value) => set((state) => ({
    isInBlindZone: value,
    blindZoneStartTime: value ? Date.now() : state.blindZoneStartTime
  })),

  setShowCollisionEffect: (value) => set({ showCollisionEffect: value }),

  setWarningMessage: (message) => set({ warningMessage: message }),

  resetSession: () => set({
    session: createInitialSession(),
    tasks: [],
    currentTaskIndex: 0,
    isInBlindZone: false,
    blindZoneStartTime: 0,
    lastCollisionTime: 0,
    showCollisionEffect: false,
    warningMessage: null
  })
}));
