import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CashflowEntry,
  Scenario,
  AccountSettings,
  DailySummary,
  FilterState,
  ImportResult,
  ImportStrategy
} from '../types';
import {
  generateId,
  calculateDailySummaries,
  applyStressDetection,
  createSampleEntries
} from '../utils/balanceCalculator';

interface CashflowStore {
  scenarios: Scenario[];
  currentScenarioId: string | null;
  filters: FilterState;

  get currentScenario(): Scenario | null;

  importEntries: (
    entries: Omit<CashflowEntry, 'id' | 'createdAt' | 'updatedAt' | 'revisionHistory'>[],
    strategy: ImportStrategy
  ) => ImportResult;
  addEntry: (entry: Omit<CashflowEntry, 'id' | 'createdAt' | 'updatedAt' | 'revisionHistory'>) => void;
  updateEntry: (id: string, changes: Partial<CashflowEntry>, reason?: string) => void;
  deleteEntry: (id: string) => void;
  markAsDelayed: (id: string, delayNote?: string, newDate?: string) => void;

  saveScenario: (name: string, description?: string) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  updateCurrentScenarioName: (name: string) => void;

  updateSettings: (settings: Partial<AccountSettings>) => void;

  setFilters: (filters: Partial<FilterState>) => void;

  getDailySummary: (date: string) => DailySummary | null;
  getDateRangeSummary: (startDate: string, endDate: string) => DailySummary[];
  getBalanceForecast: (days: number) => { date: string; balance: number }[];

  resetToSampleData: () => void;
  clearAllData: () => void;
}

function createDefaultScenario(): Scenario {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '默认方案',
    description: '初始方案',
    entries: createSampleEntries(),
    settings: {
      initialBalance: 200000,
      safetyLine: 50000,
      currency: '¥'
    },
    createdAt: now,
    updatedAt: now,
    isCurrent: true
  };
}

export const useCashflowStore = create<CashflowStore>()(
  persist(
    (set, get) => ({
      scenarios: [createDefaultScenario()],
      currentScenarioId: null,
      filters: {
        types: [],
        priorities: [],
        showDelayedOnly: false
      },

      get currentScenario() {
        const { scenarios, currentScenarioId } = get();
        return scenarios.find(s => s.isCurrent || s.id === currentScenarioId) || scenarios[0] || null;
      },

      importEntries: (newEntries, strategy) => {
        const scenario = get().currentScenario;
        if (!scenario) {
          return { imported: 0, ignored: 0, overwritten: 0, errors: ['无活跃方案'] };
        }

        const now = new Date().toISOString();
        let imported = 0;
        let ignored = 0;
        let overwritten = 0;
        const errors: string[] = [];

        const finalEntries = [...scenario.entries];

        newEntries.forEach(entry => {
          const duplicateIndex = finalEntries.findIndex(
            e =>
              e.type === entry.type &&
              e.amount === entry.amount &&
              e.date === entry.date &&
              e.description === entry.description
          );

          if (duplicateIndex >= 0) {
            if (strategy === 'ignore') {
              ignored++;
              return;
            } else if (strategy === 'overwrite') {
              finalEntries[duplicateIndex] = {
                ...finalEntries[duplicateIndex],
                ...entry,
                updatedAt: now,
                revisionHistory: [
                  ...finalEntries[duplicateIndex].revisionHistory,
                  {
                    id: generateId(),
                    timestamp: now,
                    field: 'import',
                    oldValue: 'imported data',
                    newValue: entry,
                    reason: '导入覆盖'
                  }
                ]
              };
              overwritten++;
              return;
            }
          }

          finalEntries.push({
            ...entry,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
            revisionHistory: []
          });
          imported++;
        });

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? { ...s, entries: finalEntries, updatedAt: now }
              : s
          )
        }));

        return { imported, ignored, overwritten, errors };
      },

      addEntry: (entry) => {
        const scenario = get().currentScenario;
        if (!scenario) return;

        const now = new Date().toISOString();
        const newEntry: CashflowEntry = {
          ...entry,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          revisionHistory: []
        };

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? { ...s, entries: [...s.entries, newEntry], updatedAt: now }
              : s
          )
        }));
      },

      updateEntry: (id, changes, reason) => {
        const scenario = get().currentScenario;
        if (!scenario) return;

        const now = new Date().toISOString();
        const entry = scenario.entries.find(e => e.id === id);
        if (!entry) return;

        const revisions = Object.entries(changes).map(([field, newValue]) => ({
          id: generateId(),
          timestamp: now,
          field,
          oldValue: (entry as any)[field],
          newValue,
          reason
        }));

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? {
                  ...s,
                  entries: s.entries.map(e =>
                    e.id === id
                      ? {
                          ...e,
                          ...changes,
                          updatedAt: now,
                          revisionHistory: [...e.revisionHistory, ...revisions]
                        }
                      : e
                  ),
                  updatedAt: now
                }
              : s
          )
        }));
      },

      deleteEntry: (id) => {
        const scenario = get().currentScenario;
        if (!scenario) return;

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? {
                  ...s,
                  entries: s.entries.filter(e => e.id !== id),
                  updatedAt: new Date().toISOString()
                }
              : s
          )
        }));
      },

      markAsDelayed: (id, delayNote, newDate) => {
        const scenario = get().currentScenario;
        if (!scenario) return;

        const entry = scenario.entries.find(e => e.id === id);
        if (!entry) return;

        const now = new Date().toISOString();
        const changes: Partial<CashflowEntry> = {
          isDelayed: true,
          delayNote: delayNote || entry.delayNote,
          originalDate: entry.originalDate || entry.date
        };

        if (newDate) {
          changes.date = newDate;
        }

        const revisions = Object.entries(changes).map(([field, newValue]) => ({
          id: generateId(),
          timestamp: now,
          field,
          oldValue: (entry as any)[field],
          newValue,
          reason: '标记延期'
        }));

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? {
                  ...s,
                  entries: s.entries.map(e =>
                    e.id === id
                      ? {
                          ...e,
                          ...changes,
                          updatedAt: now,
                          revisionHistory: [...e.revisionHistory, ...revisions]
                        }
                      : e
                  ),
                  updatedAt: now
                }
              : s
          )
        }));
      },

      saveScenario: (name, description) => {
        const scenario = get().currentScenario;
        if (!scenario) return '';

        const now = new Date().toISOString();
        const newScenario: Scenario = {
          ...scenario,
          id: generateId(),
          name,
          description: description || '',
          entries: JSON.parse(JSON.stringify(scenario.entries)),
          settings: { ...scenario.settings },
          createdAt: now,
          updatedAt: now,
          isCurrent: false
        };

        set(state => ({
          scenarios: [...state.scenarios, newScenario]
        }));

        return newScenario.id;
      },

      loadScenario: (id) => {
        set(state => ({
          scenarios: state.scenarios.map(s => ({
            ...s,
            isCurrent: s.id === id
          })),
          currentScenarioId: id
        }));
      },

      deleteScenario: (id) => {
        const { scenarios } = get();
        if (scenarios.length <= 1) return;

        const scenario = scenarios.find(s => s.id === id);
        if (!scenario) return;

        set(state => {
          const newScenarios = state.scenarios.filter(s => s.id !== id);
          if (scenario.isCurrent && newScenarios.length > 0) {
            newScenarios[0].isCurrent = true;
          }
          return { scenarios: newScenarios };
        });
      },

      updateCurrentScenarioName: (name) => {
        const scenario = get().currentScenario;
        if (!scenario) return;

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? { ...s, name, updatedAt: new Date().toISOString() }
              : s
          )
        }));
      },

      updateSettings: (settings) => {
        const scenario = get().currentScenario;
        if (!scenario) return;

        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === scenario.id
              ? {
                  ...s,
                  settings: { ...s.settings, ...settings },
                  updatedAt: new Date().toISOString()
                }
              : s
          )
        }));
      },

      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters }
        }));
      },

      getDailySummary: (date) => {
        const scenario = get().currentScenario;
        if (!scenario) return null;

        const { filters } = get();
        let filteredEntries = scenario.entries;

        if (filters.types.length > 0) {
          filteredEntries = filteredEntries.filter(e => filters.types.includes(e.type));
        }
        if (filters.priorities.length > 0) {
          filteredEntries = filteredEntries.filter(e => filters.priorities.includes(e.priority));
        }
        if (filters.showDelayedOnly) {
          filteredEntries = filteredEntries.filter(e => e.isDelayed);
        }

        const summaries = calculateDailySummaries(
          filteredEntries,
          scenario.settings,
          date,
          1
        );

        return applyStressDetection(summaries, scenario.settings)[0];
      },

      getDateRangeSummary: (startDate, endDate) => {
        const scenario = get().currentScenario;
        if (!scenario) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const { filters } = get();
        let filteredEntries = scenario.entries;

        if (filters.types.length > 0) {
          filteredEntries = filteredEntries.filter(e => filters.types.includes(e.type));
        }
        if (filters.priorities.length > 0) {
          filteredEntries = filteredEntries.filter(e => filters.priorities.includes(e.priority));
        }
        if (filters.showDelayedOnly) {
          filteredEntries = filteredEntries.filter(e => e.isDelayed);
        }

        const summaries = calculateDailySummaries(
          filteredEntries,
          scenario.settings,
          startDate,
          days
        );

        return applyStressDetection(summaries, scenario.settings);
      },

      getBalanceForecast: (days) => {
        const scenario = get().currentScenario;
        if (!scenario) return [];

        const today = new Date().toISOString().split('T')[0];
        const summaries = get().getDateRangeSummary(today, new Date(Date.now() + days * 86400000).toISOString().split('T')[0]);
        return summaries.map(s => ({ date: s.date, balance: s.balance }));
      },

      resetToSampleData: () => {
        const newScenario = createDefaultScenario();
        set({
          scenarios: [newScenario],
          currentScenarioId: newScenario.id
        });
      },

      clearAllData: () => {
        const now = new Date().toISOString();
        const emptyScenario: Scenario = {
          id: generateId(),
          name: '空方案',
          description: '',
          entries: [],
          settings: {
            initialBalance: 0,
            safetyLine: 0,
            currency: '¥'
          },
          createdAt: now,
          updatedAt: now,
          isCurrent: true
        };
        set({
          scenarios: [emptyScenario],
          currentScenarioId: emptyScenario.id
        });
      }
    }),
    {
      name: 'cashflow-calendar-v1',
      partialize: (state) => ({
        scenarios: state.scenarios,
        currentScenarioId: state.currentScenarioId,
        filters: state.filters
      })
    }
  )
);