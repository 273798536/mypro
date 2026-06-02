import seedrandom from 'seedrandom';
import {
  MemberStatus,
  TransitionMatrix,
  PredictionConfig,
  PredictionResult,
  ValidationError,
  StatusHistory,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

const STATES: MemberStatus[] = ['new', 'active', 'silent', 'churned', 'resurrected'];

export class MarkovChain {
  private rng: seedrandom.PRNG;
  private seed: number;
  private version: string;
  private source: string;

  constructor(seed: number = 42, version: string = '1.0.0', source: string = 'markov-core') {
    this.seed = seed;
    this.rng = seedrandom(seed.toString());
    this.version = version;
    this.source = source;
  }

  validateTransitionMatrix(matrix: number[][]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (matrix.length !== STATES.length) {
      errors.push({
        field: 'matrix',
        message: `转移矩阵行数不正确: 期望 ${STATES.length}, 实际 ${matrix.length}`,
        value: matrix.length,
        suggestion: `矩阵必须包含 ${STATES.length} 行，对应状态: ${STATES.join(', ')}`
      });
      return errors;
    }

    matrix.forEach((row, i) => {
      if (row.length !== STATES.length) {
        errors.push({
          field: `matrix[${i}]`,
          message: `第 ${i} 行列数不正确: 期望 ${STATES.length}, 实际 ${row.length}`,
          value: row.length,
          suggestion: '每行必须包含与状态数相等的概率值'
        });
      }

      const rowSum = row.reduce((a, b) => a + b, 0);
      if (Math.abs(rowSum - 1) > 0.001) {
        errors.push({
          field: `matrix[${i}].sum`,
          message: `第 ${i} 行概率和不为 1: ${rowSum.toFixed(4)}`,
          value: rowSum,
          suggestion: '每行概率之和必须等于 1 (允许 ±0.001 误差)'
        });
      }

      row.forEach((prob, j) => {
        if (prob < 0 || prob > 1) {
          errors.push({
            field: `matrix[${i}][${j}]`,
            message: `概率值超出范围 [0, 1]: ${prob}`,
            value: prob,
            suggestion: '所有转移概率必须在 0 到 1 之间'
          });
        }
      });
    });

    return errors;
  }

  validateInitialDistribution(dist: number[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (dist.length !== STATES.length) {
      errors.push({
        field: 'initialDistribution',
        message: `初始分布长度不正确: 期望 ${STATES.length}, 实际 ${dist.length}`,
        value: dist.length,
        suggestion: `分布必须包含 ${STATES.length} 个值`
      });
      return errors;
    }

    const sum = dist.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.001) {
      errors.push({
        field: 'initialDistribution.sum',
        message: `初始分布和不为 1: ${sum.toFixed(4)}`,
        value: sum,
        suggestion: '分布概率之和必须等于 1'
      });
    }

    dist.forEach((p, i) => {
      if (p < 0) {
        errors.push({
          field: `initialDistribution[${i}]`,
          message: `概率值为负数: ${p}`,
          value: p,
          suggestion: '所有概率值必须非负'
        });
      }
    });

    return errors;
  }

  validateConfig(config: PredictionConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.periods < 1 || config.periods > 365) {
      errors.push({
        field: 'periods',
        message: `预测周期超出有效范围 [1, 365]: ${config.periods}`,
        value: config.periods,
        suggestion: '预测周期应在 1 到 365 天之间'
      });
    }

    if (config.seed < 0) {
      errors.push({
        field: 'seed',
        message: `随机种子不能为负数: ${config.seed}`,
        value: config.seed,
        suggestion: '请使用非负整数作为随机种子'
      });
    }

    errors.push(...this.validateInitialDistribution(config.initialDistribution));

    return errors;
  }

  calculateTransitionMatrix(statusHistory: StatusHistory[]): TransitionMatrix {
    const transitions: Record<string, Record<string, number>> = {};
    const counts: Record<string, number> = {};

    STATES.forEach(from => {
      transitions[from] = {};
      counts[from] = 0;
      STATES.forEach(to => {
        transitions[from][to] = 0;
      });
    });

    const sortedHistory = [...statusHistory].sort((a, b) => {
      if (a.memberId !== b.memberId) return a.memberId.localeCompare(b.memberId);
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    for (let i = 0; i < sortedHistory.length - 1; i++) {
      const current = sortedHistory[i];
      const next = sortedHistory[i + 1];

      if (current.memberId === next.memberId) {
        transitions[current.status][next.status]++;
        counts[current.status]++;
      }
    }

    const matrix: number[][] = STATES.map(from => {
      return STATES.map(to => {
        if (counts[from] === 0) {
          return from === to ? 1 : 0;
        }
        return transitions[from][to] / counts[from];
      });
    });

    const totalTransitions = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      states: STATES,
      matrix,
      sampleSize: totalTransitions,
      version: this.version,
      source: this.source,
      calculatedAt: new Date().toISOString(),
      seed: this.seed
    };
  }

  predict(matrix: TransitionMatrix, config: PredictionConfig): PredictionResult {
    const configErrors = this.validateConfig(config);
    if (configErrors.length > 0) {
      throw new Error(`配置验证失败: ${configErrors.map(e => e.message).join('; ')}`);
    }

    const matrixErrors = this.validateTransitionMatrix(matrix.matrix);
    if (matrixErrors.length > 0) {
      throw new Error(`转移矩阵验证失败: ${matrixErrors.map(e => e.message).join('; ')}`);
    }

    this.rng = seedrandom(config.seed.toString());

    const periods: MemberStatus[][] = [];
    const distributionHistory: number[][] = [config.initialDistribution.slice()];
    const churnProbability: number[] = [];
    const retentionRate: number[] = [];

    let currentDist = config.initialDistribution.slice();

    for (let period = 0; period < config.periods; period++) {
      const periodStates: MemberStatus[] = [];
      const sampleSize = 1000;

      for (let i = 0; i < sampleSize; i++) {
        let state = this.sampleFromDistribution(currentDist);
        periodStates.push(state);
      }

      periods.push(periodStates);

      const nextDist = this.multiplyVectorMatrix(currentDist, matrix.matrix);
      distributionHistory.push(nextDist);

      const churnIdx = STATES.indexOf('churned');
      churnProbability.push(nextDist[churnIdx]);
      retentionRate.push(1 - nextDist[churnIdx]);

      currentDist = nextDist;
    }

    return {
      id: uuidv4(),
      config,
      transitionMatrix: matrix,
      periods,
      distributionHistory,
      churnProbability,
      retentionRate,
      generatedAt: new Date().toISOString(),
      version: config.version,
      source: config.source
    };
  }

  private sampleFromDistribution(dist: number[]): MemberStatus {
    const r = this.rng();
    let cumulative = 0;

    for (let i = 0; i < dist.length; i++) {
      cumulative += dist[i];
      if (r < cumulative) {
        return STATES[i];
      }
    }

    return STATES[STATES.length - 1];
  }

  private multiplyVectorMatrix(vector: number[], matrix: number[][]): number[] {
    const result: number[] = new Array(STATES.length).fill(0);

    for (let j = 0; j < STATES.length; j++) {
      for (let i = 0; i < STATES.length; i++) {
        result[j] += vector[i] * matrix[i][j];
      }
    }

    return result;
  }

  calculateSteadyState(matrix: number[][]): number[] {
    const errors = this.validateTransitionMatrix(matrix);
    if (errors.length > 0) {
      throw new Error(`转移矩阵验证失败: ${errors.map(e => e.message).join('; ')}`);
    }

    let dist = new Array(STATES.length).fill(1 / STATES.length);
    const maxIter = 1000;
    const tolerance = 1e-10;

    for (let i = 0; i < maxIter; i++) {
      const nextDist = this.multiplyVectorMatrix(dist, matrix);
      const diff = nextDist.reduce((sum, val, idx) => sum + Math.abs(val - dist[idx]), 0);

      if (diff < tolerance) {
        return nextDist;
      }

      dist = nextDist;
    }

    return dist;
  }

  calculateMeanTimeToChurn(matrix: number[][]): number {
    const transientStates = STATES.filter(s => s !== 'churned');
    const n = transientStates.length;

    if (n === 0) return 0;

    const Q: number[][] = transientStates.map(from => {
      const fromIdx = STATES.indexOf(from);
      return transientStates.map(to => {
        const toIdx = STATES.indexOf(to);
        return matrix[fromIdx][toIdx];
      });
    });

    const I: number[][] = Array(n).fill(null).map((_, i) =>
      Array(n).fill(null).map((_, j) => i === j ? 1 : 0)
    );

    try {
      const N: number[][] = this.matrixInverse(this.matrixSubtract(I, Q));

      const ones = Array(n).fill(1);
      const mttc = this.multiplyVectorMatrixGeneric(ones, N);

      const activeIdx = transientStates.indexOf('active');
      return activeIdx >= 0 ? mttc[activeIdx] : mttc.reduce((a, b) => a + b, 0) / n;
    } catch {
      let totalSteps = 0;
      let samples = 0;
      for (let startIdx = 0; startIdx < n; startIdx++) {
        let current = startIdx;
        let steps = 0;
        while (current < n && steps < 1000) {
          const r = Math.random();
          let cumulative = 0;
          for (let next = 0; next < n; next++) {
            cumulative += Q[current][next];
            if (r < cumulative) {
              current = next;
              break;
            }
          }
          if (r >= cumulative) {
            break;
          }
          steps++;
        }
        totalSteps += steps;
        samples++;
      }
      return samples > 0 ? totalSteps / samples : 30;
    }
  }

  private multiplyVectorMatrixGeneric(vector: number[], matrix: number[][]): number[] {
    const n = matrix.length;
    const result: number[] = new Array(n).fill(0);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < vector.length; i++) {
        result[j] += vector[i] * matrix[i][j];
      }
    }

    return result;
  }

  private matrixSubtract(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val - B[i][j]));
  }

  private matrixInverse(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented: number[][] = matrix.map((row, i) =>
      [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]
    );

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(augmented[j][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = j;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i];
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = augmented[j][i];
          for (let k = i; k < 2 * n; k++) {
            augmented[j][k] -= factor * augmented[i][k];
          }
        }
      }
    }

    return augmented.map(row => row.slice(n));
  }

  getStates(): MemberStatus[] {
    return [...STATES];
  }

  getSeed(): number {
    return this.seed;
  }
}
