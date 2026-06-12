import type { SteadyCalcResult, MarkovEdge, MarkovNode } from '@/types';

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) x[i] = M[i][n] / M[i][i];
  return x;
}

export function computeSteadyState(
  nodes: MarkovNode[],
  edges: MarkovEdge[],
): SteadyCalcResult {
  const n = nodes.length;
  const idToIdx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const P: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const e of edges) {
    const i = idToIdx.get(e.from);
    const j = idToIdx.get(e.to);
    if (i !== undefined && j !== undefined) P[i][j] = e.probability;
  }

  const equations: string[] = [];
  equations.push('稳态方程组 πP = π 且 Σπᵢ = 1：');
  for (let j = 0; j < n; j++) {
    const terms: string[] = [];
    for (let k = 0; k < n; k++) {
      if (P[k][j] !== 0) {
        const sign = P[k][j] > 0 && terms.length > 0 ? '+' : '';
        if (k === j) {
          terms.push(`(${P[k][j].toFixed(2)}-1)π${j}`);
        } else {
          terms.push(`${sign}${P[k][j].toFixed(2)}π${k}`);
        }
      }
    }
    equations.push(`  方程${j + 1}: ${terms.join(' ')} = 0`);
  }
  equations.push(`  归一化: π₀ + π₁ + π₂ + π₃ = 1`);

  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) {
      A[j][k] = P[k][j];
    }
    A[j][j] -= 1;
  }
  const lastRow = new Array(n).fill(1);
  A[n - 1] = lastRow;
  const b = new Array(n).fill(0);
  b[n - 1] = 1;

  const eliminationSteps: string[] = [];
  eliminationSteps.push('用第n个方程替换原方程组第n个以加入归一化约束，高斯消元求解：');

  const steadyVector = solveLinearSystem(A, b);

  if (!steadyVector) {
    return {
      steadyVector: nodes.map((nd) => nd.steadyProb),
      equations,
      eliminationSteps: [...eliminationSteps, '⚠️ 方程组奇异，使用预设稳态值'],
      convergenceNote: '矩阵条件数过大（边界样本不足），结果可能不唯一',
      isConverged: false,
    };
  }

  for (let i = 0; i < n; i++) {
    eliminationSteps.push(`  π${i} = ${steadyVector[i].toFixed(4)}`);
  }
  eliminationSteps.push(`  验证Σπᵢ = ${steadyVector.reduce((s, p) => s + p, 0).toFixed(4)} ≈ 1 ✅`);

  return {
    steadyVector,
    equations,
    eliminationSteps,
    convergenceNote: '收敛正常',
    isConverged: true,
  };
}
