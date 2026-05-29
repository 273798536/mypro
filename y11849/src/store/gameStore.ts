import { create } from 'zustand';
import type {
  GameState,
  Ship,
  Planet,
  Sample,
  RhythmTrack,
  NoiseStorm,
  GameResult,
  ResultCategory,
  KeyboardState,
} from '../types/game';
import { eventRecorder } from '../engine/EventRecorder';

interface GameStore {
  gameState: GameState;
  ship: Ship;
  planets: Planet[];
  samples: Sample[];
  selectedSample: Sample | null;
  rhythmTrack: RhythmTrack;
  noiseStorms: NoiseStorm[];
  keyboard: KeyboardState;
  gameResult: GameResult | null;
  showResult: boolean;
  showReplay: boolean;
  canvasSize: { width: number; height: number };

  setCanvasSize: (width: number, height: number) => void;
  initGame: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;

  setKeyboard: (key: keyof KeyboardState, value: boolean) => void;
  updateShip: (updates: Partial<Ship>) => void;
  collectPlanet: (planetId: string) => void;
  selectSample: (sample: Sample | null) => void;
  placeSample: (beatIndex: number) => void;
  removeSample: (beatIndex: number) => void;
  updateScore: (points: number, description: string) => void;
  consumeFuel: (amount: number) => void;
  addNoiseStorm: (storm: NoiseStorm) => void;
  removeNoiseStorm: (stormId: string) => void;
  setRhythmPlaying: (isPlaying: boolean) => void;
  setCurrentBeat: (beat: number) => void;
  updateTime: (delta: number) => void;

  showResultPage: () => void;
  hideResultPage: () => void;
  showReplayPanel: () => void;
  hideReplayPanel: () => void;
  generateGameResult: () => void;
}

const generatePlanets = (count: number, canvasWidth: number, canvasHeight: number): Planet[] => {
  const soundTypes = ['bass', 'snare', 'hihat', 'melody', 'fx'] as const;
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe'];
  const planets: Planet[] = [];

  for (let i = 0; i < count; i++) {
    const soundType = soundTypes[Math.floor(Math.random() * soundTypes.length)];
    const baseFreqs: Record<string, number> = {
      bass: 60 + Math.random() * 40,
      snare: 200 + Math.random() * 300,
      hihat: 5000 + Math.random() * 3000,
      melody: 220 + Math.random() * 440,
      fx: 100 + Math.random() * 1000,
    };

    planets.push({
      id: `planet_${i}`,
      x: 100 + Math.random() * (canvasWidth - 200),
      y: 100 + Math.random() * (canvasHeight - 300),
      radius: 20 + Math.random() * 25,
      color: colors[Math.floor(Math.random() * colors.length)],
      soundType,
      frequency: baseFreqs[soundType],
      collected: false,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
    });
  }

  return planets;
};

const createInitialState = (canvasWidth = 1200, canvasHeight = 700) => ({
  gameState: {
    status: 'idle' as const,
    score: 0,
    fuel: 100,
    maxFuel: 100,
    time: 0,
    scoreBreakdown: [],
  },
  ship: {
    x: canvasWidth / 2,
    y: canvasHeight / 2 - 100,
    vx: 0,
    vy: 0,
    radius: 15,
    angle: -Math.PI / 2,
  },
  planets: generatePlanets(12, canvasWidth, canvasHeight),
  samples: [] as Sample[],
  selectedSample: null,
  rhythmTrack: {
    beats: Array(8).fill(null),
    bpm: 120,
    currentBeat: 0,
    isPlaying: false,
  },
  noiseStorms: [] as NoiseStorm[],
  keyboard: {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
  },
  gameResult: null,
  showResult: false,
  showReplay: false,
  canvasSize: { width: canvasWidth, height: canvasHeight },
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setCanvasSize: (width: number, height: number) => {
    set({ canvasSize: { width, height } });
  },

  initGame: () => {
    const { canvasSize } = get();
    eventRecorder.clear();
    set(createInitialState(canvasSize.width, canvasSize.height));
  },

  startGame: () => {
    const { initGame } = get();
    initGame();
    set(state => ({
      gameState: { ...state.gameState, status: 'playing' },
    }));
  },

  pauseGame: () => {
    set(state => ({
      gameState: { ...state.gameState, status: 'paused' },
    }));
  },

  resumeGame: () => {
    set(state => ({
      gameState: { ...state.gameState, status: 'playing' },
    }));
  },

  restartGame: () => {
    const { startGame } = get();
    startGame();
  },

  endGame: () => {
    const { generateGameResult } = get();
    set(state => ({
      gameState: { ...state.gameState, status: 'ended' },
    }));
    generateGameResult();
  },

  setKeyboard: (key: keyof KeyboardState, value: boolean) => {
    set(state => ({
      keyboard: { ...state.keyboard, [key]: value },
    }));
  },

  updateShip: (updates: Partial<Ship>) => {
    set(state => ({
      ship: { ...state.ship, ...updates },
    }));
  },

  collectPlanet: (planetId: string) => {
    const state = get();
    const planet = state.planets.find(p => p.id === planetId);
    if (!planet || planet.collected) return;

    const sample: Sample = {
      id: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      planetId: planet.id,
      soundType: planet.soundType,
      frequency: planet.frequency,
      color: planet.color,
      collectedAt: Date.now(),
    };

    eventRecorder.recordEvent('sample_collect', {
      planetId,
      sampleId: sample.id,
      soundType: planet.soundType,
      x: planet.x,
      y: planet.y,
    });

    set(state => ({
      planets: state.planets.map(p =>
        p.id === planetId ? { ...p, collected: true } : p
      ),
      samples: [...state.samples, sample],
    }));

    get().updateScore(100, `收集 ${planet.soundType} 采样`);
  },

  selectSample: (sample: Sample | null) => {
    set({ selectedSample: sample });
  },

  placeSample: (beatIndex: number) => {
    const state = get();
    if (!state.selectedSample) return;

    const existingSample = state.rhythmTrack.beats[beatIndex];
    
    if (existingSample) {
      eventRecorder.recordEvent('sample_conflict', {
        beatIndex,
        existingSampleId: existingSample.id,
        newSampleId: state.selectedSample.id,
      });
      get().updateScore(-30, '采样冲突');
      return;
    }

    eventRecorder.recordEvent('sample_place', {
      sampleId: state.selectedSample.id,
      beatIndex,
      soundType: state.selectedSample.soundType,
    });

    set(state => ({
      rhythmTrack: {
        ...state.rhythmTrack,
        beats: state.rhythmTrack.beats.map((b, i) =>
          i === beatIndex ? state.selectedSample : b
        ),
      },
      selectedSample: null,
    }));

    get().updateScore(50, `放置采样到第 ${beatIndex + 1} 拍`);
  },

  removeSample: (beatIndex: number) => {
    set(state => ({
      rhythmTrack: {
        ...state.rhythmTrack,
        beats: state.rhythmTrack.beats.map((b, i) =>
          i === beatIndex ? null : b
        ),
      },
    }));
  },

  updateScore: (points: number, description: string) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        score: Math.max(0, state.gameState.score + points),
      },
    }));
  },

  consumeFuel: (amount: number) => {
    set(state => {
      const newFuel = Math.max(0, state.gameState.fuel - amount);
      
      if (newFuel <= 20 && state.gameState.fuel > 20) {
        eventRecorder.recordEvent('fuel_low', { remaining: newFuel });
      }
      
      if (newFuel <= 0 && state.gameState.fuel > 0) {
        eventRecorder.recordEvent('fuel_empty', {});
        setTimeout(() => get().endGame(), 100);
      }
      
      return {
        gameState: {
          ...state.gameState,
          fuel: newFuel,
        },
      };
    });
  },

  addNoiseStorm: (storm: NoiseStorm) => {
    set(state => ({
      noiseStorms: [...state.noiseStorms, storm],
    }));
  },

  removeNoiseStorm: (stormId: string) => {
    set(state => ({
      noiseStorms: state.noiseStorms.filter(s => s.id !== stormId),
    }));
  },

  setRhythmPlaying: (isPlaying: boolean) => {
    set(state => ({
      rhythmTrack: { ...state.rhythmTrack, isPlaying },
    }));
  },

  setCurrentBeat: (beat: number) => {
    set(state => ({
      rhythmTrack: { ...state.rhythmTrack, currentBeat: beat },
    }));
  },

  updateTime: (delta: number) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        time: state.gameState.time + delta,
      },
    }));
  },

  showResultPage: () => {
    set({ showResult: true });
  },

  hideResultPage: () => {
    set({ showResult: false });
  },

  showReplayPanel: () => {
    set({ showReplay: true });
  },

  hideReplayPanel: () => {
    set({ showReplay: false });
  },

  generateGameResult: () => {
    const state = get();
    const events = eventRecorder.getEvents();
    const stats = eventRecorder.getStatistics();
    const scoreBreakdown = eventRecorder.generateScoreBreakdown();

    const samplesPlaced = state.rhythmTrack.beats.filter(b => b !== null).length;
    const rhythmMismatchCount = stats['rhythm_mismatch'] || 0;
    const sampleConflictCount = stats['sample_conflict'] || 0;
    const stormHitCount = stats['storm_hit'] || 0;

    let rhythmQuality = 100;
    rhythmQuality -= rhythmMismatchCount * 20;
    rhythmQuality -= sampleConflictCount * 15;
    rhythmQuality = Math.max(0, rhythmQuality);

    let category: ResultCategory = 'usable';
    if (rhythmMismatchCount > 2) {
      category = 'rhythm_mismatch';
    } else if (sampleConflictCount > 2 || stormHitCount > 3) {
      category = 'needs_confirm';
    } else if (samplesPlaced < 4) {
      category = 'needs_confirm';
    }

    const result: GameResult = {
      category,
      score: state.gameState.score,
      samplesCollected: state.samples.length,
      samplesPlaced,
      rhythmQuality,
      fuelRemaining: state.gameState.fuel,
      events,
      scoreBreakdown,
      rhythmMismatchCount,
      sampleConflictCount,
      stormHitCount,
    };

    set({ gameResult: result, showResult: true });
  },
}));
