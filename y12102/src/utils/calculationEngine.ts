import {
  Judge,
  Supplier,
  ScoreCategory,
  Score,
  CalculationResult,
  ConsistencyResult,
  SensitivityResult,
  WeightedScore,
} from '../types';

export function calculateWeightedScores(
  judges: Judge[],
  suppliers: Supplier[],
  categories: ScoreCategory[],
  scores: Score[]
): { results: CalculationResult[]; normalizedWeights: Map<string, number> } {
  const weightSum = categories.reduce((sum, cat) => sum + cat.weight, 0);
  const normalizedWeights = new Map<string, number>();
  categories.forEach((cat) => {
    normalizedWeights.set(cat.id, cat.weight / weightSum);
  });

  const results: CalculationResult[] = suppliers.map((supplier) => {
    const weightedScores: WeightedScore[] = categories.map((category) => {
      const categoryScores = scores.filter(
        (s) => s.supplierId === supplier.id && s.categoryId === category.id && s.value !== null
      );
      const validScores = categoryScores.filter((s) => s.value !== null) as Score[];
      const avgScore =
        validScores.length > 0
          ? validScores.reduce((sum, s) => sum + (s.value as number), 0) / validScores.length
          : 0;

      const normalizedWeight = normalizedWeights.get(category.id) || 0;
      return {
        categoryId: category.id,
        score: avgScore,
        weight: category.weight,
        normalizedWeight,
      };
    });

    const totalScore = weightedScores.reduce(
      (sum, ws) => sum + ws.score * ws.normalizedWeight,
      0
    );

    const calculationTrace = generateCalculationTrace(supplier.id, categories, scores, weightedScores, judges);

    return {
      supplierId: supplier.id,
      totalScore,
      weightedScores,
      rank: 0,
      calculationTrace,
    };
  });

  results.sort((a, b) => b.totalScore - a.totalScore);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return { results, normalizedWeights };
}

function generateCalculationTrace(
  supplierId: string,
  categories: ScoreCategory[],
  scores: Score[],
  weightedScores: WeightedScore[],
  judges: Judge[]
): string[] {
  const trace: string[] = [];

  trace.push(`【供应商 ${supplierId} 评分计算追溯】`);
  trace.push('='.repeat(50));

  categories.forEach((category) => {
    const categoryScores = scores.filter(
      (s) => s.supplierId === supplierId && s.categoryId === category.id
    );
    const validScores = categoryScores.filter((s) => s.value !== null) as Score[];
    const avgScore =
      validScores.length > 0
        ? validScores.reduce((sum, s) => sum + (s.value as number), 0) / validScores.length
        : 0;

    trace.push(`\n【${category.name}】`);
    trace.push(`  评分范围: ${category.range[0]} - ${category.range[1]} ${category.unit}`);
    trace.push(`  原始权重: ${category.weight}`);

    validScores.forEach((s) => {
      const judge = judges.find((j) => j.id === s.judgeId);
      trace.push(`  - ${judge?.name || s.judgeId}: ${s.value} ${category.unit} (${s.timestamp})`);
    });

    const missingCount = categoryScores.filter((s) => s.value === null).length;
    if (missingCount > 0) {
      trace.push(`  ⚠️  缺项: ${missingCount} 名评委未打分`);
    }

    trace.push(`  评委平均分: ${avgScore.toFixed(2)} ${category.unit}`);

    const ws = weightedScores.find((w) => w.categoryId === category.id);
    if (ws) {
      trace.push(`  归一化权重: ${ws.normalizedWeight.toFixed(4)}`);
      trace.push(`  加权得分: ${avgScore.toFixed(2)} × ${ws.normalizedWeight.toFixed(4)} = ${(avgScore * ws.normalizedWeight).toFixed(4)}`);
    }
  });

  const totalScore = weightedScores.reduce(
    (sum, ws) => sum + ws.score * ws.normalizedWeight,
    0
  );
  trace.push(`\n【最终得分】`);
  trace.push(`  总分 = ${weightedScores.map((ws) => `${(ws.score * ws.normalizedWeight).toFixed(2)}`).join(' + ')}`);
  trace.push(`  总分 = ${totalScore.toFixed(4)} 分`);

  return trace;
}

export function checkConsistency(
  judges: Judge[],
  suppliers: Supplier[],
  categories: ScoreCategory[],
  scores: Score[]
): ConsistencyResult {
  const weightSum = categories.reduce((sum, cat) => sum + cat.weight, 0);
  const isNormalized = Math.abs(weightSum - 1.0) < 0.001;

  const missingScores = scores.filter((s) => s.value === null);
  const missingDetails = missingScores.map((s) => ({
    judgeId: s.judgeId,
    supplierId: s.supplierId,
    categoryId: s.categoryId,
  }));

  const cronbachAlpha = calculateCronbachAlpha(judges, suppliers, categories, scores);
  const cronbachStatus = cronbachAlpha >= 0.8 ? 'pass' : cronbachAlpha >= 0.7 ? 'warning' : 'fail';
  const cronbachReason =
    cronbachAlpha >= 0.8
      ? `Cronbach's α = ${cronbachAlpha.toFixed(4)} ≥ 0.8，评委间一致性良好`
      : cronbachAlpha >= 0.7
      ? `Cronbach's α = ${cronbachAlpha.toFixed(4)}，在 0.7-0.8 之间，一致性可接受但需关注`
      : `Cronbach's α = ${cronbachAlpha.toFixed(4)} < 0.7，一致性较差，建议重新评审`;

  const kendallW = calculateKendallW(judges, suppliers, scores);
  const kendallStatus = kendallW >= 0.7 ? 'pass' : kendallW >= 0.4 ? 'warning' : 'fail';
  const kendallReason =
    kendallW >= 0.7
      ? `Kendall W = ${kendallW.toFixed(4)} ≥ 0.7，评委排名高度一致`
      : kendallW >= 0.4
      ? `Kendall W = ${kendallW.toFixed(4)}，在 0.4-0.7 之间，中度一致`
      : `Kendall W = ${kendallW.toFixed(4)} < 0.4，排名一致性较低，存在较大分歧`;

  const { extremeJudges, extremeReasons } = detectExtremeJudges(judges, suppliers, categories, scores);

  return {
    cronbachAlpha,
    cronbachAlphaStatus: cronbachStatus,
    cronbachAlphaReason: cronbachReason,
    cronbachAlphaScope:
      '适用于3名及以上评委、评分项为连续数值的内部一致性检验。当α系数低时，表明评委评分标准差异较大，可能需要重新培训评委或调整评分项。',

    kendallCoefficient: kendallW,
    kendallStatus,
    kendallReason,
    kendallScope:
      '适用于衡量多名评委对被评对象排名一致性。当W系数偏低时，表明评委对供应商的优劣排序存在明显分歧，需重点讨论争议项目。',

    extremeJudges,
    extremeReasons,

    weightNormalization: {
      isNormalized,
      originalSum: weightSum,
      normalizedSum: 1.0,
      reason: isNormalized
        ? `权重和为 ${weightSum.toFixed(4)}，已正确归一化`
        : `权重和为 ${weightSum.toFixed(4)}，未归一化。系统将自动归一化后进行计算，但建议检查权重配置。`,
      scope:
        '权重归一化确保所有评分维度的权重之和为1（或100%）。未归一化的权重可能导致评分计算不符合预期，建议在配置阶段完成归一化设置。',
    },

    missingScores: {
      count: missingScores.length,
      details: missingDetails,
      reason:
        missingScores.length === 0
          ? '无缺项，所有评委已完成所有评分'
          : `发现 ${missingScores.length} 项缺项评分。缺项将在计算时被忽略，可能影响结果准确性`,
      scope:
        '打分缺项可能导致某些供应商在特定维度的样本量不足。建议缺项率不超过10%，超过时需补充评分或降低该维度权重。',
    },
  };
}

function calculateCronbachAlpha(
  judges: Judge[],
  suppliers: Supplier[],
  categories: ScoreCategory[],
  scores: Score[]
): number {
  const k = judges.length;
  if (k < 2) return 0;

  const judgeMeans: number[] = [];
  const allScores: number[][] = [];

  judges.forEach((judge) => {
    const judgeScores: number[] = [];
    suppliers.forEach((supplier) => {
      categories.forEach((category) => {
        const score = scores.find(
          (s) => s.judgeId === judge.id && s.supplierId === supplier.id && s.categoryId === category.id && s.value !== null
        );
        if (score) {
          judgeScores.push(score.value as number);
        }
      });
    });
    if (judgeScores.length > 0) {
      allScores.push(judgeScores);
      judgeMeans.push(judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length);
    }
  });

  if (allScores.length < 2) return 0;

  const minLength = Math.min(...allScores.map((s) => s.length));
  const itemVariance: number[] = [];

  for (let i = 0; i < minLength; i++) {
    const itemScores = allScores.map((s) => s[i]);
    const mean = itemScores.reduce((a, b) => a + b, 0) / itemScores.length;
    const variance = itemScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / itemScores.length;
    itemVariance.push(variance);
  }

  const totalVariance = itemVariance.reduce((a, b) => a + b, 0);
  const judgeTotalVariance = judgeMeans.length > 1
    ? judgeMeans.reduce((sum, mean) => sum + Math.pow(mean - judgeMeans.reduce((a, b) => a + b, 0) / judgeMeans.length, 2), 0) / judgeMeans.length
    : 0;

  if (totalVariance === 0) return 0;

  const alpha = (k / (k - 1)) * (1 - totalVariance / (totalVariance + judgeTotalVariance * k));
  return Math.max(0, Math.min(1, alpha));
}

function calculateKendallW(
  judges: Judge[],
  suppliers: Supplier[],
  scores: Score[]
): number {
  const m = judges.length;
  const n = suppliers.length;
  if (m < 2 || n < 2) return 0;

  const ranks: number[][] = [];

  judges.forEach((judge) => {
    const supplierScores: { supplierId: string; total: number }[] = suppliers.map((supplier) => {
      const judgeScores = scores.filter(
        (s) => s.judgeId === judge.id && s.supplierId === supplier.id && s.value !== null
      );
      const total = judgeScores.reduce((sum, s) => sum + (s.value as number), 0);
      return { supplierId: supplier.id, total };
    });

    supplierScores.sort((a, b) => b.total - a.total);
    const judgeRanks: number[] = [];
    suppliers.forEach((supplier) => {
      const rank = supplierScores.findIndex((s) => s.supplierId === supplier.id) + 1;
      judgeRanks.push(rank);
    });
    ranks.push(judgeRanks);
  });

  const rankSums: number[] = [];
  for (let i = 0; i < n; i++) {
    rankSums.push(ranks.reduce((sum, r) => sum + r[i], 0));
  }

  const meanRankSum = (m * (n + 1)) / 2;
  const s = rankSums.reduce((sum, r) => sum + Math.pow(r - meanRankSum, 2), 0);

  const w = (12 * s) / (Math.pow(m, 2) * (Math.pow(n, 3) - n));
  return Math.max(0, Math.min(1, w));
}

function detectExtremeJudges(
  judges: Judge[],
  suppliers: Supplier[],
  categories: ScoreCategory[],
  scores: Score[]
): { extremeJudges: string[]; extremeReasons: { [key: string]: string } } {
  const extremeJudges: string[] = [];
  const extremeReasons: { [key: string]: string } = {};

  judges.forEach((judge) => {
    const judgeScores: number[] = [];
    const otherScores: number[] = [];

    suppliers.forEach((supplier) => {
      categories.forEach((category) => {
        const jScore = scores.find(
          (s) => s.judgeId === judge.id && s.supplierId === supplier.id && s.categoryId === category.id && s.value !== null
        );

        const others = scores.filter(
          (s) => s.judgeId !== judge.id && s.supplierId === supplier.id && s.categoryId === category.id && s.value !== null
        );

        if (jScore && others.length > 0) {
          const othersMean = others.reduce((sum, s) => sum + (s.value as number), 0) / others.length;
          const othersStd = Math.sqrt(
            others.reduce((sum, s) => sum + Math.pow(s.value as number - othersMean, 2), 0) / others.length
          );

          judgeScores.push(jScore.value as number);
          otherScores.push(othersMean);

          if (othersStd > 0) {
            const zScore = Math.abs((jScore.value as number - othersMean) / othersStd);
            if (zScore > 2.5) {
              if (!extremeJudges.includes(judge.id)) {
                extremeJudges.push(judge.id);
              }
              const categoryName = categories.find((c) => c.id === category.id)?.name || category.id;
              const supplierName = suppliers.find((s) => s.id === supplier.id)?.name || supplier.id;
              extremeReasons[judge.id] = (extremeReasons[judge.id] || '') +
                `在【${supplierName}】-【${categoryName}】项打分 ${jScore.value} 与其他评委均值 ${othersMean.toFixed(1)} 的Z值为 ${zScore.toFixed(2)}（>2.5），偏离显著；`;
            }
          }
        }
      });
    });
  });

  return { extremeJudges, extremeReasons };
}

export function calculateSensitivity(
  judges: Judge[],
  suppliers: Supplier[],
  categories: ScoreCategory[],
  scores: Score[],
  baseResults: CalculationResult[]
): SensitivityResult {
  const weightImpact = categories.map((category) => {
    const modifiedCategories = categories.map((c) =>
      c.id === category.id ? { ...c, weight: c.weight * 1.1 } : c
    );
    const { results: modifiedResults } = calculateWeightedScores(judges, suppliers, modifiedCategories, scores);

    let totalImpact = 0;
    baseResults.forEach((base, idx) => {
      const modified = modifiedResults.find((r) => r.supplierId === base.supplierId);
      if (modified) {
        totalImpact += Math.abs(modified.totalScore - base.totalScore);
      }
    });

    return {
      categoryId: category.id,
      categoryName: category.name,
      impact: totalImpact,
      change: 0.1,
    };
  });

  weightImpact.sort((a, b) => b.impact - a.impact);

  const scoreVolatility = suppliers.map((supplier) => {
    const supplierScores = scores.filter(
      (s) => s.supplierId === supplier.id && s.value !== null
    ) as Score[];
    const values = supplierScores.map((s) => s.value as number);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      volatility: stdDev / mean,
      standardDeviation: stdDev,
    };
  });

  const rankSensitivity = baseResults.slice(0, 5).map((result) => {
    const newRanks: number[] = [];
    for (let i = 0; i < 5; i++) {
      const modifiedScores = scores.map((s) => {
        if (s.supplierId === result.supplierId && s.value !== null) {
          return { ...s, value: (s.value as number) * (1 + (i - 2) * 0.02) };
        }
        return s;
      });
      const { results: modified } = calculateWeightedScores(judges, suppliers, categories, modifiedScores);
      const newRank = modified.find((r) => r.supplierId === result.supplierId)?.rank || 0;
      newRanks.push(newRank);
    }

    return {
      originalRank: result.rank,
      supplierId: result.supplierId,
      supplierName: suppliers.find((s) => s.id === result.supplierId)?.name || result.supplierId,
      rankChangeWith10PercentShift: newRanks,
    };
  });

  return { weightImpact, scoreVolatility, rankSensitivity };
}
