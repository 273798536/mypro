import { create } from 'zustand';
import type { EvidenceItem, EvidenceStatus } from '@/types';
import { evidenceItems } from '@/data/records';

interface EvidenceState {
  items: EvidenceItem[];

  setStatus: (id: string, status: EvidenceStatus, label: string) => void;
  reset: () => void;
  getCounts: () => { processed: number; pending: number; abnormal: number };
}

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  processed: '✅ 已处理',
  pending: '📌 待补证据',
  abnormal: '⚠️ 异常',
};

export const useEvidenceStore = create<EvidenceState>((set, get) => ({
  items: JSON.parse(JSON.stringify(evidenceItems)),

  setStatus: (id, status, label) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, status, statusLabel: label || STATUS_LABELS[status] } : i,
      ),
    }));
  },

  reset: () => set({ items: JSON.parse(JSON.stringify(evidenceItems)) }),

  getCounts: () => {
    const { items } = get();
    return items.reduce(
      (acc, i) => {
        acc[i.status] += 1;
        return acc;
      },
      { processed: 0, pending: 0, abnormal: 0 },
    );
  },
}));
