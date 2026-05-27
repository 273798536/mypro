import { create } from 'zustand';
import type {
  GameState,
  FailReason,
  Charge,
  Ball,
  Level,
  Vector2,
  ToolType,
  GameRecord,
  ReplayFrame,
  PreviewWarning,
} from './types';
import {
  GAME_CONFIG,
  INITIAL_BALL_RADIUS,
  generateId,
  cloneVector,
  GAME_CONFIG as config,
} from './config';
import {
  updateBallPhysics,
  checkWallCollision,
  checkReachedEnd,
  predictPath,
  getMaxFieldStrength,
} from './physics';

const { ENERGY, SCORING } = GAME_CONFIG;

interface GameStore {
  gameState: GameState;
  failReason: FailReason;
  currentLevel: Level | null;
  charges: Charge[];
  ball: Ball | null;
  energy: number;
  initialEnergy: number;
  elapsedTime: number;
  score: number;
  stars: number;
  selectedTool: ToolType;
  chargeStrength: number;
  showPreview: boolean;
  previewPath: Vector2[];
  previewWarnings: PreviewWarning[];
  trail: Vector2[];
  replayData: ReplayFrame[];
  maxFieldStrength: number;
  showFieldLines: boolean;
  collisionPoint: Vector2 | null;

  initLevel: (level: Level) => void;
  resetLevel: () => void;
  startGame: () => { canStart: boolean; warnings: PreviewWarning[] };
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (success: boolean, reason?: FailReason) => void;

  setSelectedTool: (tool: ToolType) => void;
  setChargeStrength: (strength: number) => void;
  placeCharge: (position: Vector2) => boolean;
  removeCharge: (chargeId: string) => void;
  clearCharges: () => void;

  update: (dt: number) => void;
  updatePreview: () => void;

  setShowPreview: (show: boolean) => void;
  setShowFieldLines: (show: boolean) => void;

  calculateScore: () => void;
  getGameRecord: () => GameRecord;
}

const createInitialBall = (level: Level): Ball => ({
  position: {
    x: level.maze.startPos.x * level.maze.cellSize + level.maze.cellSize / 2,
    y: level.maze.startPos.y * level.maze.cellSize + level.maze.cellSize / 2,
  },
  velocity: cloneVector(level.ballInitialVelocity),
  charge: level.ballCharge,
  radius: INITIAL_BALL_RADIUS,
});

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'idle',
  failReason: null,
  currentLevel: null,
  charges: [],
  ball: null,
  energy: 0,
  initialEnergy: 0,
  elapsedTime: 0,
  score: 0,
  stars: 0,
  selectedTool: null,
  chargeStrength: 3,
  showPreview: true,
  previewPath: [],
  previewWarnings: [],
  trail: [],
  replayData: [],
  maxFieldStrength: 0,
  showFieldLines: true,
  collisionPoint: null,

  initLevel: (level: Level) => {
    set({
      gameState: 'placing',
      failReason: null,
      currentLevel: level,
      charges: [],
      ball: createInitialBall(level),
      energy: level.initialEnergy,
      initialEnergy: level.initialEnergy,
      elapsedTime: 0,
      score: 0,
      stars: 0,
      selectedTool: null,
      chargeStrength: 3,
      showPreview: true,
      previewPath: [],
      previewWarnings: [],
      trail: [],
      replayData: [],
      maxFieldStrength: 0,
      collisionPoint: null,
    });
    get().updatePreview();
  },

  resetLevel: () => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    get().initLevel(currentLevel);
  },

  startGame: () => {
    const state = get();
    if (!state.currentLevel || !state.ball) {
      return { canStart: false, warnings: [] };
    }

    const { path, warnings, reachesEnd } = predictPath(
      state.ball.position,
      state.ball.velocity,
      state.currentLevel.ballCharge,
      state.ball.radius,
      state.charges,
      state.currentLevel.maze,
      state.currentLevel.obstacles
    );

    const hasPathWarning = warnings.some(w => w.type === 'path_wall');
    if (hasPathWarning) {
      return { canStart: false, warnings };
    }

    const maxField = getMaxFieldStrength(state.charges, state.currentLevel.maze);
    set({
      gameState: 'running',
      maxFieldStrength: maxField,
      trail: [],
      replayData: [],
    });

    return { canStart: true, warnings };
  },

  pauseGame: () => {
    set({ gameState: 'paused' });
  },

  resumeGame: () => {
    set({ gameState: 'running' });
  },

  endGame: (success: boolean, reason?: FailReason) => {
    const state = get();
    state.calculateScore();

    if (success) {
      set({ gameState: 'success', failReason: null });
    } else {
      set({ gameState: 'failed', failReason: reason || null });
    }
  },

  setSelectedTool: (tool: ToolType) => {
    set({ selectedTool: tool });
  },

  setChargeStrength: (strength: number) => {
    set({ chargeStrength: Math.max(1, Math.min(5, strength)) });
  },

  placeCharge: (position: Vector2): boolean => {
    const state = get();
    if (!state.currentLevel || !state.selectedTool || state.selectedTool === 'erase') {
      return false;
    }

    const cost = ENERGY.CHARGE_PLACE_COST * Math.pow(ENERGY.STRENGTH_MULTIPLIER, state.chargeStrength - 1);
    if (state.energy < cost) {
      return false;
    }

    if (checkWallCollision(position, 20, state.currentLevel.maze)) {
      return false;
    }

    for (const obstacle of state.currentLevel.obstacles) {
      if (
        position.x > obstacle.position.x - 20 &&
        position.x < obstacle.position.x + obstacle.width + 20 &&
        position.y > obstacle.position.y - 20 &&
        position.y < obstacle.position.y + obstacle.height + 20
      ) {
        return false;
      }
    }

    const newCharge: Charge = {
      id: generateId(),
      position: { ...position },
      magnitude: state.selectedTool === 'positive' ? 1 : -1,
      strength: state.chargeStrength,
    };

    set(prev => ({
      charges: [...prev.charges, newCharge],
      energy: prev.energy - cost,
    }));

    get().updatePreview();
    return true;
  },

  removeCharge: (chargeId: string) => {
    const state = get();
    const charge = state.charges.find(c => c.id === chargeId);
    if (!charge) return;

    const refund = ENERGY.CHARGE_DELETE_REFUND * Math.pow(ENERGY.STRENGTH_MULTIPLIER, charge.strength - 1);

    set(prev => ({
      charges: prev.charges.filter(c => c.id !== chargeId),
      energy: Math.min(prev.initialEnergy, prev.energy + refund),
    }));

    get().updatePreview();
  },

  clearCharges: () => {
    const state = get();
    const totalRefund = state.charges.reduce((sum, charge) => {
      return sum + ENERGY.CHARGE_DELETE_REFUND * Math.pow(ENERGY.STRENGTH_MULTIPLIER, charge.strength - 1);
    }, 0);

    set({
      charges: [],
      energy: Math.min(state.initialEnergy, state.energy + totalRefund),
      previewPath: [],
      previewWarnings: [],
    });
  },

  update: (dt: number) => {
    const state = get();
    if (state.gameState !== 'running' || !state.ball || !state.currentLevel) return;

    const newElapsedTime = state.elapsedTime + dt;
    if (newElapsedTime >= state.currentLevel.timeLimit) {
      get().endGame(false, 'timeout');
      return;
    }

    const result = updateBallPhysics(
      { ...state.ball },
      state.charges,
      state.currentLevel.obstacles,
      dt
    );

    if (result.collided) {
      set({
        ball: result.ball,
        collisionPoint: result.collisionPoint || null,
        elapsedTime: newElapsedTime,
      });
      get().endGame(false, 'collision');
      return;
    }

    if (checkWallCollision(result.ball.position, result.ball.radius, state.currentLevel.maze)) {
      set({
        ball: result.ball,
        collisionPoint: result.ball.position,
        elapsedTime: newElapsedTime,
      });
      get().endGame(false, 'collision');
      return;
    }

    if (checkReachedEnd(result.ball.position, state.currentLevel.maze)) {
      set({
        ball: result.ball,
        elapsedTime: newElapsedTime,
      });
      get().endGame(true);
      return;
    }

    const newTrail = [...state.trail, { ...result.ball.position }];
    if (newTrail.length > GAME_CONFIG.RENDERING.TRAIL_LENGTH) {
      newTrail.shift();
    }

    const replayFrame: ReplayFrame = {
      time: newElapsedTime,
      ballPosition: { ...result.ball.position },
      ballVelocity: { ...result.ball.velocity },
    };

    set({
      ball: result.ball,
      elapsedTime: newElapsedTime,
      trail: newTrail,
      replayData: [...state.replayData, replayFrame],
    });
  },

  updatePreview: () => {
    const state = get();
    if (!state.currentLevel || !state.ball || state.gameState === 'running') {
      set({ previewPath: [], previewWarnings: [] });
      return;
    }

    const { path, warnings } = predictPath(
      state.ball.position,
      state.ball.velocity,
      state.currentLevel.ballCharge,
      state.ball.radius,
      state.charges,
      state.currentLevel.maze,
      state.currentLevel.obstacles
    );

    set({ previewPath: path, previewWarnings: warnings });
  },

  setShowPreview: (show: boolean) => {
    set({ showPreview: show });
    if (show) {
      get().updatePreview();
    }
  },

  setShowFieldLines: (show: boolean) => {
    set({ showFieldLines: show });
  },

  calculateScore: () => {
    const state = get();
    if (!state.currentLevel) return;

    const { timeLimit, initialEnergy } = state.currentLevel;
    const { elapsedTime, chargesPlaced } = {
      elapsedTime: state.elapsedTime,
      chargesPlaced: state.charges.length,
    };
    const energyUsed = state.initialEnergy - state.energy;

    const timeScore = Math.max(0, (1 - elapsedTime / timeLimit) * SCORING.TIME_WEIGHT);
    const energyScore = Math.max(0, (1 - energyUsed / initialEnergy) * SCORING.ENERGY_WEIGHT);
    const efficiencyScore = Math.max(0, (1 - Math.min(chargesPlaced, 10) / 10) * SCORING.EFFICIENCY_WEIGHT);

    const score = Math.round(timeScore + energyScore + efficiencyScore);

    let stars = 0;
    if (score >= SCORING.STAR_THRESHOLDS[0]) stars = 1;
    if (score >= SCORING.STAR_THRESHOLDS[1]) stars = 2;
    if (score >= SCORING.STAR_THRESHOLDS[2]) stars = 3;

    set({ score, stars });
  },

  getGameRecord: (): GameRecord => {
    const state = get();
    if (!state.currentLevel) {
      throw new Error('No level loaded');
    }

    return {
      id: generateId(),
      levelId: state.currentLevel.id,
      levelName: state.currentLevel.name,
      timestamp: Date.now(),
      duration: state.elapsedTime,
      energyUsed: state.initialEnergy - state.energy,
      chargesPlaced: state.charges.length,
      success: state.gameState === 'success',
      failReason: state.failReason,
      score: state.score,
      stars: state.stars,
      charges: state.charges.map(c => ({ ...c, position: { ...c.position } })),
      replayData: state.replayData.map(f => ({
        ...f,
        ballPosition: { ...f.ballPosition },
        ballVelocity: { ...f.ballVelocity },
      })),
      maxFieldStrength: state.maxFieldStrength,
    };
  },
}));
