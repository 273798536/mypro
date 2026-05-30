import { create } from 'zustand';
import {
  Institution,
  RiskScore,
  Anomaly,
  Correction,
  FilterState,
  TimeFrame,
  InstitutionType,
  RiskLevel,
  InstitutionWithScore,
  getScoreLevel,
} from '../types';
import {
  generateMockInstitutions,
  generateMockRiskScores,
  generateTimeFrames,
  generateMockAnomalies,
  addIndustryTags,
} from '../data/mockData';
import { detectAllAnomalies } from '../utils/anomalyDetector';

interface RiskState {
  institutions: Institution[];
  riskScores: RiskScore[];
  anomalies: Anomaly[];
  corrections: Correction[];
  timeFrames: TimeFrame[];
  currentTimeIndex: number;
  selectedInstitutionId: string | null;
  filters: FilterState;
  isPlaying: boolean;
  dataBatch: 1 | 2;
  compareMode: boolean;
  institutionsOriginal: Institution[];
  riskScoresOriginal: RiskScore[];
  initData: () => void;
  setCurrentTimeIndex: (index: number) => void;
  setSelectedInstitution: (id: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  toggleFilterType: (type: InstitutionType) => void;
  toggleFilterRegion: (region: string) => void;
  toggleFilterIndustry: (industry: string) => void;
  toggleFilterRiskLevel: (level: RiskLevel) => void;
  setScoreRange: (range: [number, number]) => void;
  togglePlaying: () => void;
  loadSecondBatch: () => void;
  addCorrection: (institutionId: string, newScore: number, reason: string) => void;
  enterCompareMode: () => void;
  exitCompareMode: () => void;
  getFilteredInstitutions: () => InstitutionWithScore[];
  getInstitutionScore: (institutionId: string) => RiskScore | undefined;
}

const initialFilters: FilterState = {
  institutionTypes: [],
  regions: [],
  industries: [],
  riskLevels: [],
  scoreRange: [0, 100],
};

export const useRiskStore = create<RiskState>((set, get) => ({
  institutions: [],
  riskScores: [],
  anomalies: [],
  corrections: [],
  timeFrames: [],
  currentTimeIndex: 0,
  selectedInstitutionId: null,
  filters: initialFilters,
  isPlaying: false,
  dataBatch: 1,
  compareMode: false,
  institutionsOriginal: [],
  riskScoresOriginal: [],

  initData: () => {
    const institutions = generateMockInstitutions();
    const timeFrames = generateTimeFrames();
    const riskScores = generateMockRiskScores(institutions, 1);
    const anomalies = generateMockAnomalies(institutions);

    set({
      institutions,
      riskScores,
      anomalies,
      timeFrames,
      institutionsOriginal: institutions,
      riskScoresOriginal: riskScores,
    });
  },

  setCurrentTimeIndex: (index: number) => {
    set({ currentTimeIndex: index });
  },

  setSelectedInstitution: (id: string | null) => {
    set({ selectedInstitutionId: id });
  },

  setFilters: (newFilters: Partial<FilterState>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  toggleFilterType: (type: InstitutionType) => {
    set((state) => {
      const types = state.filters.institutionTypes;
      const newTypes = types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type];
      return {
        filters: { ...state.filters, institutionTypes: newTypes },
      };
    });
  },

  toggleFilterRegion: (region: string) => {
    set((state) => {
      const regions = state.filters.regions;
      const newRegions = regions.includes(region)
        ? regions.filter((r) => r !== region)
        : [...regions, region];
      return {
        filters: { ...state.filters, regions: newRegions },
      };
    });
  },

  toggleFilterIndustry: (industry: string) => {
    set((state) => {
      const industries = state.filters.industries;
      const newIndustries = industries.includes(industry)
        ? industries.filter((i) => i !== industry)
        : [...industries, industry];
      return {
        filters: { ...state.filters, industries: newIndustries },
      };
    });
  },

  toggleFilterRiskLevel: (level: RiskLevel) => {
    set((state) => {
      const levels = state.filters.riskLevels;
      const newLevels = levels.includes(level)
        ? levels.filter((l) => l !== level)
        : [...levels, level];
      return {
        filters: { ...state.filters, riskLevels: newLevels },
      };
    });
  },

  setScoreRange: (range: [number, number]) => {
    set((state) => ({
      filters: { ...state.filters, scoreRange: range },
    }));
  },

  togglePlaying: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  loadSecondBatch: () => {
    const { institutions, timeFrames } = get();
    const institutionsWithIndustry = addIndustryTags(institutions);
    const newRiskScores = generateMockRiskScores(institutionsWithIndustry, 2);

    const detectedAnomalies = detectAllAnomalies(
      institutionsWithIndustry,
      newRiskScores,
      timeFrames[0].timestamp
    );

    set({
      institutions: institutionsWithIndustry,
      riskScores: newRiskScores,
      anomalies: detectedAnomalies,
      dataBatch: 2,
    });
  },

  addCorrection: (institutionId: string, newScore: number, reason: string) => {
    set((state) => {
      const oldScore = state.riskScores.find(
        (s) => s.institutionId === institutionId && s.timestamp === state.timeFrames[state.currentTimeIndex].timestamp
      );

      if (!oldScore) return state;

      const correction: Correction = {
        id: Math.random().toString(36).substring(2, 11),
        institutionId,
        oldScore: oldScore.score,
        newScore,
        reason,
        createdAt: new Date().toISOString(),
      };

      const newRiskScores = state.riskScores.map((s) => {
        if (s.institutionId === institutionId && s.timestamp === state.timeFrames[state.currentTimeIndex].timestamp) {
          return { ...s, score: newScore, level: getScoreLevel(newScore) };
        }
        return s;
      });

      return {
        corrections: [...state.corrections, correction],
        riskScores: newRiskScores,
      };
    });
  },

  enterCompareMode: () => {
    set((state) => ({
      compareMode: true,
      institutionsOriginal: [...state.institutions],
      riskScoresOriginal: [...state.riskScores],
    }));
  },

  exitCompareMode: () => {
    set({ compareMode: false });
  },

  getFilteredInstitutions: () => {
    const { institutions, riskScores, anomalies, filters, currentTimeIndex, timeFrames } = get();
    const currentTimestamp = timeFrames[currentTimeIndex]?.timestamp;

    return institutions
      .map((inst) => {
        const score = riskScores.find(
          (s) => s.institutionId === inst.id && s.timestamp === currentTimestamp
        );
        const instAnomalies = anomalies.filter((a) => a.institutionId === inst.id);

        return {
          ...inst,
          score: score?.score ?? 0,
          level: score?.level ?? 'low',
          anomalies: instAnomalies,
        };
      })
      .filter((inst) => {
        if (filters.institutionTypes.length > 0 && !filters.institutionTypes.includes(inst.type)) {
          return false;
        }
        if (filters.regions.length > 0 && !filters.regions.includes(inst.region)) {
          return false;
        }
        if (
          filters.industries.length > 0 &&
          (!inst.industry || !filters.industries.includes(inst.industry))
        ) {
          return false;
        }
        if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(inst.level)) {
          return false;
        }
        if (inst.score < filters.scoreRange[0] || inst.score > filters.scoreRange[1]) {
          return false;
        }
        return true;
      });
  },

  getInstitutionScore: (institutionId: string) => {
    const { riskScores, timeFrames, currentTimeIndex } = get();
    const currentTimestamp = timeFrames[currentTimeIndex]?.timestamp;
    return riskScores.find(
      (s) => s.institutionId === institutionId && s.timestamp === currentTimestamp
    );
  },
}));
