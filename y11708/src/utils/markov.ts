import type { UserState, TransitionRecord, TransitionMatrix, PredictionResult } from '../types';

export function buildTransitionMatrix(
  states: UserState[],
  transitions: TransitionRecord[]
): TransitionMatrix {
  const n = states.length;
  const stateIndex = new Map(states.map((s, i) => [s.id, i]));
  
  const counts: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const sampleSizes: number[] = Array(n).fill(0);

  transitions.forEach(record => {
    const fromIdx = stateIndex.get(record.fromState);
    const toIdx = stateIndex.get(record.toState);
    if (fromIdx !== undefined && toIdx !== undefined) {
      counts[fromIdx][toIdx] += record.count;
      sampleSizes[fromIdx] += record.count;
    }
  });

  const matrix: number[][] = counts.map((row, i) => {
    const total = sampleSizes[i];
    if (total === 0) return Array(n).fill(0);
    return row.map(count => count / total);
  });

  return { states, matrix, counts, sampleSizes };
}

export function normalizeMatrix(matrix: number[][]): number[][] {
  return matrix.map(row => {
    const total = row.reduce((a, b) => a + b, 0);
    if (total === 0) return row.map(() => 0);
    return row.map(val => val / total);
  });
}

export function predictNextState(
  currentDistribution: number[],
  transitionMatrix: number[][]
): number[] {
  const n = currentDistribution.length;
  const next: number[] = Array(n).fill(0);
  
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      next[j] += currentDistribution[i] * transitionMatrix[i][j];
    }
  }
  
  return next;
}

export function predictNStates(
  initialDistribution: number[],
  transitionMatrix: number[][],
  months: number
): number[][] {
  const results: number[][] = [initialDistribution];
  let current = [...initialDistribution];
  
  for (let m = 0; m < months; m++) {
    current = predictNextState(current, transitionMatrix);
    results.push([...current]);
  }
  
  return results;
}

export function calculateSteadyState(transitionMatrix: number[][]): number[] | null {
  const n = transitionMatrix.length;
  
  const A: number[][] = [];
  const b: number[] = [];
  
  for (let j = 0; j < n; j++) {
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i === j) {
        row.push(transitionMatrix[i][j] - 1);
      } else {
        row.push(transitionMatrix[i][j]);
      }
    }
    A.push(row);
    b.push(0);
  }
  
  A.push(Array(n).fill(1));
  b.push(1);
  
  try {
    return solveLinearSystem(A, b);
  } catch {
    return null;
  }
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  for (let i = 0; i < Math.min(n, A[0].length); i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) continue;
    
    for (let j = i; j <= A[0].length; j++) {
      augmented[i][j] /= pivot;
    }
    
    for (let k = 0; k < n; k++) {
      if (k !== i && Math.abs(augmented[k][i]) > 1e-10) {
        const factor = augmented[k][i];
        for (let j = i; j <= A[0].length; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  const result: number[] = [];
  for (let i = 0; i < A[0].length; i++) {
    result.push(augmented[i][A[0].length] || 0);
  }
  
  return result;
}

export function getConfidenceInterval(
  counts: number[][],
  sampleSizes: number[],
  confidence: number = 0.95
): [number, number][][] {
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  
  return counts.map((row, i) => {
    const n = sampleSizes[i];
    return row.map(k => {
      if (n === 0) return [0, 0];
      const p = k / n;
      const se = Math.sqrt(p * (1 - p) / n);
      return [Math.max(0, p - z * se), Math.min(1, p + z * se)];
    });
  });
}

export function generatePrediction(
  matrix: TransitionMatrix,
  initialDistribution: number[],
  targetMonth: string
): PredictionResult {
  const predicted = predictNextState(initialDistribution, matrix.matrix);
  
  const activeStates = matrix.states
    .filter(s => !s.isAbsorbing)
    .map(s => matrix.states.indexOf(s));
  
  const churnStates = matrix.states
    .filter(s => s.isAbsorbing)
    .map(s => matrix.states.indexOf(s));
  
  const activeRate = activeStates.reduce((sum, i) => sum + predicted[i], 0);
  const churnRate = churnStates.reduce((sum, i) => sum + predicted[i], 0);
  
  const explanation = generateExplanation(
    matrix,
    initialDistribution,
    predicted,
    activeRate,
    churnRate
  );
  
  return {
    month: targetMonth,
    initialDistribution,
    predictedDistribution: predicted,
    activeRate,
    churnRate,
    explanation
  };
}

function generateExplanation(
  matrix: TransitionMatrix,
  initial: number[],
  predicted: number[],
  activeRate: number,
  churnRate: number
): string {
  const explanations: string[] = [];
  
  explanations.push(`基于当前转移概率矩阵，下月预测活跃率为 ${(activeRate * 100).toFixed(1)}%，流失率为 ${(churnRate * 100).toFixed(1)}%。`);
  
  matrix.states.forEach((state, i) => {
    const change = predicted[i] - initial[i];
    const changePct = initial[i] > 0 ? (change / initial[i]) * 100 : 0;
    if (Math.abs(changePct) > 5) {
      const direction = change > 0 ? '上升' : '下降';
      explanations.push(`${state.name}状态占比将${direction} ${Math.abs(changePct).toFixed(1)}%。`);
    }
  });
  
  const maxRetention = Math.max(...matrix.matrix.map((row, i) => row[i]));
  const retentionIdx = matrix.matrix.findIndex((row, i) => row[i] === maxRetention);
  if (retentionIdx >= 0) {
    explanations.push(`${matrix.states[retentionIdx].name}状态留存率最高，达到 ${(maxRetention * 100).toFixed(1)}%，是核心稳定群体。`);
  }
  
  const maxTransition = Math.max(...matrix.matrix.flatMap((row, i) => 
    row.map((val, j) => i !== j ? val : 0)
  ));
  if (maxTransition > 0.3) {
    matrix.matrix.forEach((row, i) => {
      row.forEach((val, j) => {
        if (i !== j && val === maxTransition) {
          explanations.push(`从${matrix.states[i].name}向${matrix.states[j].name}的转化率最高（${(val * 100).toFixed(1)}%），可重点关注此转化路径。`);
        }
      });
    });
  }
  
  return explanations.join(' ');
}

export function getInitialDistribution(transitions: TransitionRecord[], states: UserState[]): number[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;
  
  transitions.forEach(t => {
    const current = totals.get(t.fromState) || 0;
    totals.set(t.fromState, current + t.count);
    grandTotal += t.count;
  });
  
  return states.map(s => {
    const total = totals.get(s.id) || 0;
    return grandTotal > 0 ? total / grandTotal : 0;
  });
}
