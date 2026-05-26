import { create } from 'zustand';
import type { TrajectoryResult } from '@/types/trajectory';
import { COMPARE_COLORS } from '@/types/trajectory';

interface CompareState {
  maxItems: number;
  addToCompare: (result: TrajectoryResult) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
}

interface InternalState extends CompareState {
  items: { id: string; color: string; result: TrajectoryResult; label: string }[];
}

export const useCompareStore = create<InternalState>((set, get) => ({
  items: [],
  maxItems: 4,

  addToCompare: (result) => {
    const items = get().items;
    if (items.length >= 4) return;
    if (items.find((i) => i.id === result.params.id)) return;

    const color = COMPARE_COLORS[items.length];
    const label = `弹道${items.length + 1}`;

    set({
      items: [...items, { id: result.params.id, color, result, label }],
    });
  },

  removeFromCompare: (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }));
  },

  clearCompare: () => set({ items: [] }),
}));
