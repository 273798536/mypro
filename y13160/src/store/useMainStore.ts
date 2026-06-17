import { create } from 'zustand';
import type { ChainStep, HistoryNode, ParamGroup, Photo } from '@/types';
import { DEFAULT_PARAM_GROUP_A, DEFAULT_PARAM_GROUP_B } from '@/fixtures/paramGroups';
import { DEFAULT_PHOTOS } from '@/fixtures/photos';
import { buildChainsForGroups } from '@/engine/formulaEngine';
import { scanGaps } from '@/engine/gapDetector';

interface Snapshot {
  paramGroups: ParamGroup[];
  chainA: ChainStep[];
  chainB: ChainStep[];
  activeGroup: 'A' | 'B';
}

interface MainState extends Snapshot {
  photos: Photo[];
  history: HistoryNode[];
  historyIndex: number;
  gapGroupId: 'A' | 'B' | null;
  showAnnotation: boolean;
  annotationPhotoId?: string;
  annotationStepId?: string;

  loadSample: () => void;
  rerun: () => void;
  toggleAnnotation: (photoId?: string, stepId?: string) => void;
  setActiveGroup: (g: 'A' | 'B') => void;
  updateParam: (
    groupId: 'A' | 'B',
    key: string,
    value: number,
    unit: string
  ) => void;
  undo: (steps?: number) => void;
  redo: (steps?: number) => void;
  jumpToHistory: (id: string) => void;
  reset: () => void;
  _pushHistory: (summary: string) => void;
  _applySnapshot: (s: Snapshot) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function makeSnapshot(s: MainState): Snapshot {
  return {
    paramGroups: JSON.parse(JSON.stringify(s.paramGroups)),
    chainA: JSON.parse(JSON.stringify(s.chainA)),
    chainB: JSON.parse(JSON.stringify(s.chainB)),
    activeGroup: s.activeGroup,
  };
}

function buildNode(s: Snapshot, summary: string): HistoryNode {
  const gaps = [
    ...scanGaps(s.chainA, s.paramGroups[0]),
    ...scanGaps(s.chainB, s.paramGroups[1]),
  ];
  return {
    id: uid(),
    timestamp: now(),
    summary,
    isClean: gaps.length === 0,
    paramGroups: JSON.parse(JSON.stringify(s.paramGroups)),
    chainA: JSON.parse(JSON.stringify(s.chainA)),
    chainB: JSON.parse(JSON.stringify(s.chainB)),
    activeGroup: s.activeGroup,
  };
}

const initialChain = (() => {
  const [cA, cB] = buildChainsForGroups(
    [DEFAULT_PARAM_GROUP_A, DEFAULT_PARAM_GROUP_B],
    null
  );
  return { chainA: cA, chainB: cB };
})();

const initialState: Pick<
  MainState,
  'photos' | 'history' | 'historyIndex' | 'gapGroupId' | 'showAnnotation'
> = {
  photos: [],
  history: [],
  historyIndex: -1,
  gapGroupId: null,
  showAnnotation: false,
};

export const useMainStore = create<MainState>((set, get) => ({
  paramGroups: [DEFAULT_PARAM_GROUP_A, DEFAULT_PARAM_GROUP_B],
  chainA: initialChain.chainA,
  chainB: initialChain.chainB,
  activeGroup: 'A',
  ...initialState,

  _applySnapshot: (s) =>
    set({
      paramGroups: s.paramGroups,
      chainA: s.chainA,
      chainB: s.chainB,
      activeGroup: s.activeGroup,
    }),

  _pushHistory: (summary) => {
    const st = get();
    const snap = makeSnapshot(st);
    const node = buildNode(snap, summary);
    set((s) => {
      const trim = s.historyIndex + 1 < s.history.length ? s.history.slice(0, s.historyIndex + 1) : s.history;
      return {
        history: [...trim, node],
        historyIndex: trim.length,
      };
    });
  },

  loadSample: () => {
    set({
      photos: DEFAULT_PHOTOS,
      paramGroups: [DEFAULT_PARAM_GROUP_A, DEFAULT_PARAM_GROUP_B],
      gapGroupId: 'B',
    });
    const [cA, cB] = buildChainsForGroups(
      [DEFAULT_PARAM_GROUP_A, DEFAULT_PARAM_GROUP_B],
      'B'
    );
    set({ chainA: cA, chainB: cB });
    get()._pushHistory('放样例：载入现场照片包(4张) + B组注入单位混写缺口');
  },

  rerun: () => {
    const { paramGroups, gapGroupId } = get();
    const [cA, cB] = buildChainsForGroups(paramGroups, gapGroupId);
    set({ chainA: cA, chainB: cB });
    get()._pushHistory('重跑：按当前两组参数重新复算链路');
  },

  toggleAnnotation: (photoId, stepId) =>
    set((s) => ({
      showAnnotation: photoId || stepId ? true : !s.showAnnotation,
      annotationPhotoId: photoId ?? s.annotationPhotoId,
      annotationStepId: stepId ?? s.annotationStepId,
    })),

  setActiveGroup: (g) => set({ activeGroup: g }),

  updateParam: (groupId, key, value, unit) => {
    set((s) => ({
      paramGroups: s.paramGroups.map((pg) =>
        pg.id !== groupId
          ? pg
          : {
              ...pg,
              params: {
                ...pg.params,
                [key]: { ...pg.params[key], value, unit },
              },
            }
      ),
    }));
    const { paramGroups, gapGroupId } = get();
    const [cA, cB] = buildChainsForGroups(paramGroups, gapGroupId);
    set({ chainA: cA, chainB: cB });
    get()._pushHistory(
      `修改参数：${groupId}/${key}=${value}${unit}，触发重算`
    );
  },

  undo: (steps = 1) => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const target = Math.max(0, historyIndex - steps);
    const node = history[target];
    get()._applySnapshot({
      paramGroups: node.paramGroups,
      chainA: node.chainA,
      chainB: node.chainB,
      activeGroup: node.activeGroup,
    });
    set({ historyIndex: target });
  },

  redo: (steps = 1) => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const target = Math.min(history.length - 1, historyIndex + steps);
    const node = history[target];
    get()._applySnapshot({
      paramGroups: node.paramGroups,
      chainA: node.chainA,
      chainB: node.chainB,
      activeGroup: node.activeGroup,
    });
    set({ historyIndex: target });
  },

  jumpToHistory: (id) => {
    const { history } = get();
    const idx = history.findIndex((h) => h.id === id);
    if (idx < 0) return;
    const node = history[idx];
    get()._applySnapshot({
      paramGroups: node.paramGroups,
      chainA: node.chainA,
      chainB: node.chainB,
      activeGroup: node.activeGroup,
    });
    set({ historyIndex: idx });
  },

  reset: () => {
    set({
      paramGroups: [DEFAULT_PARAM_GROUP_A, DEFAULT_PARAM_GROUP_B],
      ...initialChain,
      activeGroup: 'A',
      photos: [],
      gapGroupId: null,
      history: [],
      historyIndex: -1,
      showAnnotation: false,
      annotationPhotoId: undefined,
      annotationStepId: undefined,
    });
  },
}));

export default useMainStore;
