import { create } from 'zustand';
import type { Declaration, RiskLevel, ReviewNote, RiskChangeRecord, ViewPreset } from '@/types';
import { getDeclarations } from '@/utils/mockData';

interface DeclarationStore {
  declarations: Declaration[];
  selectedId: string | null;
  selectDeclaration: (id: string) => void;
  updateRiskLevel: (id: string, newLevel: RiskLevel, reason: string, affectedFields: string[]) => void;
  addReviewNote: (id: string, note: Omit<ReviewNote, 'id' | 'timestamp'>) => void;
  fillWeatherGap: (declId: string, gapId: string) => void;
}

export const useDeclarationStore = create<DeclarationStore>((set) => ({
  declarations: getDeclarations(),
  selectedId: null,

  selectDeclaration: (id) => set({ selectedId: id }),

  updateRiskLevel: (id, newLevel, reason, affectedFields) =>
    set((state) => ({
      declarations: state.declarations.map((d) => {
        if (d.id !== id) return d;
        const changeRecord: RiskChangeRecord = {
          id: `rch-${Date.now()}`,
          timestamp: new Date().toLocaleString('zh-CN'),
          beforeLevel: d.currentRiskLevel,
          afterLevel: newLevel,
          changedBy: '张场长',
          reason,
          affectedFields,
        };
        const autoNote: ReviewNote = {
          id: `rn-${Date.now()}`,
          timestamp: new Date().toLocaleString('zh-CN'),
          author: '系统',
          content: `风险等级变更：${d.currentRiskLevel} → ${newLevel}。原因：${reason}`,
          type: 'auto-risk-change',
          snapshot: {
            level: newLevel,
            salinityCompliant: newLevel !== 'high',
            exchangeRateCompliant: newLevel === 'low',
            weatherCondition: '部分数据缺失',
            tideMatch: true,
          },
        };
        return {
          ...d,
          currentRiskLevel: newLevel,
          riskChangeHistory: [...d.riskChangeHistory, changeRecord],
          reviewNotes: [...d.reviewNotes, autoNote],
        };
      }),
    })),

  addReviewNote: (id, note) =>
    set((state) => ({
      declarations: state.declarations.map((d) => {
        if (d.id !== id) return d;
        return {
          ...d,
          reviewNotes: [
            ...d.reviewNotes,
            { ...note, id: `rn-${Date.now()}`, timestamp: new Date().toLocaleString('zh-CN') },
          ],
        };
      }),
    })),

  fillWeatherGap: (declId, gapId) =>
    set((state) => ({
      declarations: state.declarations.map((d) => {
        if (d.id !== declId) return d;
        return {
          ...d,
          weatherGaps: d.weatherGaps.map((g) =>
            g.id === gapId ? { ...g, status: 'filled' as const } : g
          ),
        };
      }),
    })),
}));

interface ReviewViewStore {
  currentPreset: ViewPreset;
  setPreset: (preset: ViewPreset) => void;
  showLegend: boolean;
  toggleLegend: () => void;
}

export const useReviewViewStore = create<ReviewViewStore>((set) => ({
  currentPreset: 'overview',
  setPreset: (preset) => set({ currentPreset: preset }),
  showLegend: true,
  toggleLegend: () => set((s) => ({ showLegend: !s.showLegend })),
}));
