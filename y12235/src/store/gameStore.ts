import { create } from 'zustand';
import type { CurveSegment, BondCard, EventCard, RunRecord, ValidationResult } from '@/types';
import { scenarios } from '@/data/scenarios';
import {
  createRunRecord,
  applyEventsToCurve,
  validateRun,
  computePortfolioDuration,
  computePortfolioEffDuration,
  computeDurationGap,
  computeVaR,
  detectCurveInversion,
  getEventSpreadWidening,
  lowRatingRatio,
} from '@/utils/settlement';

interface GameState {
  currentScenarioId: string | null;
  curve: CurveSegment[];
  portfolio: BondCard[];
  availableBonds: BondCard[];
  activeEventIds: string[];
  activeEvents: EventCard[];
  runRecords: RunRecord[];
  currentRunId: string | null;
  isSettled: boolean;

  getScenario: () => typeof scenarios[number] | undefined;
  getEffectiveCurve: () => CurveSegment[];
  getRiskMetrics: () => {
    portfolioDuration: number;
    portfolioEffDuration: number;
    durationGap: number;
    varValue: number;
    isInverted: boolean;
    lowRatingPct: number;
    spreadWidening: number;
  };

  loadScenario: (scenarioId: string) => void;
  updateCurvePoint: (segmentId: string, pointIndex: number, newY: number) => void;
  addBondToPortfolio: (bondId: string) => void;
  removeBondFromPortfolio: (bondId: string) => void;
  toggleEvent: (eventId: string) => void;
  submitSettlement: () => RunRecord;
  rerunSettlement: (bondOverrides?: Partial<BondCard>[]) => RunRecord;
  resetBattle: () => void;

  getRunRecord: (runId: string) => RunRecord | undefined;
  getRecordsForScenario: (scenarioId: string) => RunRecord[];
  getAllRecords: () => RunRecord[];

  _loadFromStorage: () => void;
  _saveToStorage: () => void;
}

const STORAGE_KEY = 'rate-curve-puzzle-records';

export const useGameStore = create<GameState>((set, get) => ({
  currentScenarioId: null,
  curve: [],
  portfolio: [],
  availableBonds: [],
  activeEventIds: [],
  activeEvents: [],
  runRecords: [],
  currentRunId: null,
  isSettled: false,

  getScenario: () => {
    const state = get();
    if (!state.currentScenarioId) return undefined;
    return scenarios.find(s => s.id === state.currentScenarioId);
  },

  getEffectiveCurve: () => {
    const state = get();
    return applyEventsToCurve(state.curve, state.activeEvents);
  },

  getRiskMetrics: () => {
    const state = get();
    const effectiveCurve = applyEventsToCurve(state.curve, state.activeEvents);
    const scenario = scenarios.find(s => s.id === state.currentScenarioId);
    const targetDuration = scenario?.targetDuration ?? 3.0;
    const totalPar = state.portfolio.reduce((s, b) => s + b.parValue, 0);
    const effDuration = computePortfolioEffDuration(state.portfolio);
    const durationGap = computeDurationGap(effDuration, targetDuration);
    return {
      portfolioDuration: computePortfolioDuration(state.portfolio),
      portfolioEffDuration: effDuration,
      durationGap,
      varValue: computeVaR(totalPar, durationGap, 0.01),
      isInverted: detectCurveInversion(effectiveCurve),
      lowRatingPct: lowRatingRatio(state.portfolio) * 100,
      spreadWidening: getEventSpreadWidening(state.activeEvents),
    };
  },

  loadScenario: (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    set({
      currentScenarioId: scenarioId,
      curve: JSON.parse(JSON.stringify(scenario.baseCurve)),
      portfolio: [],
      availableBonds: JSON.parse(JSON.stringify(scenario.bondCards)),
      activeEventIds: [],
      activeEvents: [],
      currentRunId: null,
      isSettled: false,
    });
  },

  updateCurvePoint: (segmentId: string, pointIndex: number, newY: number) => {
    set(state => ({
      curve: state.curve.map(seg =>
        seg.id === segmentId
          ? {
              ...seg,
              points: seg.points.map((pt, i) =>
                i === pointIndex && !pt.locked ? { ...pt, y: newY } : pt
              ),
            }
          : seg
      ),
    }));
  },

  addBondToPortfolio: (bondId: string) => {
    set(state => {
      const bond = state.availableBonds.find(b => b.id === bondId);
      if (!bond) return state;
      return {
        portfolio: [...state.portfolio, { ...bond }],
      };
    });
  },

  removeBondFromPortfolio: (bondId: string) => {
    set(state => ({
      portfolio: state.portfolio.filter((_, i) => {
        const match = state.portfolio.findIndex(b => b.id === bondId);
        return i !== match;
      }),
    }));
  },

  toggleEvent: (eventId: string) => {
    set(state => {
      const scenario = scenarios.find(s => s.id === state.currentScenarioId);
      if (!scenario) return state;

      let newIds: string[];
      if (state.activeEventIds.includes(eventId)) {
        newIds = state.activeEventIds.filter(id => id !== eventId);
      } else {
        newIds = [...state.activeEventIds, eventId];
      }
      const newEvents = scenario.eventCards.filter(e => newIds.includes(e.id));
      return { activeEventIds: newIds, activeEvents: newEvents };
    });
  },

  submitSettlement: () => {
    const state = get();
    const scenario = scenarios.find(s => s.id === state.currentScenarioId);
    if (!scenario) throw new Error('No scenario loaded');

    const effectiveCurve = applyEventsToCurve(state.curve, state.activeEvents);
    const record = createRunRecord(
      state.currentScenarioId!,
      effectiveCurve,
      state.portfolio,
      state.activeEventIds,
      state.activeEvents,
      scenario.targetDuration,
      null
    );

    set(state => ({
      runRecords: [...state.runRecords, record],
      currentRunId: record.id,
      isSettled: true,
    }));

    get()._saveToStorage();
    return record;
  },

  rerunSettlement: (bondOverrides?: Partial<BondCard>[]) => {
    const state = get();
    const scenario = scenarios.find(s => s.id === state.currentScenarioId);
    if (!scenario) throw new Error('No scenario loaded');

    let portfolio = JSON.parse(JSON.stringify(state.portfolio)) as BondCard[];
    if (bondOverrides) {
      portfolio = portfolio.map(bond => {
        const override = bondOverrides.find(o => o.id === bond.id);
        return override ? { ...bond, ...override } : bond;
      });
    }

    const effectiveCurve = applyEventsToCurve(state.curve, state.activeEvents);
    const record = createRunRecord(
      state.currentScenarioId!,
      effectiveCurve,
      portfolio,
      state.activeEventIds,
      state.activeEvents,
      scenario.targetDuration,
      state.currentRunId
    );

    set(state => ({
      runRecords: [...state.runRecords, record],
      currentRunId: record.id,
    }));

    get()._saveToStorage();
    return record;
  },

  resetBattle: () => {
    const state = get();
    if (state.currentScenarioId) {
      get().loadScenario(state.currentScenarioId);
    }
  },

  getRunRecord: (runId: string) => {
    return get().runRecords.find(r => r.id === runId);
  },

  getRecordsForScenario: (scenarioId: string) => {
    return get().runRecords.filter(r => r.scenarioId === scenarioId);
  },

  getAllRecords: () => {
    return get().runRecords;
  },

  _loadFromStorage: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const records = JSON.parse(data) as RunRecord[];
        set({ runRecords: records });
      }
    } catch {
      // ignore
    }
  },

  _saveToStorage: () => {
    try {
      const records = get().runRecords;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // ignore
    }
  },
}));
