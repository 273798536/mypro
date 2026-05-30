import { create } from 'zustand';
import type { VisitRecord, WindowShift, Holiday, Experiment, SimulationResult, AnomalyRecord, ExperimentConfig, DataGroup } from '@/types';
import { mockVisits, mockWindows, mockHolidays, mockExperiments } from '@/data/mockData';
import { QueueSimulationEngine } from '@/services/QueueSimulationEngine';
import { DataGroupingService } from '@/services/DataGroupingService';
import { AnomalyAnalysisService } from '@/services/AnomalyAnalysisService';

interface AppState {
  visits: VisitRecord[];
  windows: WindowShift[];
  holidays: Holiday[];
  experiments: Experiment[];
  results: SimulationResult[];
  anomalies: AnomalyRecord[];
  selectedResult: SimulationResult | null;
  tracePanelOpen: boolean;
  
  addVisit: (visit: Omit<VisitRecord, 'id' | 'dataGroup'>) => void;
  addWindow: (window: Omit<WindowShift, 'id'>) => void;
  addHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  addExperiment: (experiment: Omit<Experiment, 'id' | 'createdAt' | 'progress' | 'status'>) => void;
  
  runExperiment: (experimentId: string) => Promise<void>;
  runAllExperiments: () => Promise<void>;
  openTracePanel: (result: SimulationResult) => void;
  closeTracePanel: () => void;
  
  analyzeAnomalies: (result: SimulationResult) => void;
  
  getGroupedVisits: () => { normal: VisitRecord[]; boundary: VisitRecord[]; badInput: VisitRecord[] };
}

const queueEngine = new QueueSimulationEngine();
const groupingService = new DataGroupingService();
const anomalyService = new AnomalyAnalysisService();

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export const useStore = create<AppState>((set, get) => ({
  visits: mockVisits,
  windows: mockWindows,
  holidays: mockHolidays,
  experiments: mockExperiments,
  results: [],
  anomalies: [],
  selectedResult: null,
  tracePanelOpen: false,

  addVisit: (visit) => set((state) => ({
    visits: [...state.visits, { ...visit, id: generateId(), dataGroup: 'normal' }]
  })),

  addWindow: (window) => set((state) => ({
    windows: [...state.windows, { ...window, id: generateId() }]
  })),

  addHoliday: (holiday) => set((state) => ({
    holidays: [...state.holidays, { ...holiday, id: generateId() }]
  })),

  addExperiment: (experiment) => set((state) => ({
    experiments: [...state.experiments, {
      ...experiment,
      id: generateId(),
      createdAt: new Date(),
      progress: 0,
      status: 'pending'
    }]
  })),

  runExperiment: async (experimentId) => {
    const { experiments, visits, windows } = get();
    const experiment = experiments.find(e => e.id === experimentId);
    if (!experiment) return;

    set({ experiments: experiments.map(e => 
      e.id === experimentId ? { ...e, status: 'running', progress: 10 } : e
    )});

    await new Promise(resolve => setTimeout(resolve, 300));

    const grouped = get().getGroupedVisits();
    const groupsToRun: DataGroup[] = ['normal'];
    if (experiment.config.includeBoundary) groupsToRun.push('boundary');
    if (experiment.config.includeBadInput) groupsToRun.push('badInput');

    set({ experiments: experiments.map(e => 
      e.id === experimentId ? { ...e, status: 'running', progress: 40 } : e
    )});

    await new Promise(resolve => setTimeout(resolve, 300));

    const newResults: SimulationResult[] = [];
    for (const group of groupsToRun) {
      const groupVisits = grouped[group];
      if (groupVisits.length === 0) continue;

      const filteredWindows = windows.filter(w => w.windowNo <= experiment.config.windowCount);
      const result = queueEngine.simulate(groupVisits, filteredWindows, experimentId, group);
      newResults.push(result);
    }

    set({ experiments: experiments.map(e => 
      e.id === experimentId ? { ...e, status: 'running', progress: 80 } : e
    )});

    await new Promise(resolve => setTimeout(resolve, 200));

    set((state) => ({
      results: [...state.results, ...newResults],
      experiments: experiments.map(e => 
        e.id === experimentId ? { ...e, status: 'completed', progress: 100 } : e
      )
    }));

    for (const result of newResults) {
      get().analyzeAnomalies(result);
    }
  },

  runAllExperiments: async () => {
    const { experiments } = get();
    const pending = experiments.filter(e => e.status === 'pending');
    
    for (const exp of pending) {
      await get().runExperiment(exp.id);
    }
  },

  openTracePanel: (result) => set({
    selectedResult: result,
    tracePanelOpen: true
  }),

  closeTracePanel: () => set({
    selectedResult: null,
    tracePanelOpen: false
  }),

  analyzeAnomalies: (result) => {
    const { visits, windows } = get();
    
    const noShowAnomalies = anomalyService.analyzeNoShows(visits, result);
    const durationAnomalies = anomalyService.analyzeAbnormalDuration(visits);
    const closeAnomalies = anomalyService.analyzeTemporaryClose(windows, result.queueTrace.timeline);

    const allAnomalies = [...noShowAnomalies, ...durationAnomalies, ...closeAnomalies];
    allAnomalies.forEach(a => a.experimentId = result.experimentId);

    set((state) => ({
      anomalies: [...state.anomalies, ...allAnomalies]
    }));
  },

  getGroupedVisits: () => {
    const { visits } = get();
    return groupingService.groupData(visits);
  }
}));
