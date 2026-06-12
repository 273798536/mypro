import { create } from 'zustand';
import type { MarkovNode, MarkovEdge, ParamRow } from '@/types';
import { markovNodes, markovEdges } from '@/data/graph';
import { runMarkovChain } from '@/engine/markov';
import { computeSteadyState } from '@/engine/steadyState';
import { detectBoundaryIssues, detectOverflow } from '@/engine/boundary';

interface ChartState {
  nodes: MarkovNode[];
  edges: MarkovEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoverNodeId: string | null;
  chainTrajectory: ReturnType<typeof runMarkovChain> | null;
  steadyCalc: ReturnType<typeof computeSteadyState> | null;

  setNodes: (nodes: MarkovNode[]) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setHoverNode: (id: string | null) => void;
  recompute: (paramRows: ParamRow[]) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  nodes: JSON.parse(JSON.stringify(markovNodes)),
  edges: JSON.parse(JSON.stringify(markovEdges)),
  selectedNodeId: 'S2',
  selectedEdgeId: null,
  hoverNodeId: null,
  chainTrajectory: null,
  steadyCalc: null,

  setNodes: (nodes) => set({ nodes }),
  selectNode: (id) => set({ selectedNodeId: id }),
  selectEdge: (id) => set({ selectedEdgeId: id }),
  setHoverNode: (id) => set({ hoverNodeId: id }),
  recompute: (paramRows) => {
    const { nodes, edges } = get();
    const traj = runMarkovChain(nodes, edges, 12);
    const steady = computeSteadyState(nodes, edges);
    const boundary = detectBoundaryIssues(nodes, paramRows);
    const safeLimitP = paramRows.find((r) => r.id === 'P-08');
    const lastDist = traj.trajectory[traj.trajectory.length - 1].distribution;
    const overflow = detectOverflow(lastDist, safeLimitP);

    const newNodes = nodes.map((nd, i) => {
      const bc = boundary[i];
      const nodeOverflow =
        overflow.hasOverflow && overflow.stepIndex === i ? overflow.note : undefined;
      return {
        ...nd,
        steadyProb: steady.steadyVector[i] ?? nd.steadyProb,
        isAbnormal: bc?.isAbnormal ?? nd.isAbnormal,
        abnormalReason: bc?.isAbnormal ? bc.reason : undefined,
        overflowWarning: nodeOverflow,
      };
    });

    set({
      nodes: newNodes,
      chainTrajectory: traj,
      steadyCalc: steady,
    });
  },
}));
