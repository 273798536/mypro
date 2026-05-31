import { create } from 'zustand';
import {
  GameState,
  SoundSource,
  PlacedSource,
  CityArea,
  GovernanceMeasure,
  SoundSourceRecord,
  MoodRecord,
  GovernanceRecord,
  ScoreItem,
  RiskItem,
  TimePeriod,
} from '../types';
import { soundSources, governanceMeasures } from '../data/soundSources';
import { cityAreas, initialPlacedSources } from '../data/cityAreas';
import { calculateAllAreasDecibels, getThreshold } from '../utils/decibel';
import { analyzeAllRisks } from '../utils/riskAnalysis';

interface GameStore extends GameState {
  placeSource: (sourceId: string, areaId: string) => void;
  removeSource: (placedSourceId: string) => void;
  applyGovernance: (measureId: string, areaId?: string) => void;
  nextTurn: () => void;
  togglePeriod: () => void;
  setCurrentPeriod: (period: TimePeriod) => void;
  resetGame: () => void;
  getAreaSources: (areaId: string) => PlacedSource[];
  getAvailableSourcesForArea: (areaId: string) => SoundSource[];
  getAreaDecibels: (areaId: string) => number;
  recalculateState: () => void;
}

function generateRecordId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createInitialState(): GameState {
  const initialMood: Record<string, number> = {};
  cityAreas.forEach((area) => {
    initialMood[area.id] = 80;
  });

  return {
    currentTurn: 1,
    maxTurns: 8,
    currentPeriod: 'day',
    areas: cityAreas,
    placedSources: [...initialPlacedSources],
    availableSourceCards: soundSources.slice(0, 5),
    residentMood: initialMood,
    score: 100,
    scoreBreakdown: [],
    risks: [],
    records: {
      soundSources: [],
      residentMood: [],
      governance: [],
    },
    isGameOver: false,
    gameResult: null,
    governanceMeasures: governanceMeasures,
    budget: 500,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  placeSource: (sourceId: string, areaId: string) => {
    const state = get();
    const source = soundSources.find((s) => s.id === sourceId);
    const area = state.areas.find((a) => a.id === areaId);
    if (!source || !area) return;

    const newPlacedSource: PlacedSource = {
      id: `placed-${Date.now()}`,
      sourceId,
      areaId,
      placedAt: state.currentTurn,
      placedByPlayer: true,
      isActive: true,
    };

    const newRecord: SoundSourceRecord = {
      id: generateRecordId(),
      timestamp: Date.now(),
      turn: state.currentTurn,
      action: 'place',
      sourceName: source.name,
      areaName: area.name,
      decibel: source.baseDecibel,
      period: state.currentPeriod,
      detail: `放置${source.icon}${source.name}到${area.name}，${source.baseDecibel}dB`,
    };

    const scoreChange = -5;
    const newScoreItem: ScoreItem = {
      turn: state.currentTurn,
      change: scoreChange,
      reason: `放置声源：${source.name}`,
      category: 'source',
    };

    set((prev) => ({
      placedSources: [...prev.placedSources, newPlacedSource],
      availableSourceCards: prev.availableSourceCards.filter((s) => s.id !== sourceId),
      records: {
        ...prev.records,
        soundSources: [newRecord, ...prev.records.soundSources],
      },
      score: prev.score + scoreChange,
      scoreBreakdown: [...prev.scoreBreakdown, newScoreItem],
    }));

    get().recalculateState();
  },

  removeSource: (placedSourceId: string) => {
    const state = get();
    const placedSource = state.placedSources.find((ps) => ps.id === placedSourceId);
    if (!placedSource) return;

    const source = soundSources.find((s) => s.id === placedSource.sourceId);
    const area = state.areas.find((a) => a.id === placedSource.areaId);
    if (!source || !area) return;

    const newRecord: SoundSourceRecord = {
      id: generateRecordId(),
      timestamp: Date.now(),
      turn: state.currentTurn,
      action: 'remove',
      sourceName: source.name,
      areaName: area.name,
      decibel: source.baseDecibel,
      period: state.currentPeriod,
      detail: `从${area.name}移除${source.icon}${source.name}`,
    };

    const scoreChange = 3;
    const newScoreItem: ScoreItem = {
      turn: state.currentTurn,
      change: scoreChange,
      reason: `移除声源：${source.name}`,
      category: 'source',
    };

    set((prev) => ({
      placedSources: prev.placedSources.filter((ps) => ps.id !== placedSourceId),
      records: {
        ...prev.records,
        soundSources: [newRecord, ...prev.records.soundSources],
      },
      score: prev.score + scoreChange,
      scoreBreakdown: [...prev.scoreBreakdown, newScoreItem],
    }));

    get().recalculateState();
  },

  applyGovernance: (measureId: string, areaId?: string) => {
    const state = get();
    const measure = state.governanceMeasures.find((m) => m.id === measureId);
    if (!measure || state.budget < measure.cost) return;

    const targetArea = areaId ? state.areas.find((a) => a.id === areaId) : null;

    const newRecord: GovernanceRecord = {
      id: generateRecordId(),
      timestamp: Date.now(),
      turn: state.currentTurn,
      measure: measure.name,
      targetArea: targetArea?.name,
      effect: measure.effect,
      cost: measure.cost,
    };

    const scoreChange = 5;
    const newScoreItem: ScoreItem = {
      turn: state.currentTurn,
      change: scoreChange,
      reason: `治理措施：${measure.name}`,
      category: 'governance',
    };

    set((prev) => {
      const moodUpdate: Record<string, number> = { ...prev.residentMood };
      if (measureId === 'education') {
        Object.keys(moodUpdate).forEach((id) => {
          moodUpdate[id] = Math.min(100, moodUpdate[id] + 10);
        });
      }

      return {
        budget: prev.budget - measure.cost,
        records: {
          ...prev.records,
          governance: [newRecord, ...prev.records.governance],
        },
        score: prev.score + scoreChange,
        scoreBreakdown: [...prev.scoreBreakdown, newScoreItem],
        residentMood: moodUpdate,
      };
    });

    get().recalculateState();
  },

  nextTurn: () => {
    const state = get();
    if (state.currentTurn >= state.maxTurns) {
      set((prev) => {
        const avgMood = Object.values(prev.residentMood).reduce((a, b) => a + b, 0) / Object.keys(prev.residentMood).length;
        const isWin = prev.score > 50 && avgMood > 50;
        return {
          isGameOver: true,
          gameResult: isWin ? 'win' : 'lose',
        };
      });
      return;
    }

    set((prev) => ({
      currentTurn: prev.currentTurn + 1,
      currentPeriod: prev.currentTurn % 2 === 0 ? 'day' : 'night',
      availableSourceCards: soundSources
        .filter((s) => !prev.placedSources.some((ps) => ps.sourceId === s.id))
        .slice(0, 5),
    }));

    get().recalculateState();
  },

  togglePeriod: () => {
    set((prev) => ({
      currentPeriod: prev.currentPeriod === 'day' ? 'night' : 'day',
    }));
    get().recalculateState();
  },

  setCurrentPeriod: (period: TimePeriod) => {
    set({ currentPeriod: period });
    get().recalculateState();
  },

  resetGame: () => {
    set(createInitialState());
  },

  getAreaSources: (areaId: string) => {
    return get().placedSources.filter((ps) => ps.areaId === areaId && ps.isActive);
  },

  getAvailableSourcesForArea: (areaId: string) => {
    const state = get();
    const area = state.areas.find((a) => a.id === areaId);
    if (!area) return [];
    return state.availableSourceCards.filter((s) => s.areaTypes.includes(area.type));
  },

  getAreaDecibels: (areaId: string) => {
    const state = get();
    const calculations = calculateAllAreasDecibels(
      state.areas,
      state.placedSources,
      soundSources,
      state.currentPeriod
    );
    return calculations[areaId]?.correctValue || 0;
  },

  recalculateState: () => {
    const state = get();
    const calculations = calculateAllAreasDecibels(
      state.areas,
      state.placedSources,
      soundSources,
      state.currentPeriod
    );

    const newRisks = analyzeAllRisks(
      state.areas,
      calculations,
      state.currentPeriod,
      state.currentTurn,
      soundSources
    );

    const moodUpdate: Record<string, number> = {};
    const moodRecords: MoodRecord[] = [];

    state.areas.forEach((area) => {
      const calc = calculations[area.id];
      const threshold = getThreshold(area, state.currentPeriod);
      const excess = calc.correctValue - threshold;

      const beforeMood = state.residentMood[area.id];
      let moodChange = 0;

      if (excess > 0) {
        moodChange = -Math.round(excess * area.sensitivity * 0.5);
      } else if (excess < -5) {
        moodChange = 2;
      }

      const afterMood = Math.max(0, Math.min(100, beforeMood + moodChange));

      if (moodChange !== 0) {
        moodUpdate[area.id] = afterMood;

        const relatedSourceNames = calc.sources
          .map((id) => soundSources.find((s) => s.id === id)?.name)
          .filter(Boolean) as string[];

        moodRecords.push({
          id: generateRecordId(),
          timestamp: Date.now(),
          turn: state.currentTurn,
          areaName: area.name,
          beforeMood,
          afterMood,
          changeReason: excess > 0
            ? `噪声超标${excess.toFixed(1)}dB，居民不满`
            : `声环境良好，居民满意度提升`,
          relatedSources: relatedSourceNames,
        });
      }
    });

    const penaltyScore = moodRecords.reduce((acc, record) => {
      if (record.afterMood < record.beforeMood) {
        return acc - Math.round((record.beforeMood - record.afterMood) * 0.5);
      }
      return acc;
    }, 0);

    set((prev) => ({
      risks: newRisks,
      residentMood: { ...prev.residentMood, ...moodUpdate },
      records: {
        ...prev.records,
        residentMood: [...moodRecords, ...prev.records.residentMood],
      },
      score: penaltyScore !== 0 ? prev.score + penaltyScore : prev.score,
      scoreBreakdown: penaltyScore !== 0
        ? [...prev.scoreBreakdown, {
            turn: prev.currentTurn,
            change: penaltyScore,
            reason: `居民情绪变化影响评分`,
            category: 'penalty' as const,
          }]
        : prev.scoreBreakdown,
    }));
  },
}));
