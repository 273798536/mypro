import { create } from 'zustand';
import type { 
  GameState, Package, SortingLine, GameConfig, QueueStrategy, 
  PathStrategy, GameEvent, GameException, Score, GameStatus 
} from '../engine/types';
import { LINE_COLORS, LINE_NAMES, LINE_DESTINATIONS } from '../config/constants';
import { presetScenes } from '../config/presets';
import { sortPackages, selectLineByStrategy, generateId, weightedRandom, randomRange, detectAllExceptions } from '../engine/algorithms';
import { eventSystem } from '../engine/eventSystem';
import { gameRecorder } from '../engine/recorder';

const createInitialSortingLines = (capacity: number): SortingLine[] => {
  return [0, 1, 2].map(id => ({
    id,
    name: LINE_NAMES[id],
    color: LINE_COLORS[id],
    destination: LINE_DESTINATIONS[id],
    capacity,
    currentLoad: 0,
    queue: [],
    status: 'idle' as const,
    blockedUntil: 0,
  }));
};

const createInitialScore = (): Score => ({
  base: 0,
  bonus: 0,
  penalty: 0,
  total: 0,
});

const createInitialState = (config: GameConfig): GameState => ({
  status: 'idle',
  time: 0,
  duration: config.duration,
  speed: 1,
  score: createInitialScore(),
  packages: [],
  sortingLines: createInitialSortingLines(config.lineCapacity),
  queueStrategy: 'fifo',
  pathStrategy: 'destination-match',
  events: [],
  exceptions: [],
  config,
});

interface GameActions {
  initGame: (presetId?: string) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  setSpeed: (speed: number) => void;
  setQueueStrategy: (strategy: QueueStrategy) => void;
  setPathStrategy: (strategy: PathStrategy) => void;
  tick: (deltaTime: number) => void;
  assignPackage: (packageId: string, lineId: number) => void;
  autoAssignPackage: (packageId: string) => void;
  selectPackage: (packageId?: string) => void;
  generatePackage: () => void;
  detectExceptions: (currentTime: number) => GameException[];
  enterReviewMode: () => void;
  setReviewTime: (time: number) => void;
  exitReviewMode: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...createInitialState(presetScenes[0].config),

  initGame: (presetId: string = 'default') => {
    const preset = presetScenes.find(p => p.id === presetId) || presetScenes[0];
    gameRecorder.reset();
    eventSystem.clear();
    
    const unsub = eventSystem.onAll((event) => {
      set(state => ({ events: [...state.events, event] }));
      gameRecorder.recordEvent(event);
    });

    set(createInitialState(preset.config));
  },

  startGame: () => {
    set({ status: 'playing' });
    eventSystem.emit('game_started', 0);
  },

  pauseGame: () => {
    set({ status: 'paused' });
    eventSystem.emit('game_paused', get().time);
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  restartGame: () => {
    const currentConfig = get().config;
    const preset = presetScenes.find(p => 
      JSON.stringify(p.config) === JSON.stringify(currentConfig)
    ) || presetScenes[0];
    get().initGame(preset.id);
    get().startGame();
  },

  endGame: () => {
    set({ status: 'ended' });
    eventSystem.emit('game_ended', get().time);
  },

  setSpeed: (speed: number) => {
    set({ speed });
  },

  setQueueStrategy: (strategy: QueueStrategy) => {
    set({ queueStrategy: strategy });
    eventSystem.emit('strategy_changed', get().time, { 
      type: 'queue', 
      strategy 
    });
  },

  setPathStrategy: (strategy: PathStrategy) => {
    set({ pathStrategy: strategy });
    eventSystem.emit('strategy_changed', get().time, { 
      type: 'path', 
      strategy 
    });
  },

  tick: (deltaTime: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const newTime = state.time + deltaTime * state.speed;
    
    if (newTime >= state.duration) {
      get().endGame();
      return;
    }

    let updatedPackages = [...state.packages];
    let updatedLines = state.sortingLines.map(line => ({ ...line, queue: [...line.queue] }));
    let updatedScore = { ...state.score };

    for (let i = 0; i < updatedLines.length; i++) {
      const line = updatedLines[i];
      
      if (line.status === 'blocked' && newTime >= line.blockedUntil) {
        line.status = 'idle';
        eventSystem.emit('line_unblocked', newTime, { lineId: line.id });
      }

      if (line.currentPackage) {
        const pkg = line.currentPackage;
        const elapsed = newTime - (pkg.startedAt || newTime);
        const progress = Math.min(100, (elapsed / pkg.processingTime) * 100);
        
        if (progress >= 100) {
          pkg.status = 'completed';
          pkg.completedAt = newTime;
          pkg.progress = 100;
          
          const baseScore = 10;
          const urgencyBonus = pkg.type === 'urgent' ? 10 : 0;
          const earlyBonus = newTime < pkg.deadline ? 5 : 0;
          
          updatedScore.base += baseScore;
          updatedScore.bonus += urgencyBonus + earlyBonus;
          
          eventSystem.emit('package_completed', newTime, { 
            packageId: pkg.id,
            lineId: line.id,
            score: baseScore + urgencyBonus + earlyBonus
          });

          updatedPackages = updatedPackages.map(p => 
            p.id === pkg.id ? { ...pkg } : p
          );

          line.currentPackage = undefined;
          line.currentLoad = line.queue.length;
        } else {
          pkg.progress = progress;
          line.currentPackage = { ...pkg };
        }
      }

      if (!line.currentPackage && line.queue.length > 0 && line.status !== 'blocked') {
        const sortedQueue = sortPackages(line.queue, state.queueStrategy);
        const nextPackage = sortedQueue[0];
        
        if (nextPackage) {
          nextPackage.startedAt = newTime;
          nextPackage.status = 'processing';
          nextPackage.progress = 0;
          line.currentPackage = { ...nextPackage };
          line.queue = line.queue.filter(p => p.id !== nextPackage.id);
          line.currentLoad = line.queue.length;
          line.status = 'busy';
          
          eventSystem.emit('package_started', newTime, { 
            packageId: nextPackage.id,
            lineId: line.id
          });
        }
      }

      if (line.currentLoad >= line.capacity * state.config.congestionThreshold) {
        line.status = 'blocked';
        line.blockedUntil = newTime + 5;
        eventSystem.emit('line_blocked', newTime, { lineId: line.id });
      }
    }

    const waitingPackages = updatedPackages.filter(p => p.status === 'waiting');
    for (const pkg of waitingPackages) {
      if (pkg.assignedLine !== undefined) {
        const line = updatedLines[pkg.assignedLine];
        if (line && line.queue.find(p => p.id === pkg.id)) {
          continue;
        }
      }
      
      if (newTime > pkg.deadline) {
        pkg.status = 'failed';
        updatedScore.penalty += 25;
        eventSystem.emit('package_failed', newTime, { 
          packageId: pkg.id,
          reason: 'deadline_missed'
        });
      }
    }

    updatedScore.total = updatedScore.base + updatedScore.bonus - updatedScore.penalty;

    const newExceptions = get().detectExceptions(newTime);
    const existingExceptionIds = state.exceptions.map(e => e.id);
    const mergedExceptions = [
      ...state.exceptions,
      ...newExceptions.filter(e => !existingExceptionIds.includes(e.id))
    ];

    for (const ex of newExceptions) {
      if (!existingExceptionIds.includes(ex.id)) {
        updatedScore.penalty += ex.penalty;
        eventSystem.emit('exception_detected', newTime, { exception: ex });
      }
    }

    const newState = {
      time: newTime,
      packages: updatedPackages,
      sortingLines: updatedLines,
      score: updatedScore,
      exceptions: mergedExceptions,
    };

    set(newState);
    gameRecorder.recordSnapshot({ ...get(), ...newState });
  },

  assignPackage: (packageId: string, lineId: number) => {
    const state = get();
    const pkg = state.packages.find(p => p.id === packageId);
    const line = state.sortingLines[lineId];

    if (!pkg || !line || pkg.status !== 'waiting') return;
    if (line.currentLoad >= line.capacity) return;

    const updatedPackages = state.packages.map(p => 
      p.id === packageId 
        ? { ...p, assignedLine: lineId, status: 'waiting' as const }
        : p
    );

    const updatedLines = state.sortingLines.map((l, idx) => {
      if (idx === lineId) {
        return {
          ...l,
          queue: [...l.queue, updatedPackages.find(p => p.id === packageId)!],
          currentLoad: l.currentLoad + 1,
        };
      }
      return l;
    });

    set({
      packages: updatedPackages,
      sortingLines: updatedLines,
      selectedPackageId: undefined,
    });

    eventSystem.emit('package_assigned', state.time, {
      packageId,
      lineId,
    });
  },

  autoAssignPackage: (packageId: string) => {
    const state = get();
    const pkg = state.packages.find(p => p.id === packageId);
    if (!pkg || pkg.status !== 'waiting') return;

    const lineId = selectLineByStrategy(pkg, state.sortingLines, state.pathStrategy);
    if (lineId >= 0) {
      get().assignPackage(packageId, lineId);
    }
  },

  selectPackage: (packageId?: string) => {
    set({ selectedPackageId: packageId });
  },

  generatePackage: () => {
    const state = get();
    const config = state.config;

    const rand = Math.random();
    let type: Package['type'] = 'normal';
    if (rand < config.urgentRatio) {
      type = 'urgent';
    } else if (rand < config.urgentRatio + config.damagedRatio) {
      type = 'damaged';
    }

    const priority = weightedRandom<Package['priority']>(
      [1, 2, 3, 4, 5],
      config.priorityWeights
    );

    const destination = config.destinations[
      Math.floor(Math.random() * config.destinations.length)
    ];

    const processingTime = randomRange(
      config.processingTimeRange[0],
      config.processingTimeRange[1]
    );

    const deadline = state.time + randomRange(
      config.deadlineRange[0],
      config.deadlineRange[1]
    );

    const newPackage: Package = {
      id: generateId(),
      type,
      priority,
      destination,
      processingTime: type === 'damaged' ? processingTime * 1.5 : processingTime,
      deadline,
      createdAt: state.time,
      status: 'waiting',
      progress: 0,
    };

    set(state => ({
      packages: [...state.packages, newPackage],
    }));

    eventSystem.emit('package_created', state.time, { 
      packageId: newPackage.id,
      package: newPackage
    });
  },

  detectExceptions: (currentTime: number): GameException[] => {
    const state = get();
    return detectAllExceptions(state.packages, state.sortingLines, currentTime, state.config);
  },

  enterReviewMode: () => {
    set({ status: 'reviewing', reviewTime: 0 });
  },

  setReviewTime: (time: number) => {
    const recordedState = gameRecorder.getStateAtTime(time);
    if (recordedState) {
      set({
        ...recordedState,
        status: 'reviewing',
        reviewTime: time,
      });
    }
  },

  exitReviewMode: () => {
    set({ status: 'ended', reviewTime: undefined });
  },
}));
