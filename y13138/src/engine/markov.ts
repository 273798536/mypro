import type { MarkovNode, MarkovEdge } from '@/types';

export interface StepDistribution {
  step: number;
  distribution: number[];
  overflowFlags: boolean[];
}

export function buildTransitionMatrix(
  nodes: MarkovNode[],
  edges: MarkovEdge[],
): number[][] {
  const n = nodes.length;
  const idToIdx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const P: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const e of edges) {
    const i = idToIdx.get(e.from);
    const j = idToIdx.get(e.to);
    if (i !== undefined && j !== undefined) P[i][j] = e.probability;
  }
  return P;
}

export function multiplyVectorMatrix(
  v: number[],
  P: number[][],
): number[] {
  const n = v.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      out[i] += v[k] * P[k][i];
    }
  }
  return out;
}

export function runMarkovChain(
  nodes: MarkovNode[],
  edges: MarkovEdge[],
  maxStep = 12,
): { trajectory: StepDistribution[]; transitionMatrix: number[][] } {
  const P = buildTransitionMatrix(nodes, edges);
  const initial = nodes.map((n) => n.initialProb);
  const trajectory: StepDistribution[] = [
    { step: 0, distribution: [...initial], overflowFlags: initial.map((p) => p > 1 || p < 0) },
  ];
  let cur = [...initial];
  for (let s = 1; s <= maxStep; s++) {
    cur = multiplyVectorMatrix(cur, P);
    trajectory.push({
      step: s,
      distribution: [...cur],
      overflowFlags: cur.map((p) => p > 1.001 || p < -0.001),
    });
  }
  return { trajectory, transitionMatrix: P };
}

export function formatMatrixEquation(
  step: number,
  nodes: MarkovNode[],
  prev: number[],
  P: number[][],
  next: number[],
): string[] {
  const lines: string[] = [];
  lines.push(`第${step}步：π(${step}) = π(${step - 1}) × P`);
  lines.push(`  π(${step - 1}) = [${prev.map((p) => p.toFixed(3)).join(', ')}]`);
  const labels = nodes.map((n) => n.romanLabel);
  for (let i = 0; i < nodes.length; i++) {
    const terms: string[] = [];
    for (let k = 0; k < nodes.length; k++) {
      if (P[k][i] > 0) {
        terms.push(`${prev[k].toFixed(2)}×${P[k][i].toFixed(2)}`);
      }
    }
    lines.push(`  π${step}(S${labels[i]}) = ${terms.join(' + ')} = ${next[i].toFixed(4)}`);
  }
  return lines;
}
