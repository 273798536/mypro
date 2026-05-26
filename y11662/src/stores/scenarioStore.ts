import { create } from 'zustand';
import { RateScenario, ScenarioState } from '../types';
import { sampleScenarios } from '../utils/sampleData';

export const useScenarioStore = create<ScenarioState & {
  setScenarios: (scenarios: RateScenario[]) => void;
  setActiveScenario: (id: string) => void;
  addScenario: (scenario: RateScenario) => void;
  updateScenario: (id: string, updates: Partial<RateScenario>) => void;
  deleteScenario: (id: string) => void;
  loadSampleScenarios: () => void;
}>((set) => ({
  scenarios: [],
  activeScenarioId: null,

  setScenarios: (scenarios) => {
    const active = scenarios.find((s) => s.isActive);
    set({ scenarios, activeScenarioId: active?.id || scenarios[0]?.id || null });
  },
  setActiveScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) => ({ ...s, isActive: s.id === id })),
      activeScenarioId: id,
    })),
  addScenario: (scenario) =>
    set((state) => ({
      scenarios: [...state.scenarios, scenario],
    })),
  updateScenario: (id, updates) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    })),
  deleteScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      activeScenarioId:
        state.activeScenarioId === id ? state.scenarios[0]?.id || null : state.activeScenarioId,
    })),
  loadSampleScenarios: () => {
    const active = sampleScenarios.find((s) => s.isActive);
    set({
      scenarios: sampleScenarios,
      activeScenarioId: active?.id || sampleScenarios[0]?.id || null,
    });
  },
}));