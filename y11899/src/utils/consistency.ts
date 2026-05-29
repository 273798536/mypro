import { WeightConfig, ScoredSupplier, ConsistencyReport, ConsistencyCheck } from '@/types';

export function runConsistencyCheck(
  weights: WeightConfig,
  scoredSuppliers: ScoredSupplier[],
  lastCalculatedWeights: WeightConfig | null,
  lastCalculatedScores: ScoredSupplier[] | null
): ConsistencyReport {
  const checks: ConsistencyCheck[] = [];

  const total = weights.price + weights.energyConsumption + weights.afterSales + weights.deliveryPeriod;
  checks.push({
    name: '权重总和校验',
    passed: total === 100,
    detail: total === 100
      ? `权重总和为 ${total}%，校验通过`
      : `权重总和为 ${total}%，应为 100%`,
  });

  if (lastCalculatedWeights) {
    const weightsMatch =
      weights.price === lastCalculatedWeights.price &&
      weights.energyConsumption === lastCalculatedWeights.energyConsumption &&
      weights.afterSales === lastCalculatedWeights.afterSales &&
      weights.deliveryPeriod === lastCalculatedWeights.deliveryPeriod;

    checks.push({
      name: '权重一致性校验',
      passed: weightsMatch,
      detail: weightsMatch
        ? '当前权重与最近一次计算使用的权重一致'
        : `当前权重 [${weights.price}, ${weights.energyConsumption}, ${weights.afterSales}, ${weights.deliveryPeriod}] 与最近计算权重 [${lastCalculatedWeights.price}, ${lastCalculatedWeights.energyConsumption}, ${lastCalculatedWeights.afterSales}, ${lastCalculatedWeights.deliveryPeriod}] 不一致，需重新计算`,
    });
  }

  if (lastCalculatedScores && scoredSuppliers.length > 0) {
    const currentIds = scoredSuppliers.map(s => s.quote.id).sort().join(',');
    const lastIds = lastCalculatedScores.map(s => s.quote.id).sort().join(',');
    const suppliersMatch = currentIds === lastIds;

    checks.push({
      name: '供应商数据一致性校验',
      passed: suppliersMatch,
      detail: suppliersMatch
        ? '当前供应商数据与最近一次计算一致'
        : '供应商数据已变更，需重新计算',
    });

    if (suppliersMatch) {
      const scoresMatch = scoredSuppliers.every((s, i) => {
        const last = lastCalculatedScores.find(ls => ls.quote.id === s.quote.id);
        if (!last) return false;
        return s.weightedScore === last.weightedScore && s.rank === last.rank;
      });

      checks.push({
        name: '评分排名一致性校验',
        passed: scoresMatch,
        detail: scoresMatch
          ? '当前评分排名与最近一次计算一致'
          : '评分或排名与最近一次计算不一致，可能权重已变更但未重新计算',
      });
    }
  }

  const allDimScoresValid = scoredSuppliers.every(s => {
    const ds = s.dimensionScores;
    return ds.price >= 0 && ds.energyConsumption >= 0 && ds.afterSales >= 0 && ds.deliveryPeriod >= 0;
  });
  checks.push({
    name: '维度评分有效性校验',
    passed: allDimScoresValid,
    detail: allDimScoresValid
      ? '所有维度评分均为非负数'
      : '存在负数维度评分，请检查原始数据',
  });

  return {
    passed: checks.every(c => c.passed),
    checks,
    timestamp: Date.now(),
  };
}
