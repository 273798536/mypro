import { create } from 'zustand';
import type {
  OptionCard,
  VolatilityEvent,
  GameLevel,
  VersionDiff,
  SettlementResult,
  ComparisonResult,
} from '../types';
import {
  compareOptionCards,
  compareVolatilityEvents,
  resolveMergeConflict,
} from '../engine/diffEngine';
import { compareGameResults } from '../engine/settlementEngine';
import {
  loadAllSettlementResults,
  loadSettlementResult,
  saveSettlementResult,
  exportSettlementReport as exportReport,
} from '../engine/replayEngine';
import { mockOptionCards, mockVolatilityEvents, mockLevels } from '../data/mockData';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

interface DataStore {
  optionCards: OptionCard[];
  volatilityEvents: VolatilityEvent[];
  levels: GameLevel[];
  settlementResults: SettlementResult[];
  currentComparison: ComparisonResult | null;
  mergeConflicts: {
    type: 'OPTION_CARD' | 'VOLATILITY_EVENT';
    id: string;
    conflicts: VersionDiff<any>[];
    baseData: any;
    newData: any;
  } | null;

  actions: {
    loadAllData: () => void;
    saveOptionCard: (card: Partial<OptionCard>, existingId?: string) => {
      saved: OptionCard;
      conflicts: VersionDiff<OptionCard>[];
      requiresManualReview: boolean;
    };
    saveVolatilityEvent: (
      event: Partial<VolatilityEvent>,
      existingId?: string
    ) => {
      saved: VolatilityEvent;
      conflicts: VersionDiff<VolatilityEvent>[];
      requiresManualReview: boolean;
    };
    compareAndMerge: (
      type: 'OPTION_CARD' | 'VOLATILITY_EVENT',
      oldId: string,
      newData: any
    ) => { merged: any; conflicts: VersionDiff<any>[]; requiresManualReview: boolean };
    resolveConflicts: (resolutions: Record<string, 'OLD' | 'NEW'>) => void;
    deleteOptionCard: (id: string) => void;
    deleteVolatilityEvent: (id: string) => void;
    loadSettlementResults: () => void;
    getSettlementResult: (id: string) => SettlementResult | null;
    compareResults: (oldId: string, newId: string) => ComparisonResult;
    clearComparison: () => void;
    recalculateWithModifiedEvents: (
      originalResultId: string,
      modifiedEvents: VolatilityEvent[]
    ) => SettlementResult;
    exportSettlementReport: (id: string) => string;
    getOptionCardById: (id: string) => OptionCard | undefined;
    getVolatilityEventById: (id: string) => VolatilityEvent | undefined;
    getLevelById: (id: string) => GameLevel | undefined;
  };
}

export const useDataStore = create<DataStore>((set, get) => ({
  optionCards: mockOptionCards,
  volatilityEvents: mockVolatilityEvents,
  levels: mockLevels,
  settlementResults: [],
  currentComparison: null,
  mergeConflicts: null,

  actions: {
    loadAllData: () => {
      const results = loadAllSettlementResults();
      set({ settlementResults: results });
    },

    saveOptionCard: (card: Partial<OptionCard>, existingId?: string) => {
      const { optionCards } = get();
      let saved: OptionCard;
      let conflicts: VersionDiff<OptionCard>[] = [];
      let requiresManualReview = false;

      if (existingId) {
        const existingCard = optionCards.find((c) => c.id === existingId);
        if (existingCard) {
          const updatedCard: OptionCard = {
            ...existingCard,
            ...card,
            version: `v${parseFloat(existingCard.version.slice(1)) + 0.1}`,
            updatedAt: new Date(),
            updatedBy: card.updatedBy || existingCard.updatedBy,
          } as OptionCard;

          conflicts = compareOptionCards(existingCard, updatedCard);

          if (conflicts.length > 0) {
            requiresManualReview = true;
            set({
              mergeConflicts: {
                type: 'OPTION_CARD',
                id: existingId,
                conflicts,
                baseData: existingCard,
                newData: updatedCard,
              },
            });
          }

          saved = updatedCard;
          set({
            optionCards: optionCards.map((c) => (c.id === existingId ? updatedCard : c)),
          });
        } else {
          saved = {
            id: existingId,
            name: card.name || '新期权',
            type: card.type || 'CALL',
            strikePrice: card.strikePrice || 100,
            daysToExpiry: card.daysToExpiry || 30,
            marginRequirement: card.marginRequirement || 15,
            delta: card.delta || 0.5,
            gamma: card.gamma || 0.03,
            theta: card.theta || -0.05,
            vega: card.vega || 0.1,
            cost: card.cost || 10,
            defensePower: card.defensePower || 5,
            version: 'v1.0',
            updatedAt: new Date(),
            updatedBy: card.updatedBy || '投教老师',
          };
          set({ optionCards: [...optionCards, saved] });
        }
      } else {
        saved = {
          id: generateId(),
          name: card.name || '新期权',
          type: card.type || 'CALL',
          strikePrice: card.strikePrice || 100,
          daysToExpiry: card.daysToExpiry || 30,
          marginRequirement: card.marginRequirement || 15,
          delta: card.delta || 0.5,
          gamma: card.gamma || 0.03,
          theta: card.theta || -0.05,
          vega: card.vega || 0.1,
          cost: card.cost || 10,
          defensePower: card.defensePower || 5,
          version: 'v1.0',
          updatedAt: new Date(),
          updatedBy: card.updatedBy || '投教老师',
        };
        set({ optionCards: [...optionCards, saved] });
      }

      return { saved, conflicts, requiresManualReview };
    },

    saveVolatilityEvent: (event: Partial<VolatilityEvent>, existingId?: string) => {
      const { volatilityEvents } = get();
      let saved: VolatilityEvent;
      let conflicts: VersionDiff<VolatilityEvent>[] = [];
      let requiresManualReview = false;

      if (existingId) {
        const existingEvent = volatilityEvents.find((e) => e.id === existingId);
        if (existingEvent) {
          const updatedEvent: VolatilityEvent = {
            ...existingEvent,
            ...event,
            version: `v${parseFloat(existingEvent.version.slice(1)) + 0.1}`,
            updatedAt: new Date(),
            updatedBy: event.updatedBy || existingEvent.updatedBy,
          } as VolatilityEvent;

          conflicts = compareVolatilityEvents(existingEvent, updatedEvent);

          if (conflicts.length > 0) {
            requiresManualReview = true;
            set({
              mergeConflicts: {
                type: 'VOLATILITY_EVENT',
                id: existingId,
                conflicts,
                baseData: existingEvent,
                newData: updatedEvent,
              },
            });
          }

          saved = updatedEvent;
          set({
            volatilityEvents: volatilityEvents.map((e) =>
              e.id === existingId ? updatedEvent : e
            ),
          });
        } else {
          saved = {
            id: existingId,
            name: event.name || '新波动事件',
            description: event.description || '',
            triggerRound: event.triggerRound || 1,
            volatilityJump: event.volatilityJump || 0.1,
            impactScope: event.impactScope || 'ALL',
            isContinuous: event.isContinuous || false,
            duration: event.duration || 1,
            version: 'v1.0',
            updatedAt: new Date(),
            updatedBy: event.updatedBy || '波动管理员',
          };
          set({ volatilityEvents: [...volatilityEvents, saved] });
        }
      } else {
        saved = {
          id: generateId(),
          name: event.name || '新波动事件',
          description: event.description || '',
          triggerRound: event.triggerRound || 1,
          volatilityJump: event.volatilityJump || 0.1,
          impactScope: event.impactScope || 'ALL',
          isContinuous: event.isContinuous || false,
          duration: event.duration || 1,
          version: 'v1.0',
          updatedAt: new Date(),
          updatedBy: event.updatedBy || '波动管理员',
        };
        set({ volatilityEvents: [...volatilityEvents, saved] });
      }

      return { saved, conflicts, requiresManualReview };
    },

    compareAndMerge: (
      type: 'OPTION_CARD' | 'VOLATILITY_EVENT',
      oldId: string,
      newData: any
    ) => {
      const { optionCards, volatilityEvents } = get();

      const base =
        type === 'OPTION_CARD'
          ? optionCards.find((c) => c.id === oldId)
          : volatilityEvents.find((e) => e.id === oldId);

      if (!base) {
        return { merged: newData, conflicts: [], requiresManualReview: false };
      }

      const result = resolveMergeConflict(base as any, base as any, newData);
      return { merged: result.autoMerged, conflicts: result.conflicts, requiresManualReview: result.requiresManualReview };
    },

    resolveConflicts: (resolutions: Record<string, 'OLD' | 'NEW'>) => {
      const { mergeConflicts, optionCards, volatilityEvents } = get();
      if (!mergeConflicts) return;

      const resolved = { ...mergeConflicts.baseData };
      for (const conflict of mergeConflicts.conflicts) {
        const resolution = resolutions[String(conflict.field)] || 'NEW';
        if (resolution === 'NEW') {
          resolved[conflict.field] = conflict.newValue;
        } else {
          resolved[conflict.field] = conflict.oldValue;
        }
      }

      if (mergeConflicts.type === 'OPTION_CARD') {
        set({
          optionCards: optionCards.map((c) =>
            c.id === mergeConflicts.id ? resolved : c
          ),
          mergeConflicts: null,
        });
      } else {
        set({
          volatilityEvents: volatilityEvents.map((e) =>
            e.id === mergeConflicts.id ? resolved : e
          ),
          mergeConflicts: null,
        });
      }
    },

    deleteOptionCard: (id: string) => {
      set({
        optionCards: get().optionCards.filter((c) => c.id !== id),
      });
    },

    deleteVolatilityEvent: (id: string) => {
      set({
        volatilityEvents: get().volatilityEvents.filter((e) => e.id !== id),
      });
    },

    loadSettlementResults: () => {
      const results = loadAllSettlementResults();
      set({ settlementResults: results });
    },

    getSettlementResult: (id: string) => {
      return loadSettlementResult(id);
    },

    compareResults: (oldId: string, newId: string) => {
      const oldResult = loadSettlementResult(oldId);
      const newResult = loadSettlementResult(newId);

      if (!oldResult || !newResult) {
        throw new Error('无法找到结算结果');
      }

      const comparison = compareGameResults(oldResult, newResult);
      set({ currentComparison: comparison });
      return comparison;
    },

    clearComparison: () => {
      set({ currentComparison: null });
    },

    recalculateWithModifiedEvents: (
      originalResultId: string,
      modifiedEvents: VolatilityEvent[]
    ) => {
      const originalResult = loadSettlementResult(originalResultId);
      if (!originalResult) {
        throw new Error('无法找到原始结算结果');
      }

      const newResult: SettlementResult = {
        ...originalResult,
        id: generateId(),
        volatilityEventsUsed: modifiedEvents,
        createdAt: new Date(),
      };

      saveSettlementResult(newResult);

      const comparison = compareGameResults(originalResult, newResult);
      set({ currentComparison: comparison, settlementResults: [...get().settlementResults, newResult] });

      return newResult;
    },

    exportSettlementReport: (id: string) => {
      const result = loadSettlementResult(id);
      if (!result) {
        throw new Error('无法找到结算结果');
      }
      return exportReport(result);
    },

    getOptionCardById: (id: string) => {
      return get().optionCards.find((c) => c.id === id);
    },

    getVolatilityEventById: (id: string) => {
      return get().volatilityEvents.find((e) => e.id === id);
    },

    getLevelById: (id: string) => {
      return get().levels.find((l) => l.id === id);
    },
  },
}));
