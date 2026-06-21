import { create } from 'zustand';
import type { ReviewItem } from '@/types';
import { mockReviewItems } from '@/data/reviewItems';

interface ReviewStore {
  items: ReviewItem[];
  toggleItemComplete: (id: string) => void;
  getItemsForSnapshot: (snapshotId: string) => ReviewItem[];
  getSupplementItems: () => ReviewItem[];
  getReleaseItems: () => ReviewItem[];
  getStats: () => { total: number; toSupplement: number; toRelease: number; completed: number };
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  items: mockReviewItems,

  toggleItemComplete: (id: string) => {
    set(state => ({
      items: state.items.map(item =>
        item.id === id ? { ...item, isComplete: !item.isComplete } : item
      )
    }));
  },

  getItemsForSnapshot: (snapshotId: string) => {
    return get().items.filter(item => item.snapshotId === snapshotId);
  },

  getSupplementItems: () => {
    return get().items.filter(item => item.action === 'supplement');
  },

  getReleaseItems: () => {
    return get().items.filter(item => item.action === 'release');
  },

  getStats: () => {
    const items = get().items;
    return {
      total: items.length,
      toSupplement: items.filter(i => i.action === 'supplement' && !i.isComplete).length,
      toRelease: items.filter(i => i.action === 'release' && i.isComplete).length,
      completed: items.filter(i => i.isComplete).length
    };
  }
}));
