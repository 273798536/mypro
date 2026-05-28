import { create } from 'zustand';
import { Vector3 } from 'three';
import {
  BallState,
  PhysicsError,
  ExperimentRecord,
  PlaybackFrame,
  ExperimentSettings,
  ModificationTrace,
} from '../types';
import {
  calculateTotalMomentum,
  calculateTotalKineticEnergy,
  vectorToObject,
  elasticCollision2D,
  checkBallCollision,
  separateBalls,
  checkWallCollision,
  applyFriction,
  checkMomentumConservation,
  checkPenetrationError,
  validateParameter,
} from '../utils/physics';

const createInitialBalls = (): BallState[] => [
  {
    id: 'ball-1',
    label: '球 A',
    mass: 1.0,
    radius: 0.3,
    position: new Vector3(-2, 0.3, 0),
    velocity: new Vector3(2, 0, 0),
    color: '#00D4FF',
    trail: [],
    source: '默认配置',
    sourceLine: 1,
  },
  {
    id: 'ball-2',
    label: '球 B',
    mass: 1.0,
    radius: 0.3,
    position: new Vector3(2, 0.3, 0),
    velocity: new Vector3(-1, 0, 0),
    color: '#FF6B35',
    trail: [],
    source: '默认配置',
    sourceLine: 2,
  },
];

const initialSettings: ExperimentSettings = {
  friction: 0.01,
  tableWidth: 8,
  tableHeight: 5,
  gravity: 9.8,
};

interface ExperimentStore {
  balls: BallState[];
  settings: ExperimentSettings;
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
  errors: PhysicsError[];
  records: ExperimentRecord[];
  playbackFrames: PlaybackFrame[];
  initialMomentum: { x: number; y: number; z: number; magnitude: number } | null;
  initialKineticEnergy: number | null;
  modificationTraces: ModificationTrace[];
  recordingMode: 'live' | 'playback';
  frameIndex: number;

  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTime: (time: number) => void;

  updateBall: (id: string, updates: Partial<BallState>, source?: string) => void;
  addBall: () => void;
  removeBall: (id: string) => void;
  resetBalls: () => void;

  updateSettings: (updates: Partial<ExperimentSettings>, source?: string) => void;

  addError: (error: PhysicsError) => void;
  clearErrors: () => void;
  dismissError: (errorId: string) => void;

  physicsStep: (dt: number) => void;
  recordFrame: () => void;
  startPlayback: () => void;
  seekToFrame: (index: number) => void;

  saveRecord: (screenshot?: string) => void;
  deleteRecord: (id: string) => void;
  clearRecords: () => void;

  loadRecord: (record: ExperimentRecord) => void;
}

export const useExperimentStore = create<ExperimentStore>((set, get) => ({
  balls: createInitialBalls(),
  settings: initialSettings,
  isPlaying: false,
  isPaused: false,
  playbackSpeed: 1.0,
  currentTime: 0,
  duration: 10,
  errors: [],
  records: [],
  playbackFrames: [],
  initialMomentum: null,
  initialKineticEnergy: null,
  modificationTraces: [],
  recordingMode: 'live',
  frameIndex: 0,

  setPlaying: (playing: boolean) => {
      console.log('[DEBUG] setPlaying called with:', playing, 'current isPlaying:', get().isPlaying);
      if (playing) {
        const { balls } = get();
        const momentum = calculateTotalMomentum(balls);
        const ke = calculateTotalKineticEnergy(balls);
        set({
          isPlaying: true,
          isPaused: false,
          currentTime: 0,
          initialMomentum: vectorToObject(momentum),
          initialKineticEnergy: ke,
          playbackFrames: [],
          recordingMode: 'live',
          frameIndex: 0,
        });
      } else {
        set({ isPlaying: false, recordingMode: 'playback' });
      }
      console.log('[DEBUG] setPlaying done, new isPlaying:', get().isPlaying);
    },

  setPaused: (paused) => set({ isPaused: paused }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setCurrentTime: (time) => set({ currentTime: time }),

  updateBall: (id, updates, source = '用户输入') => {
    const { balls, modificationTraces } = get();
    const ball = balls.find((b) => b.id === id);
    if (!ball) return;

    const newErrors: PhysicsError[] = [];
    const sourceLocation = `${source} (行 ${ball.sourceLine || '?'})`;

    if (updates.mass !== undefined) {
      const error = validateParameter(updates.mass, 'mass', sourceLocation, id);
      if (error) newErrors.push(error);
    }
    if (updates.velocity !== undefined) {
      const speed = updates.velocity.length();
      const error = validateParameter(speed, 'velocity', sourceLocation, id);
      if (error) newErrors.push(error);
    }
    if (updates.radius !== undefined) {
      const error = validateParameter(updates.radius, 'radius', sourceLocation, id);
      if (error) newErrors.push(error);
    }

    const newTraces: ModificationTrace[] = [...modificationTraces];
    Object.entries(updates).forEach(([field, newValue]) => {
      const oldValue = (ball as any)[field];
      if (oldValue !== newValue) {
        newTraces.push({
          field,
          oldValue,
          newValue,
          timestamp: Date.now(),
          source,
        });
      }
    });

    set({
      balls: balls.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      errors: [...get().errors, ...newErrors],
      modificationTraces: newTraces,
    });
  },

  addBall: () => {
    const { balls } = get();
    const newIndex = balls.length + 1;
    const colors = ['#00D4FF', '#FF6B35', '#00FF88', '#FFD700', '#FF69B4'];
    const newBall: BallState = {
      id: `ball-${Date.now()}`,
      label: `球 ${String.fromCharCode(64 + newIndex)}`,
      mass: 1.0,
      radius: 0.3,
      position: new Vector3(
        (Math.random() - 0.5) * 4,
        0.3,
        (Math.random() - 0.5) * 3
      ),
      velocity: new Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ),
      color: colors[newIndex % colors.length],
      trail: [],
      source: '手动添加',
      sourceLine: newIndex,
    };
    set({ balls: [...balls, newBall] });
  },

  removeBall: (id) => {
    const { balls } = get();
    if (balls.length <= 1) return;
    set({ balls: balls.filter((b) => b.id !== id) });
  },

  resetBalls: () => {
    set({
      balls: createInitialBalls(),
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      playbackFrames: [],
      errors: [],
      initialMomentum: null,
      initialKineticEnergy: null,
      modificationTraces: [],
      recordingMode: 'live',
      frameIndex: 0,
    });
  },

  updateSettings: (updates, source = '用户输入') => {
    const { settings, errors } = get();
    const newErrors: PhysicsError[] = [];

    if (updates.friction !== undefined) {
      const error = validateParameter(updates.friction, 'friction', source);
      if (error) newErrors.push(error);
    }

    set({
      settings: { ...settings, ...updates },
      errors: [...errors, ...newErrors],
    });
  },

  addError: (error) => {
    set((state) => ({ errors: [...state.errors, error] }));
  },

  clearErrors: () => set({ errors: [] }),

  dismissError: (errorId) => {
    set((state) => ({ errors: state.errors.filter((e) => e.id !== errorId) }));
  },

  physicsStep: (dt: number) => {
    const { balls, settings, initialMomentum } = get();
    const newBalls = balls.map((ball) => ({
      ...ball,
      position: ball.position.clone(),
      velocity: ball.velocity.clone(),
      trail: [...ball.trail],
    }));

    const newErrors: PhysicsError[] = [];

    newBalls.forEach((ball) => {
      const newVel = applyFriction(ball.velocity, settings.friction, dt);
      ball.velocity.copy(newVel);
      ball.position.add(ball.velocity.clone().multiplyScalar(dt));

      ball.trail.push(ball.position.clone());
      if (ball.trail.length > 100) ball.trail.shift();
    });

    let collisionOccurred = false;
    for (let i = 0; i < newBalls.length; i++) {
      for (let j = i + 1; j < newBalls.length; j++) {
        if (checkBallCollision(newBalls[i], newBalls[j])) {
          const penError = checkPenetrationError(
            newBalls[i],
            newBalls[j],
            `物理引擎 step 碰撞检测 (球 ${i + 1}-${j + 1})`
          );
          if (penError) newErrors.push(penError);

          separateBalls(newBalls[i], newBalls[j]);

          const momentumBefore = calculateTotalMomentum(newBalls);

          const [v1, v2] = elasticCollision2D(newBalls[i], newBalls[j]);
          newBalls[i].velocity.copy(v1);
          newBalls[j].velocity.copy(v2);

          const momentumAfter = calculateTotalMomentum(newBalls);
          const momError = checkMomentumConservation(
            momentumBefore,
            momentumAfter,
            `碰撞后动量校验 (球 ${i + 1}-${j + 1}, t=${get().currentTime.toFixed(2)}s)`,
            [newBalls[i].id, newBalls[j].id]
          );
          if (momError) newErrors.push(momError);

          collisionOccurred = true;
        }
      }
    }

    newBalls.forEach((ball, index) => {
      const { collided, newVelocity } = checkWallCollision(
        ball,
        settings.tableWidth,
        settings.tableHeight
      );
      if (collided) {
        ball.velocity.copy(newVelocity);
      }
    });

    set((state) => ({
      balls: newBalls,
      currentTime: state.currentTime + dt,
      errors: newErrors.length > 0 ? [...state.errors, ...newErrors] : [...state.errors],
    }));
  },

  recordFrame: () => {
    const { balls, playbackFrames, currentTime } = get();
    const momentum = calculateTotalMomentum(balls);
    const ke = calculateTotalKineticEnergy(balls);

    const frame: PlaybackFrame = {
      time: currentTime,
      balls: balls.map((b) => ({
        ...b,
        position: b.position.clone(),
        velocity: b.velocity.clone(),
      })),
      momentum: vectorToObject(momentum),
      kineticEnergy: ke,
    };

    set({ playbackFrames: [...playbackFrames, frame] });
  },

  startPlayback: () => {
    set({ recordingMode: 'playback', frameIndex: 0, isPlaying: false });
  },

  seekToFrame: (index) => {
    const { playbackFrames } = get();
    if (index < 0 || index >= playbackFrames.length) return;

    const frame = playbackFrames[index];
    const balls: BallState[] = frame.balls.map((b) => ({
      ...b,
      position: b.position.clone(),
      velocity: b.velocity.clone(),
      trail: [],
    }));

    set({
      balls,
      currentTime: frame.time,
      frameIndex: index,
    });
  },

  saveRecord: (screenshot) => {
    const { balls, initialMomentum, initialKineticEnergy, errors, modificationTraces, playbackFrames } = get();
    const finalMomentum = calculateTotalMomentum(balls);
    const finalKE = calculateTotalKineticEnergy(balls);

    const record: ExperimentRecord = {
      id: `record-${Date.now()}`,
      timestamp: Date.now(),
      initialBalls: playbackFrames[0]?.balls.map((b) => ({
        ...b,
        position: b.position.clone(),
        velocity: b.velocity.clone(),
      })) || balls.map((b) => ({ ...b })),
      finalBalls: balls.map((b) => ({
        ...b,
        position: b.position.clone(),
        velocity: b.velocity.clone(),
      })),
      momentumBefore: initialMomentum || { x: 0, y: 0, z: 0, magnitude: 0 },
      momentumAfter: vectorToObject(finalMomentum),
      kineticEnergyBefore: initialKineticEnergy || 0,
      kineticEnergyAfter: finalKE,
      errors: [...errors],
      screenshot,
      modificationTraces: [...modificationTraces],
    };

    set((state) => ({ records: [...state.records, record] }));
  },

  deleteRecord: (id) => {
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },

  clearRecords: () => set({ records: [] }),

  loadRecord: (record) => {
    const balls: BallState[] = record.initialBalls.map((b) => ({
      ...b,
      position: new Vector3(b.position.x, b.position.y, b.position.z),
      velocity: new Vector3(b.velocity.x, b.velocity.y, b.velocity.z),
      trail: [],
    }));

    set({
      balls,
      errors: [...record.errors],
      modificationTraces: [...record.modificationTraces],
      isPlaying: false,
      currentTime: 0,
      initialMomentum: record.momentumBefore,
      initialKineticEnergy: record.kineticEnergyBefore,
    });
  },
}));
