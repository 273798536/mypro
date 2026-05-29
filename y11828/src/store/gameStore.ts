import { create } from 'zustand';
import type {
  GameState,
  InputState,
  Level,
  Minecart,
  MinecartConfig,
  GameEvent,
  EnergyHistoryPoint,
  RunResult,
  FailureAnalysis,
} from '../types/game';
import { TrackSystem } from '../game/trackSystem';
import { physicsEngine } from '../game/physics';
import { SeededRandom, generateId, generateRunId } from '../utils/random';

interface GameStore {
  state: GameState;
  trackSystem: TrackSystem | null;
  minecartConfig: MinecartConfig | null;
  inputState: InputState;
  random: SeededRandom | null;
  energyHistory: EnergyHistoryPoint[];
  collectedOreIndices: Set<number>;
  lastRunResult: RunResult | null;
  previousRunResult: RunResult | null;
  collisionCarts: { x: number; y: number; vx: number; vy: number }[];
  pendingConfirmations: { eventId: string; type: string; description: string; severity: 'low' | 'medium' | 'high' }[];

  setInput: (input: Partial<InputState>) => void;
  startGame: (level: Level, config: MinecartConfig) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (success: boolean, failureAnalysis?: FailureAnalysis) => void;
  updateGame: (dt: number) => void;
  resetGame: () => void;
  confirmEvent: (eventId: string) => void;
  skipAllConfirmations: () => void;
  setMinecartConfig: (config: MinecartConfig) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: {
    phase: 'menu',
    currentLevel: null,
    minecart: null,
    energy: null,
    events: [],
    time: 0,
    deltaTime: 0,
    seed: 42,
    speed: 0,
    success: false,
  },
  trackSystem: null,
  minecartConfig: null,
  inputState: {
    accelerate: false,
    brake: false,
    switchLeft: false,
    switchRight: false,
  },
  random: null,
  energyHistory: [],
  collectedOreIndices: new Set(),
  lastRunResult: null,
  previousRunResult: null,
  collisionCarts: [],
  pendingConfirmations: [],

  setInput: (input) => {
    set((state) => ({
      inputState: { ...state.inputState, ...input },
    }));
  },

  setMinecartConfig: (config) => {
    set({ minecartConfig: config });
  },

  startGame: (level, config) => {
    const trackSystem = new TrackSystem(level.trackNodes, level.trackSegments);
    const startSegment = level.trackSegments.find(
      (s) => s.startNode === level.startNode || s.endNode === level.startNode
    );

    if (!startSegment) return;

    const startPos = trackSystem.getSegmentPosition(startSegment.id, 0);
    const random = new SeededRandom(level.seed);

    const minecart: Minecart = {
      configId: config.id,
      physics: {
        position: { x: startPos.x, y: startPos.y },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        angle: startPos.angle,
      },
      currentSegment: startSegment.id,
      progress: 0,
      energy: level.initialEnergy,
      oreCount: 0,
    };

    const pendingConfirmations = [];

    if (level.meteorSchedule && level.meteorSchedule.length > 0) {
      pendingConfirmations.push({
        eventId: generateId(),
        type: 'meteor_warning',
        description: `关卡包含 ${level.meteorSchedule.length} 个陨石事件，需要人工确认处理策略`,
        severity: 'high',
      });
    }

    if (level.collisionCarts && level.collisionCarts.length > 0) {
      pendingConfirmations.push({
        eventId: generateId(),
        type: 'collision_risk',
        description: `检测到 ${level.collisionCarts.length} 辆对向矿车，存在碰撞风险`,
        severity: 'high',
      });
    }

    if (level.oreLocations.length > 2) {
      pendingConfirmations.push({
        eventId: generateId(),
        type: 'ore_overload',
        description: `矿石仓数量较多 (${level.oreLocations.length})，请确认运输优先级`,
        severity: 'medium',
      });
    }

    set({
      state: {
        phase: pendingConfirmations.length > 0 ? 'menu' : 'playing',
        currentLevel: level,
        minecart,
        energy: {
          current: level.initialEnergy,
          max: level.initialEnergy,
          consumptionRate: config.energyConsumption,
          lowThreshold: level.initialEnergy * 0.2,
        },
        events: [],
        time: 0,
        deltaTime: 0,
        seed: level.seed,
        speed: 0,
        success: false,
      },
      trackSystem,
      minecartConfig: config,
      random,
      energyHistory: [{ time: 0, energy: level.initialEnergy, reason: 'initial' }],
      collectedOreIndices: new Set(),
      collisionCarts: level.collisionCarts?.map((c) => ({ ...c })) || [],
      pendingConfirmations,
    });
  },

  confirmEvent: (eventId) => {
    set((state) => {
      const newConfirmations = state.pendingConfirmations.filter(
        (c) => c.eventId !== eventId
      );
      return {
        pendingConfirmations: newConfirmations,
        state: {
          ...state.state,
          phase: newConfirmations.length === 0 ? 'playing' : state.state.phase,
        },
      };
    });
  },

  skipAllConfirmations: () => {
    set((state) => ({
      pendingConfirmations: [],
      state: { ...state.state, phase: 'playing' },
    }));
  },

  pauseGame: () => {
    set((state) => ({
      state: { ...state.state, phase: 'paused' },
    }));
  },

  resumeGame: () => {
    set((state) => ({
      state: { ...state.state, phase: 'playing' },
    }));
  },

  endGame: (success, failureAnalysis) => {
    const { state, energyHistory, minecartConfig } = get();
    const events = state.events;

    const runResult: RunResult = {
      runId: generateRunId(),
      levelId: state.currentLevel?.id || '',
      configId: minecartConfig?.id || '',
      seed: state.seed,
      success,
      totalTime: state.time,
      finalEnergy: state.energy?.current || 0,
      oreCollected: state.minecart?.oreCount || 0,
      maxSpeed: state.speed,
      energyUsed: (state.currentLevel?.initialEnergy || 0) - (state.energy?.current || 0),
      events,
      energyHistory,
      failureAnalysis,
      timestamp: Date.now(),
    };

    set((state) => ({
      state: { ...state.state, phase: 'finished', success },
      previousRunResult: state.lastRunResult,
      lastRunResult: runResult,
    }));
  },

  updateGame: (dt) => {
    const { state, trackSystem, minecartConfig, inputState, random } = get();

    if (state.phase !== 'playing' || !state.minecart || !trackSystem || !minecartConfig || !random) {
      return;
    }

    const minecart = state.minecart;
    const currentSpeed = physicsEngine.getSpeed(minecart.physics);

    if (inputState.switchLeft || inputState.switchRight) {
      const segment = trackSystem.getSegment(minecart.currentSegment);
      if (segment) {
        const nextResult = trackSystem.getNextSegment(minecart.currentSegment, minecart.progress);
        if (nextResult?.reachedSwitch) {
          trackSystem.toggleSwitch(nextResult.reachedSwitch);
          const switchEvent: GameEvent = {
            id: generateId(),
            timestamp: state.time,
            type: 'switch',
            data: { nodeId: nextResult.reachedSwitch },
          };
          set((s) => ({
            state: { ...s.state, events: [...s.state.events, switchEvent] },
          }));
        }
      }
    }

    physicsEngine.update(minecart.physics, inputState, minecartConfig, dt);

    const segPos = trackSystem.getSegmentPosition(minecart.currentSegment, minecart.progress);
    physicsEngine.applyTrackConstraint(minecart.physics, segPos.angle, minecartConfig.friction);

    const speed = physicsEngine.getSpeed(minecart.physics);
    const segmentLength = trackSystem.getSegmentLength(minecart.currentSegment);
    const progressIncrement = (speed * dt) / Math.max(segmentLength, 1);
    minecart.progress += progressIncrement;

    const nextResult = trackSystem.getNextSegment(minecart.currentSegment, minecart.progress);
    if (nextResult) {
      minecart.currentSegment = nextResult.segmentId;
      minecart.progress = nextResult.newProgress;
    }

    const newPos = trackSystem.getSegmentPosition(minecart.currentSegment, minecart.progress);
    minecart.physics.position.x = newPos.x;
    minecart.physics.position.y = newPos.y;
    minecart.physics.angle = newPos.angle;

    const energyConsumption = minecartConfig.energyConsumption * dt * (inputState.accelerate ? 2 : 1);
    minecart.energy = Math.max(0, minecart.energy - energyConsumption);

    if (minecart.energy <= 0) {
      const failureAnalysis: FailureAnalysis = {
        primaryCause: 'energy',
        causePercentage: { energy: 100 },
        timeline: [{ time: state.time, event: '能量耗尽', impact: 100 }],
        suggestions: ['降低加速频率', '选择节能矿车', '优化路线减少行驶距离'],
      };
      get().endGame(false, failureAnalysis);
      return;
    }

    if (minecart.energy < (state.energy?.lowThreshold || 0)) {
      const criticalEvent: GameEvent = {
        id: generateId(),
        timestamp: state.time,
        type: 'energy_critical',
        data: { energy: minecart.energy },
      };
      set((s) => ({
        state: { ...s.state, events: [...s.state.events, criticalEvent] },
      }));
    }

    const level = state.currentLevel;
    if (level) {
      level.oreLocations.forEach((ore, index) => {
        if (!get().collectedOreIndices.has(index)) {
          const dist = Math.hypot(minecart.physics.position.x - ore.x, minecart.physics.position.y - ore.y);
          if (dist < 40) {
            minecart.oreCount += ore.amount;
            set((s) => {
              const newSet = new Set(s.collectedOreIndices);
              newSet.add(index);
              return { collectedOreIndices: newSet };
            });
            const oreEvent: GameEvent = {
              id: generateId(),
              timestamp: state.time,
              type: 'ore',
              data: { amount: ore.amount, total: minecart.oreCount },
            };
            set((s) => ({
              state: { ...s.state, events: [...s.state.events, oreEvent] },
            }));
          }
        }
      });

      const endNode = trackSystem.getNode(level.endNode);
      if (endNode) {
        const distToEnd = Math.hypot(minecart.physics.position.x - endNode.x, minecart.physics.position.y - endNode.y);
        if (distToEnd < 30) {
          const baseEvent: GameEvent = {
            id: generateId(),
            timestamp: state.time,
            type: 'base',
            data: { oreDelivered: minecart.oreCount },
          };
          set((s) => ({
            state: { ...s.state, events: [...s.state.events, baseEvent] },
          }));
          get().endGame(true);
          return;
        }
      }

      const collisionCarts = get().collisionCarts;
      collisionCarts.forEach((cart, i) => {
        cart.x += cart.vx * dt;
        cart.y += cart.vy * dt;
        
        const dist = Math.hypot(minecart.physics.position.x - cart.x, minecart.physics.position.y - cart.y);
        if (dist < 35) {
          const collisionEvent: GameEvent = {
            id: generateId(),
            timestamp: state.time,
            type: 'collision',
            data: { cartIndex: i },
            needsConfirmation: true,
          };
          set((s) => ({
            state: { ...s.state, events: [...s.state.events, collisionEvent] },
          }));
          
          const failureAnalysis: FailureAnalysis = {
            primaryCause: 'collision',
            causePercentage: { collision: 85, speed: 15 },
            timeline: [
              { time: state.time, event: '矿车相撞', impact: 85 },
              { time: state.time - 1, event: '速度过快', impact: 15 },
            ],
            suggestions: ['注意对向矿车', '提前减速', '在岔口避让'],
          };
          get().endGame(false, failureAnalysis);
          return;
        }
      });

      if (level.meteorSchedule) {
        level.meteorSchedule.forEach((meteor) => {
          if (Math.abs(state.time - meteor.time) < 0.5) {
            const dist = Math.hypot(minecart.physics.position.x - meteor.x, minecart.physics.position.y - meteor.y);
            if (dist < 50) {
              const meteorEvent: GameEvent = {
                id: generateId(),
                timestamp: state.time,
                type: 'meteor',
                data: { x: meteor.x, y: meteor.y },
                needsConfirmation: true,
              };
              set((s) => ({
                state: { ...s.state, events: [...s.state.events, meteorEvent] },
              }));
            }
          }
        });
      }

      if (state.time > level.timeLimit) {
        const failureAnalysis: FailureAnalysis = {
          primaryCause: 'timeout',
          causePercentage: { timeout: 70, route: 30 },
          timeline: [{ time: state.time, event: '超时', impact: 70 }],
          suggestions: ['选择更快矿车', '优化路线', '减少停留'],
        };
        get().endGame(false, failureAnalysis);
        return;
      }
    }

    const newSpeed = physicsEngine.getSpeed(minecart.physics);
    const lastEnergyPoint = get().energyHistory[get().energyHistory.length - 1];
    if (!lastEnergyPoint || state.time - lastEnergyPoint.time >= 0.5) {
      set((s) => ({
        energyHistory: [...s.energyHistory, { time: state.time, energy: minecart.energy }],
      }));
    }

    set((s) => ({
      state: {
        ...s.state,
        time: s.state.time + dt,
        deltaTime: dt,
        speed: Math.max(s.state.speed, newSpeed),
        minecart: { ...minecart },
        energy: s.state.energy ? { ...s.state.energy, current: minecart.energy } : null,
      },
    }));
  },

  resetGame: () => {
    set({
      state: {
        phase: 'menu',
        currentLevel: null,
        minecart: null,
        energy: null,
        events: [],
        time: 0,
        deltaTime: 0,
        seed: 42,
        speed: 0,
        success: false,
      },
      trackSystem: null,
      inputState: {
        accelerate: false,
        brake: false,
        switchLeft: false,
        switchRight: false,
      },
      random: null,
      energyHistory: [],
      collectedOreIndices: new Set(),
      collisionCarts: [],
      pendingConfirmations: [],
    });
  },
}));
