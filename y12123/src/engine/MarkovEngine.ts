import type { MemberBehavior, Transition, CalculationConfig, MemberState } from '../types';

export class MarkovEngine {
  private config: CalculationConfig;
  private transitionCounts: Map<string, number> = new Map();
  private stateCounts: Map<MemberState, number> = new Map();
  private confidenceLevel: number = 1;

  constructor(config: CalculationConfig) {
    this.config = config;
  }

  calculate(behaviors: MemberBehavior[], coldStartApplied: boolean): {
    matrix: Transition[][];
    stateDistribution: Record<MemberState, number>;
    iterationCount: number;
    confidenceLevel: number;
  } {
    this.countTransitions(behaviors);

    const matrix = this.buildTransitionMatrix();
    const stateDistribution = this.calculateStateDistribution(behaviors);

    const { converged, iterationCount } = this.iterateToConvergence(matrix);
    if (converged) {
      for (let i = 0; i < this.config.states.length; i++) {
        for (let j = 0; j < this.config.states.length; j++) {
          matrix[i][j] = converged[i][j];
        }
      }
    }

    const uniqueMembers = new Set(behaviors.filter(b => !b.memberId.startsWith('synth_')).map(b => b.memberId)).size;
    this.confidenceLevel = coldStartApplied
      ? Math.max(0.3, uniqueMembers / this.config.coldStartSampleSize)
      : Math.min(1, Math.sqrt(uniqueMembers / 100));

    return {
      matrix,
      stateDistribution,
      iterationCount,
      confidenceLevel: this.confidenceLevel,
    };
  }

  calculateChurnProbability(
    matrix: Transition[][],
    initialState: MemberState,
    steps: number = 30
  ): number {
    const stateIndex = this.config.states.indexOf(initialState);
    const churnIndex = this.config.states.indexOf('churned');

    if (stateIndex === -1 || churnIndex === -1) return 0;

    let stateVector = new Array(this.config.states.length).fill(0);
    stateVector[stateIndex] = 1;

    for (let step = 0; step < steps; step++) {
      const newVector = new Array(this.config.states.length).fill(0);
      for (let i = 0; i < this.config.states.length; i++) {
        for (let j = 0; j < this.config.states.length; j++) {
          newVector[j] += stateVector[i] * matrix[i][j].probability;
        }
      }
      stateVector = newVector;
    }

    return stateVector[churnIndex];
  }

  calculateAllChurnProbabilities(
    matrix: Transition[][],
    behaviors: MemberBehavior[],
    steps: number = 30
  ): Record<string, number> {
    const memberStates = this.getCurrentStates(behaviors);
    const probabilities: Record<string, number> = {};

    Object.entries(memberStates).forEach(([memberId, state]) => {
      if (!memberId.startsWith('synth_')) {
        probabilities[memberId] = this.calculateChurnProbability(matrix, state, steps);
      }
    });

    return probabilities;
  }

  getConfidenceLevel(): number {
    return this.confidenceLevel;
  }

  private countTransitions(behaviors: MemberBehavior[]): void {
    this.transitionCounts.clear();
    this.stateCounts.clear();

    const memberBehaviors = this.groupByMember(behaviors);

    Object.values(memberBehaviors).forEach(records => {
      const sorted = records.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 0; i < sorted.length; i++) {
        const state = sorted[i].state;
        this.stateCounts.set(state, (this.stateCounts.get(state) || 0) + 1);

        if (i < sorted.length - 1) {
          const key = `${sorted[i].state}->${sorted[i + 1].state}`;
          this.transitionCounts.set(key, (this.transitionCounts.get(key) || 0) + 1);
        }
      }
    });
  }

  private buildTransitionMatrix(): Transition[][] {
    const { states } = this.config;
    const matrix: Transition[][] = [];

    for (let i = 0; i < states.length; i++) {
      matrix[i] = [];
      const fromState = states[i];
      const totalFrom = this.stateCounts.get(fromState) || 0;

      for (let j = 0; j < states.length; j++) {
        const toState = states[j];
        const key = `${fromState}->${toState}`;
        const count = this.transitionCounts.get(key) || 0;

        let probability = 0;
        if (totalFrom > 0) {
          probability = count / totalFrom;
        }

        if (probability === 0 && totalFrom === 0) {
          probability = this.getPriorProbability(fromState, toState);
        }

        matrix[i][j] = {
          from: fromState,
          to: toState,
          count,
          probability,
        };
      }

      const rowSum = matrix[i].reduce((sum, t) => sum + t.probability, 0);
      if (rowSum > 0 && Math.abs(rowSum - 1) > 0.001) {
        matrix[i] = matrix[i].map(t => ({
          ...t,
          probability: t.probability / rowSum,
        }));
      }
    }

    return matrix;
  }

  private getPriorProbability(from: MemberState, to: MemberState): number {
    const priors: Record<MemberState, Partial<Record<MemberState, number>>> = {
      active: { active: 0.6, inactive: 0.25, dormant: 0.1, recalled: 0.05 },
      inactive: { active: 0.2, inactive: 0.4, dormant: 0.3, churned: 0.1 },
      dormant: { active: 0.1, dormant: 0.45, churned: 0.35, recalled: 0.1 },
      churned: { churned: 0.85, recalled: 0.15 },
      recalled: { active: 0.4, inactive: 0.3, recalled: 0.3 },
    };

    return priors[from]?.[to] || 0;
  }

  private iterateToConvergence(
    matrix: Transition[][],
    epsilon: number = 1e-6
  ): { converged: Transition[][] | null; iterationCount: number } {
    const n = this.config.states.length;
    let current = this.matrixToNumbers(matrix);
    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      const next = this.multiplyMatrices(current, current);
      const diff = this.matrixDiff(current, next);

      if (diff < epsilon) {
        return {
          converged: this.numbersToTransition(next, matrix),
          iterationCount: iteration + 1,
        };
      }

      current = next;
      iteration++;
    }

    return { converged: null, iterationCount: this.config.maxIterations };
  }

  private matrixToNumbers(matrix: Transition[][]): number[][] {
    return matrix.map(row => row.map(t => t.probability));
  }

  private numbersToTransition(numbers: number[][], template: Transition[][]): Transition[][] {
    return numbers.map((row, i) =>
      row.map((prob, j) => ({
        ...template[i][j],
        probability: prob,
      }))
    );
  }

  private multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const n = a.length;
    const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }

    return result;
  }

  private matrixDiff(a: number[][], b: number[][]): number {
    let maxDiff = 0;
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a[i].length; j++) {
        maxDiff = Math.max(maxDiff, Math.abs(a[i][j] - b[i][j]));
      }
    }
    return maxDiff;
  }

  private calculateStateDistribution(behaviors: MemberBehavior[]): Record<MemberState, number> {
    const distribution: Record<MemberState, number> = {
      active: 0,
      inactive: 0,
      dormant: 0,
      churned: 0,
      recalled: 0,
    };

    const currentStates = this.getCurrentStates(behaviors);
    Object.values(currentStates).forEach(state => {
      distribution[state]++;
    });

    return distribution;
  }

  private getCurrentStates(behaviors: MemberBehavior[]): Record<string, MemberState> {
    const memberBehaviors = this.groupByMember(behaviors);
    const states: Record<string, MemberState> = {};

    Object.entries(memberBehaviors).forEach(([memberId, records]) => {
      const sorted = records.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      if (sorted.length > 0) {
        states[memberId] = sorted[0].state;
      }
    });

    return states;
  }

  private groupByMember(behaviors: MemberBehavior[]): Record<string, MemberBehavior[]> {
    return behaviors.reduce((acc, b) => {
      if (!acc[b.memberId]) {
        acc[b.memberId] = [];
      }
      acc[b.memberId].push(b);
      return acc;
    }, {} as Record<string, MemberBehavior[]>);
  }
}
