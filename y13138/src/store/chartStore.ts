import { create } from 'zustand';
import type { MarkovNode, MarkovEdge, ParamRow } from '@/types';
import { deriveGraphFromParams } from '@/engine/deriveGraph';
import { runMarkovChain } from '@/engine/markov';
import { computeSteadyState } from '@/engine/steadyState';
import { detectBoundaryIssues, detectOverflow } from '@/engine/boundary';

interface ChartState {
  nodes: MarkovNode[];
  edges: MarkovEdge[];
  deriveLog: string[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoverNodeId: string | null;
  chainTrajectory: ReturnType<typeof runMarkovChain> | null;
  steadyCalc: ReturnType<typeof computeSteadyState> | null;

  setNodes: (nodes: MarkovNode[]) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setHoverNode: (id: string | null) => void;
  recompute: (
    paramRows: ParamRow[],
    boundaryThreshold: number,
    safeCoefficient: number,
  ) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  nodes: [],
  edges: [],
  deriveLog: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  hoverNodeId: null,
  chainTrajectory: null,
  steadyCalc: null,

  setNodes: (nodes) => set({ nodes }),
  selectNode: (id) => set({ selectedNodeId: id }),
  selectEdge: (id) => set({ selectedEdgeId: id }),
  setHoverNode: (id) => set({ hoverNodeId: id }),

  recompute: (paramRows, boundaryThreshold, safeCoefficient) => {
    const derived = deriveGraphFromParams(paramRows, {
      thresholdSlider: boundaryThreshold,
      safeCoeffSlider: safeCoefficient,
    });
    const nodes: MarkovNode[] = derived.nodes;
    const edges: MarkovEdge[] = derived.edges;

    const traj = runMarkovChain(nodes, edges, 12);
    const steady = computeSteadyState(nodes, edges);
    const boundary = detectBoundaryIssues(nodes, paramRows, boundaryThreshold);

    const safeLimitP = paramRows.find((r) => r.id === 'P-08');
    const overflowChecks = traj.trajectory.map((t) =>
      detectOverflow(t.distribution, safeLimitP, safeCoefficient),
    );
    const overallOverflow = overflowChecks.find((o) => o.hasOverflow);
    const lastOverflow = overflowChecks[overflowChecks.length - 1];

    const newNodes = nodes.map((nd, i) => {
      const bc = boundary[i];
      const ovfAtNode = overflowChecks.reduce<{ note?: string }>((acc, o) => {
        if (o.hasOverflow && o.stepIndex === i) return { note: o.note };
        return acc;
      }, {});
      const nodeOverflow = overallOverflow && lastOverflow && lastOverflow.stepIndex === i
        ? lastOverflow.note
        : ovfAtNode.note;
      return {
        ...nd,
        steadyProb: steady.steadyVector[i] ?? nd.steadyProb,
        initialProb: nd.initialProb,
        isAbnormal: bc?.isAbnormal ?? nd.isAbnormal,
        abnormalReason: bc?.isAbnormal ? bc.reason : undefined,
        overflowWarning: nodeOverflow,
      };
    });

    set({
      nodes: newNodes,
      edges,
      deriveLog: derived.log,
      chainTrajectory: traj,
      steadyCalc: steady,
      selectedNodeId: get().selectedNodeId ?? (newNodes.find((n) => n.isAbnormal)?.id || null),
    });
  },
}));
