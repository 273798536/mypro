import { create } from 'zustand';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import type { CanvasSnapshot, CollisionEvent } from '../types/physics';
import type { Level } from '../types/level';

interface PhysicsState {
  engine: PhysicsEngine | null;
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  snapshots: CanvasSnapshot[];
  collisionEvents: CollisionEvent[];
  canvasWidth: number;
  canvasHeight: number;
  boundaryErrorTriggered: boolean;
}

interface PhysicsActions {
  initEngine: (width: number, height: number) => void;
  updateEngineSize: (width: number, height: number) => void;
  loadLevel: (level: Level) => void;
  play: () => void;
  pause: () => void;
  reset: (level: Level) => void;
  setSpeed: (speed: number) => void;
  update: (dt: number) => CollisionEvent[];
  seekTo: (timePoint: number) => void;
  takeSnapshot: () => CanvasSnapshot;
  forceBoundaryError: (ballId: string) => CollisionEvent | null;
  setBoundaryErrorTriggered: (triggered: boolean) => void;
  getBallAtPoint: (x: number, y: number) => ReturnType<PhysicsEngine['getBallAtPoint']>;
  render: (ctx: CanvasRenderingContext2D) => void;
  restoreFromSnapshot: (snapshot: CanvasSnapshot) => void;
}

export type PhysicsStore = PhysicsState & PhysicsActions;

export const usePhysicsStore = create<PhysicsStore>((set, get) => ({
  engine: null,
  isPlaying: false,
  currentTime: 0,
  speed: 1,
  snapshots: [],
  collisionEvents: [],
  canvasWidth: 800,
  canvasHeight: 500,
  boundaryErrorTriggered: false,

  initEngine: (width, height) => {
    const engine = new PhysicsEngine(width, height);
    set({
      engine,
      canvasWidth: width,
      canvasHeight: height,
    });
  },

  updateEngineSize: (width, height) => {
    const { engine } = get();
    if (engine) {
      engine.setSize(width, height);
      set({
        canvasWidth: width,
        canvasHeight: height,
      });
    }
  },

  loadLevel: (level) => {
    const { engine } = get();
    if (engine) {
      engine.loadBalls(level.initialBalls);
      engine.clearCollisionEvents();
      set({
        currentTime: 0,
        isPlaying: false,
        snapshots: [],
        collisionEvents: [],
        boundaryErrorTriggered: false,
      });
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  reset: (level) => {
    const { engine } = get();
    if (engine) {
      engine.reset(level.initialBalls);
      engine.clearCollisionEvents();
      set({
        currentTime: 0,
        isPlaying: false,
        snapshots: [],
        collisionEvents: [],
        boundaryErrorTriggered: false,
      });
    }
  },

  setSpeed: (speed) => set({ speed }),

  update: (dt) => {
    const { engine, speed } = get();
    if (!engine) return [];

    const effectiveDt = dt * speed;
    const newEvents = engine.update(effectiveDt);
    
    set((state) => ({
      currentTime: state.currentTime + effectiveDt,
      collisionEvents: [...state.collisionEvents, ...newEvents],
    }));

    return newEvents;
  },

  seekTo: (timePoint) => {
    const { snapshots } = get();
    const nearestSnapshot = snapshots
      .filter(s => s.timePoint <= timePoint)
      .sort((a, b) => b.timePoint - a.timePoint)[0];
    
    if (nearestSnapshot) {
      const { engine } = get();
      if (engine) {
        engine.restoreFromSnapshot(nearestSnapshot);
        set({ currentTime: nearestSnapshot.timePoint });
      }
    }
  },

  takeSnapshot: () => {
    const { engine, currentTime, snapshots } = get();
    if (!engine) {
      throw new Error('Engine not initialized');
    }
    const snapshot = engine.takeSnapshot(currentTime);
    set({ snapshots: [...snapshots, snapshot] });
    return snapshot;
  },

  forceBoundaryError: (ballId) => {
    const { engine } = get();
    if (!engine) return null;
    return engine.forceBoundaryError(ballId);
  },

  setBoundaryErrorTriggered: (triggered) => set({ boundaryErrorTriggered: triggered }),

  getBallAtPoint: (x, y) => {
    const { engine } = get();
    return engine?.getBallAtPoint(x, y);
  },

  render: (ctx) => {
    const { engine } = get();
    engine?.render(ctx);
  },

  restoreFromSnapshot: (snapshot) => {
    const { engine } = get();
    if (engine) {
      engine.restoreFromSnapshot(snapshot);
      set({ currentTime: snapshot.timePoint });
    }
  },
}));
