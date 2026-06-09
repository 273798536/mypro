import type {
  Question,
  ScheduleResult,
  ErrorToleranceConfig,
  DataGap,
} from '@/types';
import { CHAPTER_ORDER, FORMULA_META } from '@/types';
import { topologicalSort } from './topoSort';

export interface CalculationResult {
  schedules: ScheduleResult[];
  gaps: DataGap[];
  totalQuestions: number;
  processedCount: number;
  skippedCount: number;
}

function getChapterOrder(chapter: string): number {
  if (CHAPTER_ORDER[chapter]) return CHAPTER_ORDER[chapter];
  const match = chapter.match(/第([一二三四五六七八九十]+)章/);
  if (match) {
    const map: Record<string, number> = {
      一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
    };
    return map[match[1]] ?? 3;
  }
  return 3;
}

function getChapterWeight(chapter: string): number {
  const totalChapters = Object.keys(CHAPTER_ORDER).length || 5;
  const order = getChapterOrder(chapter);
  return 1 - order / (totalChapters + 1);
}

function computeChapterAverageDifficulty(questions: Question[], chapter: string): number {
  const chapterQuestions = questions.filter(
    (q) => q.chapter === chapter && q.difficulty !== null,
  );
  if (chapterQuestions.length === 0) return 3.0;
  const sum = chapterQuestions.reduce((acc, q) => acc + (q.difficulty ?? 0), 0);
  return sum / chapterQuestions.length;
}

export function calculateSchedule(
  questions: Question[],
  config: ErrorToleranceConfig,
): CalculationResult {
  const gaps: DataGap[] = [];
  const processedQuestions: Question[] = [];
  const effectiveQuestions: Question[] = [];
  const idToOriginal = new Map(questions.map((q) => [q.id, q]));

  for (const q of questions) {
    let effectiveDifficulty = q.difficulty;
    let effectiveUnit = q.unit;
    let effectiveErrorRate = q.errorRate;
    let confidencePenalty = 0;

    if (q.unit === null || q.unit.trim() === '') {
      effectiveUnit = '题';
      gaps.push({
        questionId: q.id,
        fieldName: 'unit',
        severity: 'warning',
        description: '做题时间单位缺失，已使用默认单位"题"，难度评分打8折处理',
        impact: '综合评分下降约0.05-0.08，可能导致排期位次后移1-5位',
      });
      if (effectiveDifficulty !== null) {
        effectiveDifficulty = effectiveDifficulty * 0.8;
      }
    }

    if (q.difficulty === null) {
      const avg = computeChapterAverageDifficulty(questions, q.chapter);
      effectiveDifficulty = avg;
      confidencePenalty += 0.2;
      gaps.push({
        questionId: q.id,
        fieldName: 'difficulty',
        severity: 'warning',
        description: `难度评分缺失，已使用章节平均难度 ${avg.toFixed(2)} 兜底`,
        impact: '置信度降低20%，下游依赖题排期可能整体后移',
      });
    }

    if (q.errorRate === null) {
      effectiveErrorRate = 0.35;
      confidencePenalty += 0.15;
      gaps.push({
        questionId: q.id,
        fieldName: 'errorRate',
        severity: 'warning',
        description: '学生错题率缺失，已使用全局平均错题率 0.35 兜底',
        impact: '置信度降低15%，综合评分偏差约±0.05',
      });
    }

    processedQuestions.push(q);
    effectiveQuestions.push({
      ...q,
      difficulty: effectiveDifficulty,
      unit: effectiveUnit,
      errorRate: effectiveErrorRate,
    });
    (effectiveQuestions[effectiveQuestions.length - 1] as Question & {
      _confidencePenalty?: number;
    })._confidencePenalty = confidencePenalty;
  }

  const topo = topologicalSort(effectiveQuestions);

  for (const skipId of topo.skippedIds) {
    const reason = topo.failureReasons[skipId] || '未知错误';
    gaps.push({
      questionId: skipId,
      fieldName: 'dependencies',
      severity: 'error',
      description: reason,
      impact: '该题已跳过计算，不出现在最终排期中，请修复后重新计算',
    });
  }

  const schedules: ScheduleResult[] = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const sortedByScore = [...topo.sortedIds].sort((aId, bId) => {
    const a = effectiveQuestions.find((q) => q.id === aId)!;
    const b = effectiveQuestions.find((q) => q.id === bId)!;
    const aDepth = topo.dependencyDepths[aId] ?? 0;
    const bDepth = topo.dependencyDepths[bId] ?? 0;

    const aNormDiff = (a.difficulty ?? 3) / 5;
    const bNormDiff = (b.difficulty ?? 3) / 5;
    const aErr = a.errorRate ?? 0.35;
    const bErr = b.errorRate ?? 0.35;
    const aChap = getChapterWeight(a.chapter);
    const bChap = getChapterWeight(b.chapter);

    const aScore =
      config.difficultyWeight * aNormDiff +
      config.errorRateWeight * aErr +
      config.dependencyPenaltyWeight * aDepth +
      config.chapterOrderWeight * aChap;
    const bScore =
      config.difficultyWeight * bNormDiff +
      config.errorRateWeight * bErr +
      config.dependencyPenaltyWeight * bDepth +
      config.chapterOrderWeight * bChap;

    if (Math.abs(bScore - aScore) > 0.0001) return bScore - aScore;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return aId.localeCompare(bId);
  });

  const rankMap = new Map<string, number>();
  sortedByScore.forEach((id, idx) => rankMap.set(id, idx + 1));

  const orderToId = new Map<number, string>();
  topo.sortedIds.forEach((id, topoIdx) => {
    const rank = rankMap.get(id) ?? topoIdx + 1;
    orderToId.set(rank, id);
  });

  const finalOrder: string[] = [];
  const placed = new Set<string>();
  const inDegreeNow = new Map<string, number>();

  for (const q of effectiveQuestions) {
    if (topo.skippedIds.includes(q.id)) continue;
    let deg = 0;
    for (const dep of q.dependencies) {
      if (!topo.skippedIds.includes(dep) && idToOriginal.has(dep)) {
        deg++;
      }
    }
    inDegreeNow.set(q.id, deg);
  }

  while (finalOrder.length < sortedByScore.length) {
    const available: string[] = [];
    for (const [id, deg] of inDegreeNow.entries()) {
      if (deg === 0 && !placed.has(id)) {
        available.push(id);
      }
    }
    available.sort((a, b) => (rankMap.get(a) ?? 999) - (rankMap.get(b) ?? 999));
    if (available.length === 0) break;
    const next = available[0];
    placed.add(next);
    finalOrder.push(next);
    const q = effectiveQuestions.find((e) => e.id === next);
    if (q) {
      for (const other of effectiveQuestions) {
        if (other.dependencies.includes(next) && !topo.skippedIds.includes(other.id)) {
          const deg = inDegreeNow.get(other.id) ?? 0;
          inDegreeNow.set(other.id, Math.max(0, deg - 1));
        }
      }
    }
  }

  for (let idx = 0; idx < finalOrder.length; idx++) {
    const qId = finalOrder[idx];
    const q = effectiveQuestions.find((e) => e.id === qId)!;
    const original = idToOriginal.get(qId)!;
    const pen = (q as Question & { _confidencePenalty?: number })._confidencePenalty ?? 0;

    const normalizedDifficulty = (q.difficulty ?? 3) / 5;
    const errorRateComponent = q.errorRate ?? 0.35;
    const dependencyPenalty = topo.dependencyDepths[qId] ?? 0;
    const chapterOrder = getChapterWeight(q.chapter);

    const score =
      config.difficultyWeight * normalizedDifficulty +
      config.errorRateWeight * errorRateComponent +
      config.dependencyPenaltyWeight * dependencyPenalty +
      config.chapterOrderWeight * chapterOrder;

    const rank = idx + 1;
    const batch = Math.floor(idx / config.batchSize) + 1;
    const publishDate = new Date(startDate);
    publishDate.setDate(startDate.getDate() + (batch - 1) * config.daysPerBatch);

    const appliedUnits: string[] = [];
    if (q.unit) appliedUnits.push(q.unit);
    appliedUnits.push('分', '层', '章', '批次', '天');

    schedules.push({
      questionId: qId,
      rank,
      batch,
      publishDate: publishDate.toISOString().slice(0, 10),
      score: Math.round(score * 1000) / 1000,
      confidence: Math.max(0.1, 1 - pen),
      formula: FORMULA_META.expression,
      appliedUnits,
      failureReason: null,
      skipped: false,
      scoreBreakdown: {
        normalizedDifficulty: Math.round(config.difficultyWeight * normalizedDifficulty * 1000) / 1000,
        errorRateComponent: Math.round(config.errorRateWeight * errorRateComponent * 1000) / 1000,
        dependencyPenalty: Math.round(config.dependencyPenaltyWeight * dependencyPenalty * 1000) / 1000,
        chapterOrder: Math.round(config.chapterOrderWeight * chapterOrder * 1000) / 1000,
      },
    });
    void original;
  }

  for (const skipId of topo.skippedIds) {
    schedules.push({
      questionId: skipId,
      rank: -1,
      batch: -1,
      publishDate: '',
      score: 0,
      confidence: 0,
      formula: '',
      appliedUnits: [],
      failureReason: topo.failureReasons[skipId] || '未知错误',
      skipped: true,
      scoreBreakdown: {
        normalizedDifficulty: 0,
        errorRateComponent: 0,
        dependencyPenalty: 0,
        chapterOrder: 0,
      },
    });
  }

  return {
    schedules,
    gaps,
    totalQuestions: questions.length,
    processedCount: schedules.filter((s) => !s.skipped).length,
    skippedCount: schedules.filter((s) => s.skipped).length,
  };
}
