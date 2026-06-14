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

  selectedProblemId: string | null;
  selectedNodeId: string | null;

  shortestPath: string[] | null;
  shortestDistance: number | null;
  explanation: string;

  rerunProgress: number;
  rerunRunning: boolean;
  rerunResult: MaterialCheckItem[] | null;

  selectNode: (id: string) => void;
  selectProblem: (id: string) => void;
  highlightAbnormal: (nodeId: string, problemId: string) => void;
  confirmUnits: () => void;
  updateExplanation: (value: string) => void;
  toggleNodeAbnormal: (nodeId: string, problemId: string, reason?: string) => void;
  modifyJudgement: (payload: {
    field: string;
    before: string;
    after: string;
    reason?: string;
  }) => void;
  startRerun: () => Promise<void>;
  resetRerun: () => void;

  getAbnormalForProblem: (problemId: string) => AbnormalPoint[];
  generateExplanation: (problemId: string) => string;
}

const findMissing = (problems: Problem[]) =>
  problems.filter((p) => !p.unit || p.distance === null).map((p) => p.id);

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
      hint: allHaveUnit
        ? undefined
        : `共 ${s.problems.filter((p) => !p.unit || p.distance === null).length} 条单位/距离缺失`,
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

function buildDefaultExplanation(
  problem: Problem,
  path: string[],
  distance: number,
  abnCount: number
): string {
  const pathStr = path.join(' → ');
  return `本题从 ${problem.start} 到 ${problem.end} 的最短路径为 ${pathStr}，总长度 ${distance}${problem.unit || 'km'}。选择 Dijkstra 算法，节点数 6、边数 8，所有权重为正且对称。异常点共 ${abnCount} 处，已在右侧复核卡与上方图标中标注。详细对照见左侧题目清单与底部历史记录。`;
}

export const useAppStore = create<AppState>((set, get) => ({
  nodes: MOCK_NODES,
  edges: MOCK_EDGES,
  problems: MOCK_PROBLEMS,
  paramVersion: MOCK_PARAM_VERSION,
  abnormalPoints: MOCK_ABNORMAL_POINTS,
  history: MOCK_HISTORY,
  withdrawn: MOCK_WITHDRAWN,
  addendum: MOCK_ADDENDUM,

  pendingConfirmation: findMissing(MOCK_PROBLEMS).length > 0,
  missingUnitProblems: findMissing(MOCK_PROBLEMS),

  selectedProblemId: null,
  selectedNodeId: null,

  shortestPath: null,
  shortestDistance: null,
  explanation: '单位缺失待确认，解释暂未生成。请点击顶部「确认后继续」按钮开始计算。',

  rerunProgress: 0,
  rerunRunning: false,
  rerunResult: null,

  selectNode: (id) => {
    const { abnormalPoints, problems, selectedProblemId } = get();
    const relatedAbn = abnormalPoints.filter((a) => a.nodeId === id);
    const targetProblemId =
      relatedAbn.length > 0
        ? relatedAbn[0].problemId
        : selectedProblemId ?? problems[0]?.id ?? null;
    set({
      selectedNodeId: id,
      selectedProblemId: targetProblemId,
    });
  },

  selectProblem: (id) => {
    const state = get();
    const problem = state.problems.find((p) => p.id === id);
    if (!problem) return;

    if (!state.pendingConfirmation && problem.unit && problem.distance !== null) {
      const { path, distance } = dijkstra(
        state.nodes,
        state.edges,
        problem.start,
        problem.end
      );
      if (path.length > 0) {
        const result = markShortestPath(
          state.nodes.map((n) => ({ ...n, onShortestPath: false })),
          state.edges.map((e) => ({ ...e, onShortestPath: false })),
          path
        );
        const abnForProblem = state.abnormalPoints.filter(
          (a) => a.problemId === id
        );
        const newExplanation = buildDefaultExplanation(
          problem,
          path,
          distance,
          abnForProblem.length
        );
        set({
          nodes: result.nodes as GraphNode[],
          edges: result.edges as GraphEdge[],
          shortestPath: path,
          shortestDistance: distance,
          selectedProblemId: id,
          selectedNodeId: problem.start,
          explanation: newExplanation,
        });
        return;
      }
    }

    set({
      selectedProblemId: id,
      selectedNodeId: problem.start,
    });
  },

  highlightAbnormal: (nodeId, problemId) => {
    const state = get();
    if (state.selectedProblemId !== problemId) {
      state.selectProblem(problemId);
    }
    setTimeout(() => set({ selectedNodeId: nodeId }), 0);
  },

  confirmUnits: () => {
    const { problems, nodes, edges } = get();
    const fixed = problems.map((p) =>
      !p.unit || p.distance === null
        ? { ...p, unit: p.unit || 'km', distance: p.distance ?? 9 }
        : p
    );

    const firstProblem = fixed[0];
    const { path, distance } = dijkstra(
      nodes,
      edges,
      firstProblem.start,
      firstProblem.end
    );

    let markedNodes: GraphNode[] = nodes.map((n) => ({ ...n, onShortestPath: false }));
    let markedEdges: GraphEdge[] = edges.map((e) => ({ ...e, onShortestPath: false }));
    let finalPath: string[] | null = null;
    let finalDist: number | null = null;
    let explanation = '';

    if (path.length > 0) {
      const marked = markShortestPath(markedNodes, markedEdges, path);
      markedNodes = marked.nodes as GraphNode[];
      markedEdges = marked.edges as GraphEdge[];
      finalPath = path;
      finalDist = distance;

      const abnForProblem = get().abnormalPoints.filter(
        (a) => a.problemId === firstProblem.id
      );
      explanation = buildDefaultExplanation(
        firstProblem,
        path,
        distance,
        abnForProblem.length
      );
    }

    set({
      problems: fixed,
      pendingConfirmation: false,
      missingUnitProblems: [],
      nodes: markedNodes,
      edges: markedEdges,
      shortestPath: finalPath,
      shortestDistance: finalDist,
      selectedProblemId: firstProblem.id,
      selectedNodeId: firstProblem.start,
      explanation,
    });
  },

  updateExplanation: (value) => set({ explanation: value }),

  toggleNodeAbnormal: (nodeId, problemId, reason) => {
    const state = get();
    const existing = state.abnormalPoints.find(
      (a) => a.nodeId === nodeId && a.problemId === problemId
    );

    let newAbn: AbnormalPoint[];
    let before: string;
    let after: string;

    if (existing) {
      newAbn = state.abnormalPoints.filter((a) => a !== existing);
      before = '异常（误差）';
      after = '正常';
    } else {
      newAbn = [
        ...state.abnormalPoints,
        {
          nodeId,
          problemId,
          description: `节点 ${nodeId} 由老叶临时判定为异常，原因：${reason || '人工复核标记'}`,
          severity: 'warn' as const,
        },
      ];
      before = '正常';
      after = '异常（误差）';
    }

    const newNodes = state.nodes.map((n) =>
      n.id === nodeId ? { ...n, isAbnormal: !existing } : n
    );

    const record: HistoryRecord = {
      id: `H-${String(Date.now()).slice(-6)}`,
      timestamp: new Date()
        .toLocaleString('zh-CN', { hour12: false })
        .replace(/\//g, '-'),
      operator: '叶老师（老叶）',
      field: `节点 ${nodeId} 异常判定`,
      before,
      after,
      reason: reason || '老叶临时判断',
    };

    set({
      abnormalPoints: newAbn,
      nodes: newNodes,
      history: [...state.history, record],
    });

    if (
      state.selectedProblemId &&
      !state.pendingConfirmation &&
      state.shortestPath
    ) {
      const prob = state.problems.find((p) => p.id === state.selectedProblemId);
      if (prob) {
        const abnCount = newAbn.filter(
          (a) => a.problemId === state.selectedProblemId
        ).length;
        const newExp = buildDefaultExplanation(
          prob,
          state.shortestPath,
          state.shortestDistance ?? 0,
          abnCount
        );
        set({ explanation: newExp });
      }
    }
  },

  modifyJudgement: ({ field, before, after, reason }) => {
    const record: HistoryRecord = {
      id: `H-${String(Date.now()).slice(-6)}`,
      timestamp: new Date()
        .toLocaleString('zh-CN', { hour12: false })
        .replace(/\//g, '-'),
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
  resetRerun: () =>
    set({ rerunProgress: 0, rerunRunning: false, rerunResult: null }),

  getAbnormalForProblem: (problemId) =>
    get().abnormalPoints.filter((a) => a.problemId === problemId),
  generateExplanation: (problemId) => {
    const s = get();
    const prob = s.problems.find((p) => p.id === problemId);
    if (!prob || !s.shortestPath || s.shortestDistance === null) return '';
    const abnCount = s.abnormalPoints.filter(
      (a) => a.problemId === problemId
    ).length;
    return buildDefaultExplanation(
      prob,
      s.shortestPath,
      s.shortestDistance,
      abnCount
    );
  },
}));
