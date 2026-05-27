import { create } from 'zustand';
import { SolarParams, SolarResults, SolarScenario, ImportMode, ValidationError } from '../types';
import { calculateAll } from '../utils/solarCalculator';
import { validateParams, clampParams } from '../utils/validation';

interface SolarStore {
  params: SolarParams;
  results: SolarResults;
  scenarios: SolarScenario[];
  validationErrors: ValidationError[];
  selectedScenarioIds: string[];
  hoveredInfo: { key: string; value: string; description: string } | null;

  setParams: (params: Partial<SolarParams>) => void;
  recalculate: () => void;

  saveScenario: (name: string, source: string) => void;
  deleteScenario: (id: string) => void;
  importScenarios: (data: SolarScenario[], mode: ImportMode) => { ignored: number; added: number; overwritten: number };
  exportScenarios: () => string;
  loadScenario: (id: string) => void;
  toggleScenarioSelection: (id: string) => void;
  clearSelection: () => void;

  setHoveredInfo: (info: { key: string; value: string; description: string } | null) => void;
}

const defaultParams: SolarParams = {
  location: {
    lat: 39.9,
    lng: 116.4,
    name: '北京',
    timezone: 'Asia/Shanghai'
  },
  date: new Date().toISOString().split('T')[0],
  tiltAngle: 30,
  weatherFactor: 0.8,
  panelArea: 10
};

const defaultResults = calculateAll(defaultParams);

const STORAGE_KEY = 'solar-scenarios';

function loadScenariosFromStorage(): SolarScenario[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveScenariosToStorage(scenarios: SolarScenario[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export const useSolarStore = create<SolarStore>((set, get) => ({
  params: defaultParams,
  results: defaultResults,
  scenarios: loadScenariosFromStorage(),
  validationErrors: [],
  selectedScenarioIds: [],
  hoveredInfo: null,

  setParams: (newParams) => {
    const currentParams = get().params;
    const updatedParams = { ...currentParams, ...newParams };
    const clampedParams = clampParams(updatedParams);
    const errors = validateParams(updatedParams);
    const results = calculateAll(clampedParams);

    set({ params: clampedParams, results, validationErrors: errors });
  },

  recalculate: () => {
    const { params } = get();
    const results = calculateAll(params);
    set({ results });
  },

  saveScenario: (name, source) => {
    const { params, results, scenarios } = get();
    const now = new Date().toISOString();

    const existingIndex = scenarios.findIndex(s => s.name === name);
    let newScenarios: SolarScenario[];

    if (existingIndex >= 0) {
      const existing = scenarios[existingIndex];
      newScenarios = [...scenarios];
      newScenarios[existingIndex] = {
        ...existing,
        params,
        results,
        updatedAt: now,
        version: existing.version + 1,
        history: [
          ...existing.history,
          { timestamp: now, changes: `参数更新: 倾角${params.tiltAngle}°, 天气${params.weatherFactor}` }
        ]
      };
    } else {
      const newScenario: SolarScenario = {
        id: `scenario-${Date.now()}`,
        name,
        createdAt: now,
        updatedAt: now,
        source,
        version: 1,
        history: [{ timestamp: now, changes: '方案创建' }],
        params: { ...params },
        results: { ...results }
      };
      newScenarios = [...scenarios, newScenario];
    }

    saveScenariosToStorage(newScenarios);
    set({ scenarios: newScenarios });
  },

  deleteScenario: (id) => {
    const newScenarios = get().scenarios.filter(s => s.id !== id);
    saveScenariosToStorage(newScenarios);
    set({ scenarios: newScenarios });
  },

  importScenarios: (data, mode) => {
    const { scenarios } = get();
    let ignored = 0;
    let added = 0;
    let overwritten = 0;

    const scenarioMap = new Map(scenarios.map(s => [s.name, s]));

    data.forEach(item => {
      const existing = scenarioMap.get(item.name);

      if (existing) {
        if (mode === 'ignore') {
          ignored++;
        } else if (mode === 'overwrite') {
          scenarioMap.set(item.name, {
            ...item,
            id: existing.id,
            history: [
              ...existing.history,
              { timestamp: new Date().toISOString(), changes: `被导入方案覆盖 (来源: ${item.source})` }
            ]
          });
          overwritten++;
        } else {
          let newName = item.name;
          let counter = 1;
          while (scenarioMap.has(newName)) {
            newName = `${item.name} (${counter++})`;
          }
          scenarioMap.set(newName, {
            ...item,
            id: `scenario-${Date.now()}-${counter}`,
            name: newName,
            history: [
              ...item.history,
              { timestamp: new Date().toISOString(), changes: `重命名导入 (原名称: ${item.name})` }
            ]
          });
          added++;
        }
      } else {
        scenarioMap.set(item.name, {
          ...item,
          id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
        added++;
      }
    });

    const newScenarios = Array.from(scenarioMap.values());
    saveScenariosToStorage(newScenarios);
    set({ scenarios: newScenarios });

    return { ignored, added, overwritten };
  },

  exportScenarios: () => {
    return JSON.stringify(get().scenarios, null, 2);
  },

  loadScenario: (id) => {
    const scenario = get().scenarios.find(s => s.id === id);
    if (scenario) {
      set({ params: scenario.params, results: scenario.results, validationErrors: [] });
    }
  },

  toggleScenarioSelection: (id) => {
    const { selectedScenarioIds } = get();
    const newSelection = selectedScenarioIds.includes(id)
      ? selectedScenarioIds.filter(sid => sid !== id)
      : [...selectedScenarioIds, id];
    set({ selectedScenarioIds: newSelection });
  },

  clearSelection: () => {
    set({ selectedScenarioIds: [] });
  },

  setHoveredInfo: (info) => {
    set({ hoveredInfo: info });
  }
}));
