import type { MemberBehavior, CalculationConfig, CalculationResult } from '../types';
import { DataCleaner } from './DataCleaner';
import { MarkovEngine } from './MarkovEngine';
import { PriorityEngine } from './PriorityEngine';

export class CalculationService {
  private config: CalculationConfig;

  constructor(config: CalculationConfig) {
    this.config = config;
  }

  calculate(behaviors: MemberBehavior[]): CalculationResult {
    const startTime = performance.now();
    const failureReasons: string[] = [];

    const dataCleaner = new DataCleaner(this.config);
    const { cleaned, anomalies, coldStartApplied } = dataCleaner.clean(behaviors);

    if (cleaned.length === 0) {
      failureReasons.push('没有有效数据可用于计算');
    }

    const markovEngine = new MarkovEngine(this.config);
    const { matrix, stateDistribution, iterationCount, confidenceLevel } = markovEngine.calculate(
      cleaned,
      coldStartApplied
    );

    const churnProbabilities = markovEngine.calculateAllChurnProbabilities(matrix, cleaned);

    if (Object.keys(churnProbabilities).length === 0) {
      failureReasons.push('无法计算任何会员的流失概率');
    }

    const priorityEngine = new PriorityEngine(this.config);
    const recallPriorities = priorityEngine.calculatePriorities(
      churnProbabilities,
      cleaned,
      anomalies
    );

    if (recallPriorities.length === 0) {
      failureReasons.push('无法生成召回优先级列表');
    }

    const totalMembers = new Set(
      cleaned.filter(b => !b.memberId.startsWith('synth_')).map(b => b.memberId)
    ).size;

    const validTransitions = matrix.flat().reduce((sum, t) => sum + t.count, 0);
    const invalidTransitions = anomalies.filter(a => a.type === 'invalid_transition').length;

    const calculationTime = performance.now() - startTime;

    return {
      transitionMatrix: matrix,
      churnProbabilities,
      recallPriorities,
      anomalies,
      stateDistribution,
      metadata: {
        totalMembers,
        validTransitions,
        invalidTransitions,
        coldStartApplied,
        calculationTime,
        unit: '概率(0-1)',
        applicableScope: this.getApplicableScope(totalMembers, coldStartApplied, confidenceLevel),
        failureReasons,
        confidenceLevel,
        iterationCount,
      },
    };
  }

  private getApplicableScope(
    totalMembers: number,
    coldStartApplied: boolean,
    confidenceLevel: number
  ): string {
    const scopes: string[] = [];

    scopes.push(`分析会员数：${totalMembers}人`);
    scopes.push(`时间窗口：近${this.config.timeWindowDays}天`);

    if (coldStartApplied) {
      scopes.push(`冷启动模式：已应用行业基准先验，置信度${(confidenceLevel * 100).toFixed(0)}%`);
    } else {
      scopes.push(`置信度：${(confidenceLevel * 100).toFixed(0)}%`);
    }

    if (confidenceLevel >= 0.8) {
      scopes.push('适用场景：可直接用于运营决策');
    } else if (confidenceLevel >= 0.5) {
      scopes.push('适用场景：建议结合人工判断后使用');
    } else {
      scopes.push('适用场景：仅供参考，需积累更多数据');
    }

    if (this.config.weights.probability > 0.5) {
      scopes.push('权重倾向：流失概率优先');
    } else if (this.config.weights.value > 0.3) {
      scopes.push('权重倾向：会员价值优先');
    }

    return scopes.join('；');
  }
}
