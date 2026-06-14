import { create } from 'zustand';
import type { ParamGroup, ParamRow } from '@/types';
import { paramsGroupA, paramsGroupB } from '@/data/params';
import { syncSliderToParamRows, readInitialThresholdsFromRows } from '@/engine/deriveGraph';

interface ParamState {
  activeGroupId: 'A' | 'B';
  groups: Record<'A' | 'B', ParamGroup>;
  selectedParamId: string | null;
  boundaryThreshold: number;
  safeCoefficient: number;
  paramVersion: number;

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
  bumpVersion: () => void;
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

function syncBothGroups(
  groups: Record<'A' | 'B', ParamGroup>,
  threshold: number,
  safeCoeff: number,
): Record<'A' | 'B', ParamGroup> {
  return {
    A: { ...groups.A, rows: syncSliderToParamRows(groups.A.rows, threshold, safeCoeff) },
    B: { ...groups.B, rows: syncSliderToParamRows(groups.B.rows, threshold, safeCoeff) },
  };
}

export const useParamStore = create<ParamState>((set, get) => {
  let initialGroups: Record<'A' | 'B', ParamGroup> = {
    A: JSON.parse(JSON.stringify(paramsGroupA)),
    B: JSON.parse(JSON.stringify(paramsGroupB)),
  };
  const stored = loadFromStorage();

  let initialThreshold = stored?.boundaryThreshold ?? readInitialThresholdsFromRows(initialGroups.A.rows).threshold;
  let initialSafeCoeff = stored?.safeCoefficient ?? readInitialThresholdsFromRows(initialGroups.A.rows).safeCoeff;

  if (stored?.groups) {
    initialGroups = stored.groups;
  }

  initialGroups = syncBothGroups(initialGroups, initialThreshold, initialSafeCoeff);

  return {
    activeGroupId: stored?.activeGroupId ?? 'A',
    groups: initialGroups,
    selectedParamId: null,
    boundaryThreshold: initialThreshold,
    safeCoefficient: initialSafeCoeff,
    paramVersion: 0,

    setActiveGroup: (id) => {
      set({ activeGroupId: id, paramVersion: get().paramVersion + 1 });
      saveToStorage(get());
    },
    updateParamValue: (groupId, paramId, value) => {
      set((state) => {
        const group = { ...state.groups[groupId] };
        group.rows = group.rows.map((r) => {
          if (r.id !== paramId) return r;
          return { ...r, value };
        });
        let threshold = state.boundaryThreshold;
        let safeCoeff = state.safeCoefficient;
        if (paramId === 'P-07') threshold = value;
        if (paramId === 'P-08') safeCoeff = value;
        const newGroups = threshold !== state.boundaryThreshold || safeCoeff !== state.safeCoefficient
          ? syncBothGroups({ ...state.groups, [groupId]: group }, threshold, safeCoeff)
          : { ...state.groups, [groupId]: group };
        const next = {
          ...state,
          groups: newGroups,
          boundaryThreshold: threshold,
          safeCoefficient: safeCoeff,
          paramVersion: state.paramVersion + 1,
        };
        saveToStorage(next);
        return next;
      });
    },
    selectParam: (id) => set({ selectedParamId: id }),
    setBoundaryThreshold: (v) => {
      set((state) => {
        const nextGroups = syncBothGroups(state.groups, v, state.safeCoefficient);
        const next = {
          ...state,
          groups: nextGroups,
          boundaryThreshold: v,
          paramVersion: state.paramVersion + 1,
        };
        saveToStorage(next);
        return next;
      });
    },
    setSafeCoefficient: (v) => {
      set((state) => {
        const nextGroups = syncBothGroups(state.groups, state.boundaryThreshold, v);
        const next = {
          ...state,
          groups: nextGroups,
          safeCoefficient: v,
          paramVersion: state.paramVersion + 1,
        };
        saveToStorage(next);
        return next;
      });
    },
    addLateAttachment: (groupId, row) => {
      set((state) => {
        const group = { ...state.groups[groupId] };
        const newId = `P-${String(group.rows.length + 1).padStart(2, '0')}`;
        group.rows = [...group.rows, { ...row, id: newId, isLateAttachment: true }];
        const next = {
          ...state,
          groups: { ...state.groups, [groupId]: group },
          paramVersion: state.paramVersion + 1,
        };
        saveToStorage(next);
        return next;
      });
    },
    resetToFactory: () => {
      const fresh: Record<'A' | 'B', ParamGroup> = {
        A: JSON.parse(JSON.stringify(paramsGroupA)),
        B: JSON.parse(JSON.stringify(paramsGroupB)),
      };
      const th = readInitialThresholdsFromRows(fresh.A.rows);
      const synced = syncBothGroups(fresh, th.threshold, th.safeCoeff);
      const next: ParamState = {
        ...get(),
        activeGroupId: 'A',
        groups: synced,
        boundaryThreshold: th.threshold,
        safeCoefficient: th.safeCoeff,
        paramVersion: get().paramVersion + 1,
      };
      set(next);
      localStorage.removeItem(STORAGE_KEY);
    },
    bumpVersion: () => set({ paramVersion: get().paramVersion + 1 }),
  };
});
