import { create } from 'zustand';
import type { CostSnapshot, Parameter, Note } from '@/types';
import { mockSnapshots } from '@/data/snapshots';

interface SnapshotStore {
  snapshots: CostSnapshot[];
  currentSnapshotId: string | null;
  selectedForCompare: string[];
  setCurrentSnapshot: (id: string) => void;
  toggleCompareSelection: (id: string) => void;
  clearCompareSelection: () => void;
  addNote: (snapshotId: string, note: Omit<Note, 'id'>) => void;
  recalculateCost: (snapshotId: string, params: Record<string, number>) => void;
  getCurrentSnapshot: () => CostSnapshot | undefined;
  getCompareSnapshots: () => CostSnapshot[];
}

export const useSnapshotStore = create<SnapshotStore>((set, get) => ({
  snapshots: mockSnapshots,
  currentSnapshotId: mockSnapshots[0]?.id || null,
  selectedForCompare: [],

  setCurrentSnapshot: (id: string) => {
    set({ currentSnapshotId: id });
  },

  toggleCompareSelection: (id: string) => {
    const { selectedForCompare } = get();
    if (selectedForCompare.includes(id)) {
      set({ selectedForCompare: selectedForCompare.filter(sid => sid !== id) });
    } else if (selectedForCompare.length < 2) {
      set({ selectedForCompare: [...selectedForCompare, id] });
    }
  },

  clearCompareSelection: () => {
    set({ selectedForCompare: [] });
  },

  addNote: (snapshotId: string, note: Omit<Note, 'id'>) => {
    set(state => ({
      snapshots: state.snapshots.map(snap =>
        snap.id === snapshotId
          ? { ...snap, notes: [...snap.notes, { ...note, id: `n-${Date.now()}` }] }
          : snap
      )
    }));
  },

  recalculateCost: (snapshotId: string, params: Record<string, number>) => {
    set(state => ({
      snapshots: state.snapshots.map(snap => {
        if (snap.id !== snapshotId) return snap;
        
        const updatedParams = snap.parameters.map(p => 
          params[p.name] !== undefined
            ? { ...p, value: params[p.name] }
            : p
        );
        
        const totalCost = updatedParams.reduce((sum, p) => {
          if (p.name === '通信成本') return sum + p.value;
          if (p.name === '算力单价') return sum;
          if (p.name === '客户端数量') return sum;
          if (p.name === '单轮训练时长') return sum;
          if (p.name === '灰度比例') return sum;
          if (p.name === '训练轮次') return sum;
          return sum + p.value;
        }, 0);
        
        const clientCount = updatedParams.find(p => p.name === '客户端数量')?.value || 0;
        const hours = updatedParams.find(p => p.name === '单轮训练时长')?.value || 0;
        const price = updatedParams.find(p => p.name === '算力单价')?.value || 0;
        const grayRatio = (updatedParams.find(p => p.name === '灰度比例')?.value || 0) / 100;
        const rounds = updatedParams.find(p => p.name === '训练轮次')?.value || 0;
        const commCost = updatedParams.find(p => p.name === '通信成本')?.value || 0;
        
        const calculatedCost = clientCount * hours * price * grayRatio * rounds + commCost;
        
        const hasError = updatedParams.some(p => 
          p.value < p.minBoundary || p.value > p.maxBoundary
        );
        
        return {
          ...snap,
          parameters: updatedParams,
          totalCost: calculatedCost,
          status: hasError ? 'error' : 'normal'
        };
      })
    }));
  },

  getCurrentSnapshot: () => {
    const { snapshots, currentSnapshotId } = get();
    return snapshots.find(s => s.id === currentSnapshotId);
  },

  getCompareSnapshots: () => {
    const { snapshots, selectedForCompare } = get();
    return snapshots.filter(s => selectedForCompare.includes(s.id));
  }
}));
