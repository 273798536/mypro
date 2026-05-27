import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserState,
  TransitionRecord,
  TransitionMatrix,
  PredictionResult,
  RiskDetection,
  HistoryRecord,
  SimulationScenario,
  Filters,
  AppState
} from '../types';
import { buildTransitionMatrix, generatePrediction, getInitialDistribution } from '../utils/markov';
import { detectRisks } from '../utils/riskDetection';

interface AppStore extends AppState {
  setStates: (states: UserState[]) => void;
  addTransition: (record: TransitionRecord) => void;
  updateTransition: (id: string, updates: Partial<TransitionRecord>) => void;
  removeTransition: (id: string) => void;
  setTransitions: (transitions: TransitionRecord[]) => void;
  setFilters: (filters: Partial<Filters>) => void;
  calculateMatrix: () => void;
  runPrediction: () => void;
  setMatrix: (matrix: TransitionMatrix) => void;
  setPrediction: (prediction: PredictionResult) => void;
  saveToHistory: (action: string, source: string, remark?: string) => void;
  addScenario: (scenario: SimulationScenario) => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
  setDataSource: (source: string) => void;
  reset: () => void;
}

const defaultStates: UserState[] = [
  { id: 'high_active', name: '高活跃', description: '每周访问≥5次', color: '#00B42A', isAbsorbing: false },
  { id: 'medium_active', name: '中活跃', description: '每周访问2-4次', color: '#165DFF', isAbsorbing: false },
  { id: 'low_active', name: '低活跃', description: '每周访问1次', color: '#FF7D00', isAbsorbing: false },
  { id: 'dormant', name: '沉睡', description: '连续2周未访问', color: '#86909C', isAbsorbing: false },
  { id: 'churned', name: '流失', description: '连续4周未访问', color: '#F53F3F', isAbsorbing: true }
];

const initialState: AppState = {
  states: defaultStates,
  transitions: [],
  matrix: null,
  prediction: null,
  filters: {
    channels: [],
    campaignTags: [],
    targetMonth: new Date().toISOString().slice(0, 7)
  },
  risks: [],
  history: [],
  scenarios: [],
  activeScenario: null,
  dataSource: '手动输入'
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStates: (states) => set({ states }),

      addTransition: (record) => {
        set((state) => ({
          transitions: [...state.transitions, record]
        }));
      },

      updateTransition: (id, updates) => {
        set((state) => ({
          transitions: state.transitions.map(t =>
            t.id === id ? { ...t, ...updates } : t
          )
        }));
      },

      removeTransition: (id) => {
        set((state) => ({
          transitions: state.transitions.filter(t => t.id !== id)
        }));
      },

      setTransitions: (transitions) => set({ transitions }),

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters }
        }));
      },

      calculateMatrix: () => {
        const { states, transitions, filters } = get();
        
        let filteredTransitions = transitions;
        if (filters.channels.length > 0) {
          filteredTransitions = filteredTransitions.filter(
            t => t.channel && filters.channels.includes(t.channel)
          );
        }
        if (filters.campaignTags.length > 0) {
          filteredTransitions = filteredTransitions.filter(
            t => t.campaignTag && filters.campaignTags.includes(t.campaignTag)
          );
        }

        const matrix = buildTransitionMatrix(states, filteredTransitions);
        const risks = detectRisks(matrix, filteredTransitions);
        
        set({ matrix, risks });
      },

      runPrediction: () => {
        const { matrix, transitions, states, filters } = get();
        if (!matrix) return;

        const initialDist = getInitialDistribution(transitions, states);
        const prediction = generatePrediction(matrix, initialDist, filters.targetMonth);
        
        set({ prediction });
      },

      setMatrix: (matrix) => set({ matrix }),

      setPrediction: (prediction) => set({ prediction }),

      saveToHistory: (action, source, remark) => {
        const { transitions, matrix, prediction, history } = get();
        
        const record: HistoryRecord = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          operator: '当前用户',
          action,
          beforeData: history.length > 0 ? history[0].afterData : null,
          afterData: { transitions, matrix, prediction },
          source,
          remark
        };

        set((state) => ({
          history: [record, ...state.history].slice(0, 100)
        }));
      },

      addScenario: (scenario) => {
        set((state) => ({
          scenarios: [...state.scenarios, scenario]
        }));
      },

      removeScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter(s => s.id !== id)
        }));
      },

      setActiveScenario: (id) => set({ activeScenario: id }),

      setDataSource: (source) => set({ dataSource: source }),

      reset: () => set(initialState)
    }),
    {
      name: 'markov-retention-storage',
      partialize: (state) => ({
        states: state.states,
        transitions: state.transitions,
        filters: state.filters,
        history: state.history,
        scenarios: state.scenarios,
        dataSource: state.dataSource
      })
    }
  )
);
