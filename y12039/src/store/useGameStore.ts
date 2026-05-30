import { create } from 'zustand';
import type { GameState, Task, Staff, DecisionRecord } from '../types/game';
import { GameEngine } from '../engine/GameEngine';
import modulesData from '../data/modules.json';
import tasksData from '../data/tasks.json';
import staffData from '../data/staff.json';
import powerNodesData from '../data/powerNodes.json';
import type { Module, PowerNode } from '../types/game';
import { OXYGEN_DEPLETION_SCENARIO, TASK_CONFLICT_SCENARIO, FATIGUE_MANAGEMENT_SCENARIO } from '../data/boundaryScenarios';

const DEFAULT_SEED = 42;

export const createInitialState = (hasPowerNodes: boolean = false): Omit<GameState, 'status' | 'speed' | 'snapshots' | 'score' | 'decisions' | 'hasPowerNodes' | 'seed' | 'selectedTaskId'> => ({
  resources: {
    oxygen: 100,
    maxOxygen: 100,
    oxygenConsumptionRate: 1,
    power: 100,
    maxPower: 100,
    powerGenerationRate: 2,
    time: 0,
    maxTime: 300
  },
  modules: modulesData as Module[],
  tasks: tasksData as Task[],
  staff: staffData as Staff[],
  powerNodes: hasPowerNodes ? powerNodesData as PowerNode[] : [],
  alerts: [],
  penalties: []
});

export type ScenarioType = 'oxygen_depletion' | 'task_conflict' | 'fatigue_management' | 'standard';

interface GameStore extends GameState {
  engine: GameEngine;
  gameLoop: number | null;
  lastUpdateTime: number;
  currentScenario: ScenarioType;
  
  initGame: (withPowerNodes?: boolean) => void;
  loadScenario: (scenario: ScenarioType) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  selectTask: (taskId: string | null) => void;
  assignStaffToTask: (taskId: string, staffIds: string[]) => void;
  unassignStaffFromTask: (taskId: string, staffId: string) => void;
  startTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  setStaffResting: (staffId: string, resting: boolean) => void;
  addPowerNodes: () => void;
  getPowerNodeImpact: (taskId: string) => { nodeId: string; affected: boolean } | null;
  saveSnapshot: () => void;
  
  update: () => void;
  startLoop: () => void;
  stopLoop: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(false),
  status: 'idle',
  speed: 1,
  snapshots: [],
  score: 0,
  penalties: [],
  decisions: [],
  hasPowerNodes: false,
  seed: DEFAULT_SEED,
  selectedTaskId: null,
  engine: new GameEngine(DEFAULT_SEED),
  gameLoop: null,
  lastUpdateTime: 0,
  currentScenario: 'standard',

  initGame: (withPowerNodes: boolean = false) => {
    const engine = new GameEngine(DEFAULT_SEED);
    set({
      ...createInitialState(withPowerNodes),
      status: 'idle',
      speed: 1,
      snapshots: [],
      score: 0,
      penalties: [],
      decisions: [],
      hasPowerNodes: withPowerNodes,
      seed: DEFAULT_SEED,
      selectedTaskId: null,
      engine,
      gameLoop: null,
      lastUpdateTime: 0,
      currentScenario: 'standard'
    });
  },

  loadScenario: (scenario: ScenarioType) => {
    const engine = new GameEngine(DEFAULT_SEED);
    let scenarioData: Partial<GameState> = {};
    
    switch (scenario) {
      case 'oxygen_depletion':
        scenarioData = OXYGEN_DEPLETION_SCENARIO;
        break;
      case 'task_conflict':
        scenarioData = TASK_CONFLICT_SCENARIO;
        break;
      case 'fatigue_management':
        scenarioData = FATIGUE_MANAGEMENT_SCENARIO;
        break;
      default:
        scenarioData = createInitialState(false);
    }
    
    set({
      ...createInitialState(false),
      ...scenarioData,
      status: 'idle',
      speed: 1,
      snapshots: [],
      score: scenarioData.score || 0,
      penalties: [],
      decisions: [],
      hasPowerNodes: false,
      seed: DEFAULT_SEED,
      selectedTaskId: null,
      engine,
      gameLoop: null,
      lastUpdateTime: 0,
      currentScenario: scenario
    });
  },

  startGame: () => {
    set({ status: 'playing', lastUpdateTime: Date.now() });
    get().startLoop();
  },

  pauseGame: () => {
    set({ status: 'paused' });
    get().stopLoop();
  },

  resumeGame: () => {
    set({ status: 'playing', lastUpdateTime: Date.now() });
    get().startLoop();
  },

  restartGame: () => {
    get().stopLoop();
    const hasPowerNodes = get().hasPowerNodes;
    const engine = new GameEngine(DEFAULT_SEED);
    set({
      ...createInitialState(hasPowerNodes),
      status: 'idle',
      speed: 1,
      snapshots: [],
      score: 0,
      penalties: [],
      decisions: [],
      selectedTaskId: null,
      engine,
      gameLoop: null,
      lastUpdateTime: 0
    });
  },

  setSpeed: (speed) => set({ speed }),

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  assignStaffToTask: (taskId, staffIds) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'pending') return;

    const selectedStaff = staffIds.map(id => state.staff.find(s => s.id === id)).filter(Boolean);
    if (selectedStaff.length !== staffIds.length) return;

    const availableStaff = selectedStaff.filter(s => 
      s?.status === 'idle' || s?.status === 'resting'
    );
    if (availableStaff.length !== staffIds.length) return;

    const efficiency = state.engine.calculateDecisionEfficiency(task, staffIds, state.staff);
    
    const decision: DecisionRecord = {
      id: `decision-${Date.now()}`,
      timestamp: state.resources.time,
      type: 'assign',
      taskId,
      staffIds,
      efficiency
    };

    const updatedTasks = state.tasks.map(t =>
      t.id === taskId ? { ...t, assignedStaff: staffIds } : t
    );

    set({
      tasks: updatedTasks,
      decisions: [...state.decisions, decision]
    });
  },

  unassignStaffFromTask: (taskId, staffId) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'pending') return;

    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? { ...t, assignedStaff: t.assignedStaff.filter(id => id !== staffId) }
        : t
    );

    set({ tasks: updatedTasks });
  },

  startTask: (taskId) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'pending') return;
    if (task.assignedStaff.length === 0) return;
    if (task.assignedStaff.length < task.requiredStaff) return;

    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'in_progress' as const, startTime: state.resources.time }
        : t
    );

    const updatedStaff = state.staff.map(s =>
      task.assignedStaff.includes(s.id)
        ? { ...s, status: 'working' as const, currentTaskId: taskId }
        : s
    );

    set({ tasks: updatedTasks, staff: updatedStaff, selectedTaskId: null });
  },

  cancelTask: (taskId) => {
    const state = get();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const assignedStaff = task.assignedStaff;

    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'pending' as const, assignedStaff: [], startTime: undefined }
        : t
    );

    const updatedStaff = state.staff.map(s =>
      assignedStaff.includes(s.id) && s.currentTaskId === taskId
        ? { ...s, status: 'idle' as const, currentTaskId: undefined }
        : s
    );

    set({ tasks: updatedTasks, staff: updatedStaff });
  },

  setStaffResting: (staffId, resting) => {
    const state = get();
    const staffMember = state.staff.find(s => s.id === staffId);
    if (!staffMember) return;
    if (staffMember.status === 'working' || staffMember.status === 'exhausted') return;

    const updatedStaff = state.staff.map(s =>
      s.id === staffId
        ? { ...s, status: resting ? 'resting' as const : 'idle' as const }
        : s
    );

    set({ staff: updatedStaff });
  },

  addPowerNodes: () => {
    const state = get();
    if (state.hasPowerNodes) return;

    const powerNodes = powerNodesData as PowerNode[];
    const updatedModules = state.modules.map(m => {
      const node = powerNodes.find(n => n.moduleId === m.id);
      if (node) {
        return { ...m, hasPowerNode: true, powerNodeId: node.id };
      }
      return m;
    });

    const updatedTasks = state.tasks.map(t => {
      const module = updatedModules.find(m => m.id === t.moduleId);
      if (module?.powerNodeId) {
        const node = powerNodes.find(n => n.id === module.powerNodeId);
        const isAffected = node?.affectedModules.includes(t.moduleId);
        return {
          ...t,
          powerNodeImpact: isAffected ? { nodeId: module.powerNodeId, affected: true } : undefined
        };
      }
      return t;
    });

    set({
      hasPowerNodes: true,
      powerNodes,
      modules: updatedModules,
      tasks: updatedTasks
    });
  },

  getPowerNodeImpact: (taskId) => {
    const state = get();
    if (!state.hasPowerNodes) return null;
    const task = state.tasks.find(t => t.id === taskId);
    return task?.powerNodeImpact || null;
  },

  saveSnapshot: () => {
    const state = get();
    const snapshot = state.engine.createSnapshot(state);
    set({ snapshots: [...state.snapshots.slice(-100), snapshot] });
  },

  update: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const now = Date.now();
    const deltaTime = Math.min((now - state.lastUpdateTime) / 1000, 0.1);
    set({ lastUpdateTime: now });

    const updates = state.engine.update(state, deltaTime);
    set(updates as Partial<GameState>);

    if (Math.floor(state.resources.time) !== Math.floor(state.resources.time + deltaTime * state.speed)) {
      get().saveSnapshot();
    }
  },

  startLoop: () => {
    const state = get();
    if (state.gameLoop) return;

    const loopId = window.setInterval(() => {
      get().update();
    }, 50);

    set({ gameLoop: loopId, lastUpdateTime: Date.now() });
  },

  stopLoop: () => {
    const state = get();
    if (state.gameLoop) {
      clearInterval(state.gameLoop);
      set({ gameLoop: null });
    }
  }
}));
