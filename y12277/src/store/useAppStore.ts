import { create } from 'zustand';
import {
  AppState,
  InstitutionType,
  RiskLevel,
  IndicatorDimension,
  ExportRecord
} from '../types';
import {
  mockInstitutions,
  mockIndicators,
  mockRiskScores,
  mockRiskReports,
  mockRegionCoords,
  mockAnomalies,
  getInitialMonth,
  getAllMonths
} from '../data/mockData';

export const useAppStore = create<AppState>((set, get) => ({
  selectedMonth: getInitialMonth(),
  selectedInstitutionId: null,
  institutionTypes: ['bank', 'securities', 'insurance', 'trust'],
  riskLevels: ['low', 'medium', 'high'],
  indicatorDimension: 'capital',
  isPlaying: false,

  institutions: mockInstitutions,
  indicators: mockIndicators,
  riskScores: mockRiskScores,
  riskReports: mockRiskReports,
  regionCoords: mockRegionCoords,
  anomalies: mockAnomalies,

  setSelectedMonth: (month: string) => set({ selectedMonth: month }),
  setSelectedInstitutionId: (id: string | null) => set({ selectedInstitutionId: id }),
  toggleInstitutionType: (type: InstitutionType) => set((state) => ({
    institutionTypes: state.institutionTypes.includes(type)
      ? state.institutionTypes.filter(t => t !== type)
      : [...state.institutionTypes, type]
  })),
  toggleRiskLevel: (level: RiskLevel) => set((state) => ({
    riskLevels: state.riskLevels.includes(level)
      ? state.riskLevels.filter(l => l !== level)
      : [...state.riskLevels, level]
  })),
  setIndicatorDimension: (dimension: IndicatorDimension) => set({ indicatorDimension: dimension }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  addExportRecord: (institutionId: string, record: ExportRecord) => set((state) => ({
    riskReports: state.riskReports.map(report =>
      report.institutionId === institutionId
        ? { ...report, exportRecords: [...report.exportRecords, record] }
        : report
    )
  })),
  markAnomalyResolved: (anomalyId: string) => set((state) => ({
    anomalies: state.anomalies.map(anom =>
      anom.id === anomalyId ? { ...anom, resolved: true } : anom
    )
  })),

  getFilteredInstitutions: () => {
    const state = get();
    let filtered = state.institutions.filter(inst =>
      state.institutionTypes.includes(inst.type)
    );

    if (state.riskLevels.length < 3) {
      filtered = filtered.filter(inst => {
        const score = state.getInstitutionRiskScore(inst.id, state.selectedMonth);
        return score ? state.riskLevels.includes(score.level) : true;
      });
    }

    return filtered;
  },

  getInstitutionRiskScore: (institutionId: string, month?: string) => {
    const state = get();
    const targetMonth = month || state.selectedMonth;
    return state.riskScores.find(
      s => s.institutionId === institutionId && s.month === targetMonth
    );
  },

  getInstitutionIndicators: (institutionId: string, month?: string) => {
    const state = get();
    const targetMonth = month || state.selectedMonth;
    return state.indicators.filter(
      ind => ind.institutionId === institutionId && 
             ind.month === targetMonth && 
             ind.dimension === state.indicatorDimension
    );
  },

  getInstitutionReports: (institutionId: string) => {
    const state = get();
    return state.riskReports.filter(r => r.institutionId === institutionId);
  },

  getInstitutionRegionCoord: (institutionId: string) => {
    const state = get();
    return state.regionCoords.find(c => c.institutionId === institutionId);
  },

  getInstitutionAnomalies: (institutionId: string) => {
    const state = get();
    return state.anomalies.filter(a => a.institutionId === institutionId);
  },

  getCurrentMonthAnomalies: () => {
    const state = get();
    return state.anomalies.filter(a => a.month === state.selectedMonth && !a.resolved);
  },

  getAvailableMonths: () => getAllMonths()
}));
