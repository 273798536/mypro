import { create } from 'zustand';
import {
  GameState,
  GameStatus,
  Particle,
  OreBlock,
  CollisionRecord,
  GameError,
  GameFrame,
  ParticleType,
} from '@/utils/types';
import { PHYSICS_CONSTANTS, CANVAS_CONFIG } from '@/utils/constants';
import { DEFAULT_PARTICLE } from '@/data/particles';
import { generateOreBlocks } from '@/data/ores';

interface GameStore extends GameState {
  setStatus: (status: GameStatus) => void;
  setSelectedParticle: (particle: ParticleType) => void;
  setLaunchAngle: (angle: number) => void;
  setLaunchPower: (power: number) => void;
  launchParticle: () => void;
  addParticle: (particle: Particle) => void;
  updateParticles: (particles: Particle[]) => void;
  updateOreBlocks: (oreBlocks: OreBlock[]) => void;
  addCollisionRecord: (record: CollisionRecord) => void;
  addError: (error: GameError) => void;
  clearError: (errorId: string) => void;
  addFrame: (frame: GameFrame) => void;
  setCurrentFrame: (frame: number) => void;
  updateScore: (delta: number) => void;
  updateEnergyUsed: (amount: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;
  clearAllErrors: () => void;
}

const getInitialState = (): GameState => {
  const oreBlocks = generateOreBlocks(CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT);
  
  return {
    status: 'idle',
    currentRound: 0,
    totalScore: 0,
    baseScore: 0,
    totalPenalty: 0,
    energyUsed: 0,
    maxEnergy: PHYSICS_CONSTANTS.TOTAL_ENERGY_BUDGET,
    selectedParticle: DEFAULT_PARTICLE,
    launchAngle: 0,
    launchPower: 50,
    particles: [],
    oreBlocks,
    collisionHistory: [],
    frameHistory: [],
    currentFrame: 0,
    errors: [],
    canvasWidth: CANVAS_CONFIG.WIDTH,
    canvasHeight: CANVAS_CONFIG.HEIGHT,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),

  setStatus: (status) => set({ status }),
  
  setSelectedParticle: (particle) => set({ selectedParticle: particle }),
  
  setLaunchAngle: (angle) => set({ launchAngle: Math.max(-45, Math.min(45, angle)) }),
  
  setLaunchPower: (power) => set({ launchPower: Math.max(0, Math.min(100, power)) }),
  
  launchParticle: () => {
    const state = get();
    if (!state.selectedParticle || state.status === 'playing') return;
    
    const energy = (state.launchPower / 100) * PHYSICS_CONSTANTS.MAX_ENERGY_PER_LAUNCH;
    if (state.energyUsed + energy > state.maxEnergy) {
      const error: GameError = {
        id: `err-${Date.now()}`,
        type: 'energy_over_limit',
        message: `能量不足！剩余能量: ${(state.maxEnergy - state.energyUsed).toFixed(1)}J`,
        position: { x: state.canvasWidth / 2, y: state.canvasHeight / 2 },
        collisionId: '',
        timestamp: Date.now(),
      };
      set({ errors: [...state.errors, error] });
      return;
    }
    
    const angleRad = (state.launchAngle * Math.PI) / 180;
    const speed = Math.sqrt((2 * energy) / state.selectedParticle.mass);
    
    const newParticle: Particle = {
      id: `particle-${Date.now()}`,
      type: state.selectedParticle,
      x: CANVAS_CONFIG.CANNON_X + 40,
      y: CANVAS_CONFIG.CANNON_Y,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      energy,
      trail: [],
      active: true,
    };
    
    set({
      particles: [...state.particles, newParticle],
      energyUsed: state.energyUsed + energy,
      status: 'playing',
      currentRound: state.currentRound + 1,
    });
  },
  
  addParticle: (particle) => {
    set((state) => ({ particles: [...state.particles, particle] }));
  },
  
  updateParticles: (particles) => set({ particles }),
  
  updateOreBlocks: (oreBlocks) => set({ oreBlocks }),
  
  addCollisionRecord: (record) => {
    set((state) => ({
      collisionHistory: [...state.collisionHistory, record],
    }));
  },
  
  addError: (error) => {
    set((state) => ({
      errors: [...state.errors, error],
    }));
  },
  
  clearError: (errorId) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== errorId),
    }));
  },
  
  clearAllErrors: () => set({ errors: [] }),
  
  addFrame: (frame) => {
    set((state) => ({
      frameHistory: [...state.frameHistory, frame],
    }));
  },
  
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  
  updateScore: (delta) => {
    set((state) => {
      const newBaseScore = delta > 0 ? state.baseScore + delta : state.baseScore;
      const newPenalty = delta < 0 ? state.totalPenalty + Math.abs(delta) : state.totalPenalty;
      return {
        totalScore: state.totalScore + delta,
        baseScore: newBaseScore,
        totalPenalty: newPenalty,
      };
    });
  },
  
  updateEnergyUsed: (amount) => {
    set((state) => ({
      energyUsed: Math.min(state.maxEnergy, state.energyUsed + amount),
    }));
  },
  
  pauseGame: () => {
    set((state) => (state.status === 'playing' ? { status: 'paused' } : {}));
  },
  
  resumeGame: () => {
    set((state) => (state.status === 'paused' ? { status: 'playing' } : {}));
  },
  
  resetGame: () => {
    set(getInitialState());
  },
  
  finishGame: () => set({ status: 'finished' }),
}));

export function useGameStatus() {
  return useGameStore((state) => state.status);
}

export function useSelectedParticle() {
  return useGameStore((state) => state.selectedParticle);
}

export function useParticles() {
  return useGameStore((state) => state.particles);
}

export function useOreBlocks() {
  return useGameStore((state) => state.oreBlocks);
}

export function useCollisionHistory() {
  return useGameStore((state) => state.collisionHistory);
}

export function useGameErrors() {
  return useGameStore((state) => state.errors);
}

export function useScore() {
  return useGameStore((state) => ({
    totalScore: state.totalScore,
    baseScore: state.baseScore,
    totalPenalty: state.totalPenalty,
  }));
}

export function useEnergy() {
  return useGameStore((state) => ({
    energyUsed: state.energyUsed,
    maxEnergy: state.maxEnergy,
    remaining: state.maxEnergy - state.energyUsed,
  }));
}

export function useFrameHistory() {
  return useGameStore((state) => state.frameHistory);
}
