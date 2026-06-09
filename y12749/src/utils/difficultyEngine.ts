import type {
  BatchReview,
  Conclusion,
  AnomalyItem,
  DifficultyParams,
  Problem,
  ScoreRecord,
  EmptySetItem,
  DifficultyCount,
  AnomalyCategory,
} from '@/types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function classifyDifficulty(score: number, params: DifficultyParams): 'easy' | 'medium' | 'hard' | null {
  if (score == null || isNaN(score)) return null;
  if (score >= params.easyMin && score <= params.easyMax) return 'easy';
  if (score >= params.mediumMin && score <= params.mediumMax) return 'medium';
  if (score >= params.hardMin && score <= params.hardMax) return 'hard';
  return null;
}

export function countDifficulties(problems: Problem[]): DifficultyCount {
  const valid = problems.filter(p => !p.isDuplicate && p.difficulty);
  return {
    easy: valid.filter(p => p.difficulty === 'easy').length,
    medium: valid.filter(p => p.difficulty === 'medium').length,
    hard: valid.filter(p => p.difficulty === 'hard').length,
  };
}

export function detectDuplicates(problems: Problem[], fields: string[]): Problem[] {
  const seen = new Map<string, Problem>();
  return problems.map(p => {
    const key = fields.map(f => (p as any)[f] ?? '').join('|').toLowerCase().trim();
    if (!key) return { ...p, isDuplicate: false, duplicateOf: undefined, duplicateReason: undefined };
    if (seen.has(key)) {
      const original = seen.get(key)!;
      return {
        ...p,
        isDuplicate: true,
        duplicateOf: original.id,
        duplicateReason: `与 ${original.code} 在字段 [${fields.join(', ')}] 上重复`,
      };
    }
    seen.set(key, p);
    return { ...p, isDuplicate: false, duplicateOf: undefined, duplicateReason: undefined };
  });
}

export function detectEmptySets(problems: Problem[], strategy: EmptySetItem['strategy'], defaultValue?: number): EmptySetItem[] {
  const items: EmptySetItem[] = [];
  problems.forEach(p => {
    if (p.score == null) {
      items.push({
        id: uid(),
        field: 'score',
        problemId: p.id,
        strategy,
        filledValue: strategy === 'fill' ? defaultValue : undefined,
        handledAt: new Date().toISOString(),
      });
    }
    if (!p.difficulty) {
      items.push({
        id: uid(),
        field: 'difficulty',
        problemId: p.id,
        strategy,
        handledAt: new Date().toISOString(),
      });
    }
  });
  return items;
}

export function detectAnomalyScores(scores: ScoreRecord[], mean: number, std: number): ScoreRecord[] {
  return scores.map(s => {
    if (std === 0) return { ...s, isAnomaly: false, anomalyReason: undefined };
    const z = Math.abs(s.score - mean) / std;
    if (z > 2) {
      return { ...s, isAnomaly: true, anomalyReason: `分数 ${s.score} 偏离均值 ${mean.toFixed(1)} 超过 2 倍标准差 (Z=${z.toFixed(2)})` };
    }
    return { ...s, isAnomaly: false, anomalyReason: undefined };
  });
}

export function computeMeanStd(values: number[]): { mean: number; std: number } {
  if (!values.length) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

export function generateConclusions(
  params: DifficultyParams,
  problems: Problem[],
  scores: ScoreRecord[],
  chartsMissing: string[],
  previousConclusions: Conclusion[] = [],
): Conclusion[] {
  const now = new Date().toISOString();
  const counts = countDifficulties(problems);
  const total = counts.easy + counts.medium + counts.hard || 1;
  const actual = {
    easy: counts.easy / total,
    medium: counts.medium / total,
    hard: counts.hard / total,
  };

  const validScores = scores.map(s => s.score);
  const { mean, std } = computeMeanStd(validScores);
  const dupCount = problems.filter(p => p.isDuplicate).length;
  const emptyCount = problems.filter(p => p.score == null || !p.difficulty).length;

  const chartMissingSet = new Set(chartsMissing);
  const chartAffectedKeys = ['easy_balance', 'medium_balance', 'hard_balance', 'overall_balance'];

  const conclusions: Conclusion[] = [];

  const pushConclusion = (
    key: string,
    title: string,
    value: string,
    passed: boolean,
    explanation: string,
    dataBasis: string,
    formula: string,
    speakingScript: string,
  ) => {
    const affected = chartAffectedKeys.includes(key) && chartMissingSet.size > 0;
    const previous = previousConclusions.find(c => c.key === key);
    conclusions.push({
      id: uid(),
      key,
      title,
      value,
      passed,
      explanation,
      dataBasis,
      formula,
      speakingScript,
      affectedByMissingCharts: affected,
      affectedChartNames: affected ? chartsMissing : [],
      historicalVersion: previous,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const easyGap = actual.easy - params.targetEasyRatio;
  pushConclusion(
    'easy_balance',
    '简单题占比',
    `${fmtPct(actual.easy)}（目标 ${fmtPct(params.targetEasyRatio)}）`,
    Math.abs(easyGap) <= 0.05,
    Math.abs(easyGap) <= 0.05
      ? '简单题实际占比与目标偏差在 ±5% 以内，处于可接受范围。'
      : `简单题占比${easyGap > 0 ? '超出' : '低于'}目标 ${fmtPct(Math.abs(easyGap))}，建议${easyGap > 0 ? '替换部分简单题为中/难题' : '增加简单题或降低部分中等题难度'}。`,
    `有效题目 ${total} 道，其中简单题 ${counts.easy} 道`,
    `简单题占比 = 简单题数 / 有效题总数 = ${counts.easy} / ${total}`,
    `本轮简单题占 ${fmtPct(actual.easy)}，与目标 ${fmtPct(params.targetEasyRatio)} 的差距是 ${fmtPct(Math.abs(easyGap))}，${Math.abs(easyGap) <= 0.05 ? '符合均衡要求' : '需要调整'}。`,
  );

  const mediumGap = actual.medium - params.targetMediumRatio;
  pushConclusion(
    'medium_balance',
    '中等题占比',
    `${fmtPct(actual.medium)}（目标 ${fmtPct(params.targetMediumRatio)}）`,
    Math.abs(mediumGap) <= 0.05,
    Math.abs(mediumGap) <= 0.05
      ? '中等题实际占比与目标偏差在 ±5% 以内，处于可接受范围。'
      : `中等题占比${mediumGap > 0 ? '超出' : '低于'}目标 ${fmtPct(Math.abs(mediumGap))}，建议做相应调整。`,
    `有效题目 ${total} 道，其中中等题 ${counts.medium} 道`,
    `中等题占比 = 中等题数 / 有效题总数 = ${counts.medium} / ${total}`,
    `本轮中等题占 ${fmtPct(actual.medium)}，目标是 ${fmtPct(params.targetMediumRatio)}，差距 ${fmtPct(Math.abs(mediumGap))}。`,
  );

  const hardGap = actual.hard - params.targetHardRatio;
  pushConclusion(
    'hard_balance',
    '难题占比',
    `${fmtPct(actual.hard)}（目标 ${fmtPct(params.targetHardRatio)}）`,
    Math.abs(hardGap) <= 0.05,
    Math.abs(hardGap) <= 0.05
      ? '难题实际占比与目标偏差在 ±5% 以内，处于可接受范围。'
      : `难题占比${hardGap > 0 ? '超出' : '低于'}目标 ${fmtPct(Math.abs(hardGap))}，建议${hardGap > 0 ? '降低部分题目难度' : '补充难题素材'}。`,
    `有效题目 ${total} 道，其中难题 ${counts.hard} 道`,
    `难题占比 = 难题数 / 有效题总数 = ${counts.hard} / ${total}`,
    `本轮难题占 ${fmtPct(actual.hard)}，目标 ${fmtPct(params.targetHardRatio)}，差距 ${fmtPct(Math.abs(hardGap))}。`,
  );

  const overallPassed = Math.abs(easyGap) <= 0.05 && Math.abs(mediumGap) <= 0.05 && Math.abs(hardGap) <= 0.05;
  pushConclusion(
    'overall_balance',
    '整体难度均衡',
    overallPassed ? '通过' : '待调整',
    overallPassed,
    overallPassed
      ? '三个难度档的占比均落在目标 ±5% 容差内，整卷难度均衡达标。'
      : '至少一个难度档的占比超出容差范围，需在题目清单中做针对性替换或调整。',
    `简单偏差 ${fmtPct(Math.abs(easyGap))}，中等偏差 ${fmtPct(Math.abs(mediumGap))}，难题偏差 ${fmtPct(Math.abs(hardGap))}`,
    '均衡通过 = 各难度档 |实际占比 - 目标占比| ≤ 5%',
    overallPassed
      ? '三个难度档都在目标范围内，这份题目的难度分布是均衡的，可以进入下一个环节。'
      : '整体均衡未达标，需要调整题目结构，让各档占比回到目标附近。',
  );

  pushConclusion(
    'score_distribution',
    '分数分布稳定性',
    `均值 ${mean.toFixed(1)}，标准差 ${std.toFixed(2)}`,
    std > 0 && std < mean * 0.5,
    std === 0
      ? '所有评分完全一致，可能存在打分同质化问题，建议复核评分记录。'
      : std < mean * 0.5
        ? '评分标准差在合理范围，分数离散度正常。'
        : '评分标准差偏大，分数波动较明显，需检查评分口径是否一致。',
    `共 ${scores.length} 条评分记录，均值 ${mean.toFixed(1)}`,
    `均值 = Σ分数 / N，标准差 = √(Σ(分数-均值)² / N)`,
    `这次评分的平均分是 ${mean.toFixed(1)} 分，标准差 ${std.toFixed(2)}，${std < mean * 0.5 ? '说明评分相对稳定' : '说明评分差异比较大，可能需要统一打分标准'}。`,
  );

  pushConclusion(
    'duplicate_control',
    '重复样本拦截',
    `拦截 ${dupCount} 条重复题目`,
    dupCount === 0,
    dupCount === 0
      ? '未检测到重复样本，题目清单干净。'
      : `检测到 ${dupCount} 条重复题目，已标记并从难度统计中剔除，请确认是否真的重复。`,
    `共录入 ${problems.length} 道题目，重复判定字段：${params.duplicateDetectionFields.join('、')}`,
    '重复判定：按配置字段对题目做等值匹配，后出现者视为重复',
    dupCount === 0
      ? '这批题目没有重复，可以直接用于难度统计。'
      : `我们拦下来了 ${dupCount} 道重复题，它们是按 ${params.duplicateDetectionFields.join('、')} 匹配出来的，剔除后再算难度才准确。`,
  );

  pushConclusion(
    'empty_set',
    '空集合处理',
    `检测到 ${emptyCount} 条空值记录`,
    emptyCount === 0,
    emptyCount === 0
      ? '题目清单和评分记录无空值，无需特殊处理。'
      : `有 ${emptyCount} 条数据存在空字段，已按"${params.emptySetStrategy === 'skip' ? '跳过' : params.emptySetStrategy === 'warn' ? '告警' : '填充默认值'}"策略处理，请关注空集合面板。`,
    `题目总数 ${problems.length}，空分数 ${problems.filter(p => p.score == null).length}，空难度 ${problems.filter(p => !p.difficulty).length}`,
    `空集合策略：${params.emptySetStrategy}${params.emptySetStrategy === 'fill' ? `，默认值 ${params.emptySetDefaultValue}` : ''}`,
    emptyCount === 0
      ? '数据完整性没问题，没有空字段。'
      : `有 ${emptyCount} 条记录缺了分数或难度，系统按约定策略处理了，需要的话可以到空集合面板查看明细。`,
  );

  return conclusions;
}

export function classifyAnomalies(
  problems: Problem[],
  scores: ScoreRecord[],
  emptySets: EmptySetItem[],
  chartsMissing: string[],
): AnomalyItem[] {
  const result: AnomalyItem[] = [];
  const now = new Date().toISOString();

  problems.filter(p => p.isDuplicate).forEach(p => {
    result.push({
      id: uid(),
      category: 'need_material' as AnomalyCategory,
      title: `重复样本：${p.code}`,
      description: p.duplicateReason || '检测到与已有题目重复',
      nextStep: '确认是否重复；若为新题请补充唯一标识字段；若确属重复则移除此题。',
      relatedProblemIds: [p.id, p.duplicateOf!].filter(Boolean),
      resolved: false,
    });
  });

  problems.filter(p => p.score == null).forEach(p => {
    result.push({
      id: uid(),
      category: 'need_material' as AnomalyCategory,
      title: `缺失评分：${p.code}`,
      description: `题目《${p.title}》暂无评分记录，难度无法归类。`,
      nextStep: '尽快补录该题的平均分或难度标签；若暂无法获取，可在参数表中使用"填充默认值"策略。',
      relatedProblemIds: [p.id],
      resolved: false,
    });
  });

  scores.filter(s => s.isAnomaly).forEach(s => {
    result.push({
      id: uid(),
      category: 'need_criteria' as AnomalyCategory,
      title: `异常评分：答卷 ${s.respondentId}`,
      description: s.anomalyReason || '评分偏离统计分布',
      nextStep: '检查评分口径是否一致；若评分无误，考虑扩大样本量或调整标准差阈值。',
      relatedProblemIds: [s.problemId],
      resolved: false,
    });
  });

  if (chartsMissing.length > 0) {
    result.push({
      id: uid(),
      category: 'need_material' as AnomalyCategory,
      title: '图表截图未到齐',
      description: `以下图表尚未提交：${chartsMissing.join('、')}。`,
      nextStep: '向命题组催交图表截图；到齐后系统会自动刷新受影响结论并取消灰显。',
      relatedProblemIds: [],
      resolved: false,
    });
  }

  emptySets.filter(e => e.strategy === 'warn').forEach(e => {
    result.push({
      id: uid(),
      category: 'need_criteria' as AnomalyCategory,
      title: `空字段告警：${e.field}`,
      description: e.problemId ? `题目 ${e.problemId} 的 ${e.field} 字段为空` : `${e.field} 字段存在空值`,
      nextStep: '决定是否统一采用跳过或填充默认值策略；或在参数表中调整空集合处理方式。',
      relatedProblemIds: e.problemId ? [e.problemId] : [],
      resolved: false,
    });
  });

  result.forEach(r => (r as any).createdAt = now);
  return result;
}

export function buildInitialBatch(batchId: string): BatchReview {
  const now = new Date().toISOString();
  const params: DifficultyParams = {
    batchId,
    easyMin: 80,
    easyMax: 100,
    mediumMin: 55,
    mediumMax: 79,
    hardMin: 0,
    hardMax: 54,
    targetEasyRatio: 0.3,
    targetMediumRatio: 0.5,
    targetHardRatio: 0.2,
    duplicateDetectionFields: ['code', 'title'],
    emptySetStrategy: 'warn',
    emptySetDefaultValue: 65,
  };

  const rawProblems: Omit<Problem, 'id' | 'isDuplicate'>[] = [
    { code: 'M2025-01', title: '一元二次方程求解', difficulty: null, score: 92, tags: ['代数', '基础'], source: 'import' },
    { code: 'M2025-02', title: '线性方程组应用', difficulty: null, score: 68, tags: ['代数', '应用'], source: 'import' },
    { code: 'M2025-03', title: '几何证明-圆', difficulty: null, score: 42, tags: ['几何', '证明'], source: 'import' },
    { code: 'M2025-04', title: '函数单调性讨论', difficulty: null, score: 75, tags: ['分析', '函数'], source: 'import' },
    { code: 'M2025-05', title: '概率基础计算', difficulty: null, score: 88, tags: ['概率'], source: 'import' },
    { code: 'M2025-06', title: '数列求和综合', difficulty: null, score: 58, tags: ['代数', '数列'], source: 'import' },
    { code: 'M2025-07', title: '立体几何体积', difficulty: null, score: 50, tags: ['几何', '立体'], source: 'import' },
    { code: 'M2025-08', title: '三角函数变换', difficulty: null, score: 72, tags: ['三角'], source: 'import' },
    { code: 'M2025-09', title: '不等式证明', difficulty: null, score: 38, tags: ['代数', '证明'], source: 'import' },
    { code: 'M2025-10', title: '向量内积应用', difficulty: null, score: 81, tags: ['向量'], source: 'import' },
    { code: 'M2025-01', title: '一元二次方程求解', difficulty: null, score: 92, tags: ['代数', '基础'], source: 'import' },
    { code: 'M2025-11', title: '排列组合综合', difficulty: null, score: null, tags: ['组合'], source: 'manual' },
  ];

  const problems: Problem[] = detectDuplicates(
    rawProblems.map(p => ({ ...p, id: uid(), isDuplicate: false })),
    params.duplicateDetectionFields,
  ).map(p => ({
    ...p,
    difficulty: p.score != null ? classifyDifficulty(p.score, params) : null,
  }));

  const scores: ScoreRecord[] = [];
  problems.forEach(p => {
    if (p.score != null && !p.isDuplicate) {
      for (let i = 0; i < 5; i++) {
        const variation = Math.round((Math.random() - 0.5) * 18);
        const s = Math.max(0, Math.min(100, p.score + variation));
        scores.push({
          id: uid(),
          problemId: p.id,
          respondentId: `R${String(i + 1).padStart(2, '0')}`,
          score: i === 3 && p.code === 'M2025-03' ? 99 : s,
          timestamp: now,
          isAnomaly: false,
        });
      }
    }
  });

  const { mean, std } = computeMeanStd(scores.map(s => s.score));
  const scoresWithAnomaly = detectAnomalyScores(scores, mean, std);

  const emptySets = detectEmptySets(problems, params.emptySetStrategy, params.emptySetDefaultValue);

  const chartsAvailable = ['题目分布饼图', '分数分布直方图'];
  const chartsMissing = ['难度-知识点交叉热力图', '各难度区分度箱线图'];

  const conclusions = generateConclusions(params, problems, scoresWithAnomaly, chartsMissing, []);
  const anomalies = classifyAnomalies(problems, scoresWithAnomaly, emptySets, chartsMissing);

  return {
    batchId,
    createdAt: now,
    params,
    problems,
    scores: scoresWithAnomaly,
    emptySets,
    conclusions,
    anomalies,
    historicalAnswers: [],
    chartsAvailable,
    chartsMissing,
    status: 'chart_pending',
  };
}

export function recomputeBatch(batch: BatchReview): BatchReview {
  const problems = detectDuplicates(batch.problems, batch.params.duplicateDetectionFields).map(p => ({
    ...p,
    difficulty: p.score != null ? classifyDifficulty(p.score, batch.params) : p.difficulty,
  }));
  const { mean, std } = computeMeanStd(batch.scores.map(s => s.score));
  const scores = detectAnomalyScores(batch.scores, mean, std);
  const emptySets = detectEmptySets(problems, batch.params.emptySetStrategy, batch.params.emptySetDefaultValue);
  const conclusions = generateConclusions(batch.params, problems, scores, batch.chartsMissing, batch.conclusions);
  const anomalies = classifyAnomalies(problems, scores, emptySets, batch.chartsMissing);
  const status: BatchReview['status'] =
    batch.chartsMissing.length > 0 ? 'chart_pending' : anomalies.length === 0 ? 'completed' : 'processing';
  return { ...batch, problems, scores, emptySets, conclusions, anomalies, status };
}

export function buildExportReport(batch: BatchReview) {
  const counts = countDifficulties(batch.problems);
  const total = counts.easy + counts.medium + counts.hard || 1;
  const actual = {
    easy: counts.easy / total,
    medium: counts.medium / total,
    hard: counts.hard / total,
  };
  const target = {
    easy: batch.params.targetEasyRatio,
    medium: batch.params.targetMediumRatio,
    hard: batch.params.targetHardRatio,
  };
  const gap = {
    easy: actual.easy - target.easy,
    medium: actual.medium - target.medium,
    hard: actual.hard - target.hard,
  };
  const duplicateDetails = batch.problems
    .filter(p => p.isDuplicate)
    .map(p => {
      const original = batch.problems.find(q => q.id === p.duplicateOf);
      return {
        code: p.code,
        reason: p.duplicateReason || '字段重复',
        duplicateOf: original ? `${original.code} ${original.title}` : p.duplicateOf || '未知',
      };
    });
  const overview =
    `批次 ${batch.batchId} 共录入 ${batch.problems.length} 道题，` +
    `拦截重复 ${duplicateDetails.length} 道，有效题 ${total} 道。` +
    `难度占比：简单 ${(actual.easy * 100).toFixed(1)}% / 中等 ${(actual.medium * 100).toFixed(1)}% / 困难 ${(actual.hard * 100).toFixed(1)}%。` +
    `整体均衡${batch.conclusions.find(c => c.key === 'overall_balance')?.passed ? '通过' : '待调整'}。`;

  return {
    batchId: batch.batchId,
    exportedAt: new Date().toISOString(),
    overview,
    problemSummary: {
      total: batch.problems.length,
      duplicates: duplicateDetails.length,
      byDifficulty: { easy: counts.easy, medium: counts.medium, hard: counts.hard },
    },
    difficultyBalance: {
      target: Object.fromEntries(Object.entries(target).map(([k, v]) => [k, +(v * 100).toFixed(1)])),
      actual: Object.fromEntries(Object.entries(actual).map(([k, v]) => [k, +(v * 100).toFixed(1)])),
      gap: Object.fromEntries(Object.entries(gap).map(([k, v]) => [k, +(v * 100).toFixed(1)])),
    },
    duplicateDetails,
    conclusions: batch.conclusions.map(c => ({
      title: c.title,
      result: c.passed ? '通过' : '待调整',
      explanation: c.explanation,
    })),
    anomalies: batch.anomalies.map(a => ({
      category: a.category === 'need_material' ? '需补材料' : '需改口径',
      title: a.title,
      nextStep: a.nextStep,
    })),
  };
}
