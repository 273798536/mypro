import { v4 as uuidv4 } from 'uuid';
import type {
  ScoringRecord,
  Conclusion,
  DPTransitionTable,
  WrongQuestion,
} from '../types';

export interface LateScoringImpact {
  scoringRecordId: string;
  questionTitle: string;
  lateDays: number;
  affectedConclusionIds: string[];
  impactDescription: string;
}

export const detectLateScorings = (
  scoringRecords: ScoringRecord[],
  thresholdDays: number = 3
): ScoringRecord[] => {
  return scoringRecords.filter((sr) => sr.isLate && (sr.lateDays ?? 0) >= thresholdDays);
};

export const computeLateImpactAnalysis = (
  conclusions: Conclusion[],
  lateScorings: ScoringRecord[],
  wrongQuestions: WrongQuestion[]
): LateScoringImpact[] => {
  const impacts: LateScoringImpact[] = [];

  lateScorings.forEach((sr) => {
    const affected = conclusions.filter((c) =>
      c.basedOnScoringRecordIds.includes(sr.id)
    );
    const wq = wrongQuestions.find((q) => q.questionId === sr.questionId);
    const affTitles = affected.map((c) => c.title).join('；');
    impacts.push({
      scoringRecordId: sr.id,
      questionTitle: wq?.questionTitle ?? sr.questionId,
      lateDays: sr.lateDays ?? 0,
      affectedConclusionIds: affected.map((c) => c.id),
      impactDescription: `评分记录晚到${sr.lateDays}天，以下结论可能需要复核：${affTitles || '暂无直接关联结论，但可能影响整体掌握度估计'}`,
    });
  });

  return impacts;
};

export const markConclusionsAffectedByLate = (
  conclusions: Conclusion[],
  lateScorings: ScoringRecord[]
): Conclusion[] => {
  const lateIds = new Set(lateScorings.map((sr) => sr.id));
  return conclusions.map((c) => {
    const affected = c.basedOnScoringRecordIds.some((id) => lateIds.has(id));
    if (!affected) return c;
    if (c.status === 'suspicious') return c;
    const newlyAffected = lateScorings
      .filter((sr) => c.basedOnScoringRecordIds.includes(sr.id))
      .map((sr) => sr.id);
    const merged = Array.from(new Set([...(c.affectedByLateScoring ?? []), ...newlyAffected]));
    return {
      ...c,
      status: 'suspicious',
      affectedByLateScoring: merged,
      invalidReason: '该结论基于的评分记录存在晚到情况，相关结论存疑，请复核后再使用',
    };
  });
};

export const generateConclusions = (
  table: DPTransitionTable,
  scoringRecords: ScoringRecord[],
  lateScorings: ScoringRecord[]
): Conclusion[] => {
  const conclusions: Conclusion[] = [];
  const now = new Date().toISOString();

  table.states.forEach((state) => {
    const relatedScorings = scoringRecords.filter((sr) => {
      const wqIds = state.sourceQuestionIds;
      return wqIds.includes(sr.questionId);
    });

    let suggestion = '';
    if (state.value <= 0.25) {
      suggestion = '需要重点巩固，建议回顾基础概念并加强练习基础题';
    } else if (state.value <= 0.5) {
      suggestion = '基本概念已掌握，建议进行中等难度练习';
    } else if (state.value <= 0.75) {
      suggestion = '掌握较好，可挑战提高题';
    } else {
      suggestion = '完全掌握，可跳过基础复习';
    }

    const dataSource = state.sourceQuestionIds.length > 0
      ? `关联${state.sourceQuestionIds.length}道错题数据`
      : '暂无错题数据，采用默认估计';

    conclusions.push({
      id: uuidv4(),
      title: `${state.knowledgePointName}掌握度评估`,
      content: `${state.knowledgePointName}当前掌握度为 ${state.value}（${state.label}）。基于错题：${dataSource}。建议：${suggestion}`,
      generatedAt: now,
      basedOnTransitionIds: table.transitions
        .filter((t) => t.knowledgePointId === state.knowledgePointId)
        .map((t) => t.id),
      basedOnScoringRecordIds: relatedScorings.map((s) => s.id),
      status: 'valid',
    });
  });

  table.transitions.forEach((tr) => {
    if (tr.transitionType !== 'stable') {
      const trendText = tr.transitionType === 'improve'
        ? '体现了进步趋势'
        : '掌握度有所下降，需要注意';
      conclusions.push({
        id: uuidv4(),
        title: tr.description,
        content: `${tr.description}。该转移发生于 ${new Date(tr.timestamp).toLocaleDateString()}，${trendText}。`,
        generatedAt: now,
        basedOnTransitionIds: [tr.id],
        basedOnScoringRecordIds: tr.scoringRecordId ? [tr.scoringRecordId] : [],
        status: 'valid',
      });
    }
  });

  const relatedLateIds = new Set(lateScorings.map((sr) => sr.id));

  return conclusions.map((c) => {
    const isAffected = c.basedOnScoringRecordIds.some((id) => relatedLateIds.has(id));
    if (!isAffected) return c;
    return {
      ...c,
      status: 'suspicious',
      affectedByLateScoring: c.basedOnScoringRecordIds.filter((id) => relatedLateIds.has(id)),
      invalidReason: '基于的评分记录存在晚到，结论存疑需复核',
    };
  });
};
