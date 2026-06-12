import { create } from 'zustand';
import type { ParamGroup, ParamRow } from '@/types';
import { paramsGroupA, paramsGroupB } from '@/data/params';

interface ParamState {
  activeGroupId: 'A' | 'B';
  groups: Record<'A' | 'B', ParamGroup>;
  selectedParamId: string | null;
  boundaryThreshold: number;
  safeCoefficient: number;

  setActiveGroup: (id: 'A' | 'B') => void;
  updateParamValue: (groupId: 'A' | 'B', paramId: string, value: number) => void;
  selectParam: (id: string | null) => void;
  setBoundaryThreshold: (v: number) => void;
  setSafeCoefficient: (v: number) => void;
  addLateAttachment: (
    groupId: 'A' | 'B',
    row: Omit<ParamRow, 'id' | 'isLateAttachment'>,
  ) => void;
  resetToFactory: () => void;
}

const STORAGE_KEY = 'markov-param-state';

function loadFromStorage(): Partial<ParamState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: ParamState) {
  try {
    const { groups, activeGroupId, boundaryThreshold, safeCoefficient } = state;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ groups, activeGroupId, boundaryThreshold, safeCoefficient }),
    );
  } catch {
    // noop
  }
}

export const useParamStore = create<ParamState>((set, get) => {
  const initialGroups: Record<'A' | 'B', ParamGroup> = {
    A: JSON.parse(JSON.stringify(paramsGroupA)),
    B: JSON.parse(JSON.stringify(paramsGroupB)),
  };
  const stored = loadFromStorage();

  return {
    activeGroupId: stored?.activeGroupId ?? 'A',
    groups: stored?.groups ?? initialGroups,
    selectedParamId: null,
    boundaryThreshold: stored?.boundaryThreshold ?? 5,
    safeCoefficient: stored?.safeCoefficient ?? 1.0,

    setActiveGroup: (id) => {
      set({ activeGroupId: id });
      saveToStorage(get());
    },
    updateParamValue: (groupId, paramId, value) => {
      set((state) => {
        const group = { ...state.groups[groupId] };
        group.rows = group.rows.map((r) => (r.id === paramId ? { ...r, value } : r));
        const next = { ...state, groups: { ...state.groups, [groupId]: group } };
        saveToStorage(next);
        return next;
      });
    },
    selectParam: (id) => set({ selectedParamId: id }),
    setBoundaryThreshold: (v) => {
      set({ boundaryThreshold: v });
      saveToStorage(get());
    },
    setSafeCoefficient: (v) => {
      set({ safeCoefficient: v });
      saveToStorage(get());
    },
    addLateAttachment: (groupId, row) => {
      set((state) => {
        const group = { ...state.groups[groupId] };
        const newId = `P-${String(group.rows.length + 1).padStart(2, '0')}`;
        group.rows = [...group.rows, { ...row, id: newId, isLateAttachment: true }];
        const next = { ...state, groups: { ...state.groups, [groupId]: group } };
        saveToStorage(next);
        return next;
      });
    },
    resetToFactory: () => {
      const next: ParamState = {
        ...get(),
        activeGroupId: 'A',
        groups: initialGroups,
        boundaryThreshold: 5,
        safeCoefficient: 1.0,
      };
      set(next);
      localStorage.removeItem(STORAGE_KEY);
    },
  };
});
