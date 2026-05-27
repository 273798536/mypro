import { create } from 'zustand';
import { Risk, Expense, RevenueForecast, Milestone, BurnDataPoint } from '../types';
import { detectRisks } from '../utils/riskDetector';

interface RiskState {
  risks: Risk[];
  selectedRiskId: string | null;
  detectedAt: string | null;
  detectRisks: (
    expenses: Expense[],
    revenues: RevenueForecast[],
    milestones: Milestone[],
    burnDataPoints: BurnDataPoint[]
  ) => void;
  resolveRisk: (riskId: string) => void;
  selectRisk: (riskId: string | null) => void;
  getRisksByType: (type: Risk['type']) => Risk[];
  getUnresolvedRisks: () => Risk[];
}

export const useRiskStore = create<RiskState>((set, get) => ({
  risks: [],
  selectedRiskId: null,
  detectedAt: null,

  detectRisks: (expenses, revenues, milestones, burnDataPoints) => {
    const detectedRisks = detectRisks(expenses, revenues, milestones, burnDataPoints);
    set({
      risks: detectedRisks,
      detectedAt: new Date().toISOString()
    });
  },

  resolveRisk: (riskId) => {
    set((state) => ({
      risks: state.risks.map((r) =>
        r.id === riskId ? { ...r, resolved: true } : r
      )
    }));
  },

  selectRisk: (riskId) => {
    set({ selectedRiskId: riskId });
  },

  getRisksByType: (type) => {
    return get().risks.filter((r) => r.type === type);
  },

  getUnresolvedRisks: () => {
    return get().risks.filter((r) => !r.resolved);
  }
}));
