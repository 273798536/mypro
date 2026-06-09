import { create } from 'zustand';
import type { ReviewStep, ReviewRecord, RiskRemark } from '@/types';

interface ReviewState {
  records: Record<ReviewStep, ReviewRecord>;
  supplementInput: string;
  operatorName: string;
  confirmSignature: string;

  completeRepeat: () => void;
  setSupplementInput: (v: string) => void;
  submitSupplement: () => void;
  setOperatorName: (v: string) => void;
  setConfirmSignature: (v: string) => void;
  completeConfirm: () => void;
  resetAll: () => void;
  isStepComplete: (step: ReviewStep) => boolean;
  currentStep: ReviewStep | null;
}

const initialRecords: Record<ReviewStep, ReviewRecord> = {
  repeat: { step: 'repeat', completed: false },
  supplement: { step: 'supplement', completed: false },
  confirm: { step: 'confirm', completed: false },
};

export const useReviewStore = create<ReviewState>((set, get) => ({
  records: initialRecords,
  supplementInput: '',
  operatorName: '',
  confirmSignature: '',

  completeRepeat: () =>
    set((s) => ({
      records: {
        ...s.records,
        repeat: {
          step: 'repeat',
          completed: true,
          timestamp: Date.now(),
          operator: s.operatorName || '仿真工程师',
          note: '重复运行两次，结论一致，无异常波动。',
        },
      },
    })),

  setSupplementInput: (v) => set({ supplementInput: v }),
  setOperatorName: (v) => set({ operatorName: v }),
  setConfirmSignature: (v) => set({ confirmSignature: v }),

  submitSupplement: () => {
    const input = get().supplementInput.trim();
    if (!input) return;
    set((s) => ({
      records: {
        ...s.records,
        supplement: {
          step: 'supplement',
          completed: true,
          timestamp: Date.now(),
          operator: s.operatorName || '仿真工程师',
          note: input,
          supplementData: { source: 'manual_entry' },
        },
      },
      supplementInput: '',
    }));
  },

  completeConfirm: () => {
    const sig = get().confirmSignature.trim();
    if (!sig) return;
    set((s) => ({
      records: {
        ...s.records,
        confirm: {
          step: 'confirm',
          completed: true,
          timestamp: Date.now(),
          operator: sig,
          note: `已人工复核全部数据，结论可信，签字：${sig}`,
        },
      },
    }));
  },

  resetAll: () =>
    set({
      records: initialRecords,
      supplementInput: '',
      confirmSignature: '',
    }),

  isStepComplete: (step) => get().records[step].completed,

  get currentStep() {
    const s = get();
    if (!s.records.repeat.completed) return 'repeat';
    if (!s.records.supplement.completed) return 'supplement';
    if (!s.records.confirm.completed) return 'confirm';
    return null;
  },
}));
