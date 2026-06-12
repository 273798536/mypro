import { create } from 'zustand';
import type {
  GraphNode,
  GraphEdge,
  Problem,
  ParamVersion,
  AbnormalPoint,
  HistoryRecord,
  WithdrawnItem,
  AddendumNote,
  MaterialCheckItem,
} from '@/types';
import {
  MOCK_ABNORMAL_POINTS,
  MOCK_ADDENDUM,
  MOCK_EDGES,
  MOCK_HISTORY,
  MOCK_NODES,
  MOCK_PARAM_VERSION,
  MOCK_PROBLEMS,
  MOCK_WITHDRAWN,
  INITIAL_EXPLANATION,
  INITIAL_SHORTEST_PATH,
} from '@/data/mockData';
import { dijkstra, markShortestPath } from '@/utils/dijkstra';

export interface AppState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  problems: Problem[];
  paramVersion: ParamVersion;
  abnormalPoints: AbnormalPoint[];
  history: HistoryRecord[];
  withdrawn: WithdrawnItem[];
  addendum: AddendumNote[];
  pendingConfirmation: boolean;
  missingUnitProblems: string[];
  selectedNodeId: string | null;
  selectedProblemId: string | null;
  shortestPath: string[] | null;
  explanation: string;
  rerunProgress: number;
  rerunRunning: boolean;
  rerunResult: MaterialCheckItem[] | null;

  selectNode: (id: string) => void;
  selectProblem: (id: string) => void;
  highlightAbnormal: (nodeId: string, problemId: string) => void;
  confirmUnits: () => void;
  updateExplanation: (value: string) => void;
  modifyJudgement: (payload: {
    field: string;
    before: string;
    after: string;
    reason?: string;
  }) => void;
  startRerun: () => Promise<void>;
  resetRerun: () => void;
}

const findMissing = (problems: Problem[]) =>
  problems.filter((p) => !p.unit || p.distance === null).map((p) => p.id);

function computeInitialMarked() {
  const { nodes, edges } = markShortestPath(
    MOCK_NODES,
    MOCK_EDGES,
    INITIAL_SHORTEST_PATH
  );
  return { nodes, edges };
}

function checkMaterials(s: {
  problems: Problem[];
  withdrawn: WithdrawnItem[];
  addendum: AddendumNote[];
  paramVersion: ParamVersion;
  history: HistoryRecord[];
  explanation: string;
}): MaterialCheckItem[] {
  const allHaveUnit = s.problems.every((p) => p.unit && p.distance !== null);
  return [
    {
      key: 'problems',
      label: '题目清单 ≥ 3 条且全部有单位',
      ok: s.problems.length >= 3 && allHaveUnit,
      hint: allHaveUnit ? undefined : `共 ${s.problems.filter((p) => !p.unit || p.distance === null).length} 条单位/距离缺失`,
    },
    {
      key: 'withdrawn',
      label: '存在撤回记录 ≥ 1 条',
      ok: s.withdrawn.length >= 1,
    },
    {
      key: 'addendum',
      label: '存在后补说明 ≥ 1 段',
      ok: s.addendum.length >= 1,
    },
    {
      key: 'param',
      label: '参数版本号有时间戳',
      ok: !!s.paramVersion.timestamp,
    },
    {
      key: 'history',
      label: '历史变更记录 ≥ 1 条',
      ok: s.history.length >= 1,
    },
    {
      key: 'explanation',
      label: '文字解释 ≥ 20 字',
      ok: s.explanation.length >= 20,
    },
  ];
}

const initialMarked = computeInitialMarked();

export const useAppStore = create<AppState>((set, get) => ({
  nodes: initialMarked.nodes,
  edges: initialMarked.edges,
  problems: MOCK_PROBLEMS,
  paramVersion: MOCK_PARAM_VERSION,
  abnormalPoints: MOCK_ABNORMAL_POINTS,
  history: MOCK_HISTORY,
  withdrawn: MOCK_WITHDRAWN,
  addendum: MOCK_ADDENDUM,
  pendingConfirmation: findMissing(MOCK_PROBLEMS).length > 0,
  missingUnitProblems: findMissing(MOCK_PROBLEMS),
  selectedNodeId: null,
  selectedProblemId: null,
  shortestPath: INITIAL_SHORTEST_PATH,
  explanation: INITIAL_EXPLANATION,
  rerunProgress: 0,
  rerunRunning: false,
  rerunResult: null,

  selectNode: (id) => {
    const { problems, abnormalPoints } = get();
    const related = abnormalPoints.find((a) => a.nodeId === id);
    set({
      selectedNodeId: id,
      selectedProblemId: related?.problemId ?? problems[0]?.id ?? null,
    });
  },
  selectProblem: (id) => {
    const problem = get().problems.find((p) => p.id === id);
    set({
      selectedProblemId: id,
      selectedNodeId: problem?.start ?? null,
    });
  },
  highlightAbnormal: (nodeId, problemId) => {
    set({ selectedNodeId: nodeId, selectedProblemId: problemId });
  },
  confirmUnits: () => {
    const { problems } = get();
    const fixed = problems.map((p) =>
      !p.unit || p.distance === null
        ? { ...p, unit: p.unit || 'km', distance: p.distance ?? 9 }
        : p
    );
    const { path } = dijkstra(
      get().nodes,
      get().edges,
      fixed[0].start,
      fixed[fixed.length - 1].end
    );
    const marked = markShortestPath(get().nodes, get().edges, path.length ? path : INITIAL_SHORTEST_PATH);
    set({
      problems: fixed,
      pendingConfirmation: false,
      missingUnitProblems: [],
      nodes: marked.nodes,
      edges: marked.edges,
      shortestPath: path.length ? path : INITIAL_SHORTEST_PATH,
    });
  },
  updateExplanation: (value) => set({ explanation: value }),
  modifyJudgement: ({ field, before, after, reason }) => {
    const record: HistoryRecord = {
      id: `H-${String(Date.now()).slice(-6)}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      operator: '叶老师（老叶）',
      field,
      before,
      after,
      reason,
    };
    set((s) => ({ history: [...s.history, record] }));
  },
  startRerun: async () => {
    set({ rerunRunning: true, rerunProgress: 0, rerunResult: null });
    const steps = [15, 35, 55, 75, 100];
    for (const v of steps) {
      await new Promise((r) => setTimeout(r, 320));
      set({ rerunProgress: v });
    }
    const s = get();
    const result = checkMaterials(s);
    set({ rerunRunning: false, rerunResult: result });
  },
  resetRerun: () => set({ rerunProgress: 0, rerunRunning: false, rerunResult: null }),
}));
