import { create } from 'zustand';
import {
  Pendulum,
  CouplingParams,
  CorrectionEntry,
  PhaseHistory,
  ExperimentRecord,
  ExperimentStatus,
} from '../types';
import {
  rk4Step,
  checkStability,
  computePhase,
  validateParams,
  validatePendulum,
} from '../utils/physics';
import { PRESETS, createPendulumsFromPreset } from '../utils/presets';

interface SimulationStore {
  isRunning: boolean;
  currentTime: number;
  speedMultiplier: number;
  pendulums: Pendulum[];
  couplingParams: CouplingParams;
  phaseHistory: PhaseHistory[];
  corrections: CorrectionEntry[];
  experimentRecords: ExperimentRecord[];
  currentStatus: ExperimentStatus;
  warnings: string[];

  setRunning: (running: boolean) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  setCouplingParam: (key: keyof CouplingParams, value: number) => void;
  setPendulumParam: (id: number, key: 'length' | 'mass' | 'initialAngle', value: number) => void;
  addPendulum: () => void;
  removePendulum: (id: number) => void;
  loadPreset: (index: number) => void;
  step: () => void;
  reset: () => void;
  saveExperiment: (note?: string) => void;
  clearCorrections: () => void;
  addWarning: (warning: string) => void;
  clearWarnings: () => void;
  clearHistory: () => void;
}

const defaultPendulums = createPendulumsFromPreset(PRESETS[0]);
const defaultCouplingParams: CouplingParams = {
  couplingCoeff: PRESETS[0].couplingCoeff,
  timeStep: PRESETS[0].timeStep,
  damping: PRESETS[0].damping,
  gravity: 9.81,
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  isRunning: false,
  currentTime: 0,
  speedMultiplier: 1,
  pendulums: defaultPendulums,
  couplingParams: defaultCouplingParams,
  phaseHistory: [{ time: 0, phases: defaultPendulums.map(p => p.phase) }],
  corrections: [],
  experimentRecords: [],
  currentStatus: 'normal',
  warnings: [],

  setRunning: (running) => set({ isRunning: running }),

  setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),

  setCouplingParam: (key, value) => {
    const params = { ...get().couplingParams, [key]: value };
    const error = validateParams(params);
    if (error) {
      get().addWarning(error);
      return;
    }
    set({ couplingParams: params });
  },

  setPendulumParam: (id, key, value) => {
    const pendulums = get().pendulums.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [key]: value };
      if (key === 'initialAngle') {
        updated.angle = value;
        updated.angularVelocity = 0;
        updated.phase = computePhase(value, 0);
      }
      return updated;
    });

    const target = pendulums.find(p => p.id === id);
    if (target) {
      const error = validatePendulum({
        id: target.id,
        length: target.length,
        mass: target.mass,
        initialAngle: target.initialAngle,
        angle: target.angle,
        color: target.color,
      });
      if (error) {
        get().addWarning(error);
        return;
      }
    }

    set({ pendulums, currentTime: 0 });
    set({ phaseHistory: [{ time: 0, phases: pendulums.map(p => p.phase) }] });
  },

  addPendulum: () => {
    const pendulums = get().pendulums;
    if (pendulums.length >= 8) return;

    const newId = Math.max(...pendulums.map(p => p.id), -1) + 1;
    const newPendulum: Pendulum = {
      id: newId,
      length: 1.0,
      mass: 1.0,
      initialAngle: 0,
      angle: 0,
      angularVelocity: 0,
      phase: 0,
      color: `hsl(${(newId * 45) % 360}, 70%, 60%)`,
    };

    set({
      pendulums: [...pendulums, newPendulum],
      phaseHistory: [{ time: 0, phases: [...pendulums.map(p => p.phase), 0] }],
    });
  },

  removePendulum: (id) => {
    const pendulums = get().pendulums;
    if (pendulums.length <= 2) return;

    const filtered = pendulums.filter(p => p.id !== id);
    set({
      pendulums: filtered,
      phaseHistory: [{ time: 0, phases: filtered.map(p => p.phase) }],
    });
  },

  loadPreset: (index) => {
    const preset = PRESETS[index];
    if (!preset) return;

    const pendulums = createPendulumsFromPreset(preset);
    set({
      pendulums,
      couplingParams: {
        couplingCoeff: preset.couplingCoeff,
        timeStep: preset.timeStep,
        damping: preset.damping,
        gravity: 9.81,
      },
      currentTime: 0,
      isRunning: false,
      phaseHistory: [{ time: 0, phases: pendulums.map(p => p.phase) }],
      corrections: [],
      currentStatus: 'normal',
      warnings: [],
    });
  },

  step: () => {
    const state = get();
    if (!state.isRunning) return;

    const { pendulums, couplingParams, currentTime, phaseHistory, corrections } = state;
    const oldAngles = pendulums.map(p => p.angle);

    const { newAngles, newVelocities } = rk4Step(pendulums, couplingParams);
    const newCorrections = checkStability(
      newAngles,
      oldAngles,
      newVelocities,
      pendulums,
      couplingParams,
      currentTime
    );

    const updatedPendulums = pendulums.map((p, i) => ({
      ...p,
      angle: newAngles[i],
      angularVelocity: newVelocities[i],
      phase: computePhase(newAngles[i], newVelocities[i]),
    }));

    const newTime = currentTime + couplingParams.timeStep;
    const newPhaseHistory = [
      ...phaseHistory,
      { time: newTime, phases: updatedPendulums.map(p => p.phase) },
    ].slice(-200);

    const allCorrections = [...corrections, ...newCorrections];
    const hasAutoCorrections = allCorrections.some(c => c.autoFixed);
    const hasManualReviews = allCorrections.some(c => !c.autoFixed);
    let newStatus: ExperimentStatus = 'normal';
    if (hasManualReviews) newStatus = 'needs_review';
    else if (hasAutoCorrections) newStatus = 'corrected';

    set({
      pendulums: updatedPendulums,
      currentTime: newTime,
      phaseHistory: newPhaseHistory,
      corrections: allCorrections,
      currentStatus: newStatus,
    });
  },

  reset: () => {
    const state = get();
    const pendulums = state.pendulums.map(p => ({
      ...p,
      angle: p.initialAngle,
      angularVelocity: 0,
      phase: computePhase(p.initialAngle, 0),
    }));

    set({
      pendulums,
      currentTime: 0,
      isRunning: false,
      phaseHistory: [{ time: 0, phases: pendulums.map(p => p.phase) }],
      corrections: [],
      currentStatus: 'normal',
      warnings: [],
    });
  },

  saveExperiment: (note) => {
    const state = get();
    const record: ExperimentRecord = {
      id: `exp_${Date.now()}`,
      timestamp: Date.now(),
      params: { ...state.couplingParams },
      pendulums: state.pendulums.map(p => ({ ...p })),
      status: state.currentStatus,
      corrections: [...state.corrections],
      note,
    };

    set({
      experimentRecords: [...state.experimentRecords, record],
    });
  },

  clearCorrections: () => set({ corrections: [], currentStatus: 'normal' }),

  addWarning: (warning) => {
    set({ warnings: [...get().warnings, warning] });
  },

  clearWarnings: () => set({ warnings: [] }),

  clearHistory: () => {
    set({
      phaseHistory: [{ time: 0, phases: get().pendulums.map(p => p.phase) }],
      currentTime: 0,
    });
  },
}));
