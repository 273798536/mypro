import { create } from 'zustand';
import type { RiskRemark, AnomalyConclusion } from '@/types';
import { initialAnomalies } from '@/data/anomalies';

interface RiskState {
  originalRemark: RiskRemark;
  currentRemark: RiskRemark;
  editingRemark: string;
  showCompare: boolean;
  originalAnomalies: AnomalyConclusion[];
  modifiedAnomalies: AnomalyConclusion[];

  setEditingRemark: (v: string) => void;
  applyRemarkEdit: () => void;
  toggleCompare: () => void;
  resetToOriginal: () => void;
  getImpactedIds: () => string[];
}

const baseRemark: RiskRemark = {
  id: 'remark-001',
  content:
    '本次检测发现闸室水位不平衡及阀门开度异常，主要影响过闸效率，暂不影响结构安全。建议运维安排在下个停航窗口期检查阀门B执行机构。',
  modifiedAt: Date.now() - 7200000,
  modifier: '张工（初稿）',
  impactedConclusions: ['anom-001', 'anom-003'],
};

const modifiedAnomalies: AnomalyConclusion[] = initialAnomalies.map((a) => {
  if (a.id === 'anom-001') {
    return {
      ...a,
      severity: 'warning' as const,
      title: '闸室水位偏差（降级）',
      description: '水位差0.6m，结合历史数据判断为累积性偏差，非突发性故障',
    };
  }
  if (a.id === 'anom-004') {
    return {
      ...a,
      severity: 'info' as const,
      title: '充水速率略低',
      description: '偏差16.3%，在通航淡季可接受，旺季前整改即可',
    };
  }
  return a;
});

export const useRiskStore = create<RiskState>((set, get) => ({
  originalRemark: baseRemark,
  currentRemark: baseRemark,
  editingRemark:
    '本次检测发现闸室水位不平衡及阀门开度异常，结合历史趋势判断属于累积性偏差而非突发故障。主要影响过闸效率，暂不影响结构安全。建议运维在下一停航窗口期安排阀门B执行机构检查，并在旺季前完成校准。',
  showCompare: false,
  originalAnomalies: initialAnomalies,
  modifiedAnomalies,

  setEditingRemark: (v) => set({ editingRemark: v }),

  applyRemarkEdit: () => {
    const { currentRemark, editingRemark } = get();
    const newRemark: RiskRemark = {
      id: `remark-${Date.now()}`,
      content: editingRemark,
      modifiedAt: Date.now(),
      modifier: '李工（复核）',
      previousVersion: currentRemark,
      impactedConclusions: ['anom-001', 'anom-003', 'anom-004'],
    };
    set({
      currentRemark: newRemark,
      showCompare: true,
    });
  },

  toggleCompare: () => set((s) => ({ showCompare: !s.showCompare })),

  resetToOriginal: () =>
    set({
      currentRemark: get().originalRemark,
      showCompare: false,
    }),

  getImpactedIds: () => {
    const orig = get().originalRemark.impactedConclusions;
    const curr = get().currentRemark.impactedConclusions;
    return Array.from(new Set([...orig, ...curr]));
  },
}));
