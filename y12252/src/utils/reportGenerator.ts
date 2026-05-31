import type { JudgeReport, ConditionCard, CounterExample, LogicLink, ScoreResult } from '@/types/game';

export function generateReport(
  sessionId: string,
  theoremTitle: string,
  theoremStatement: string,
  studentProof: string,
  conditions: ConditionCard[],
  counterExamples: CounterExample[],
  logicLinks: LogicLink[],
  scoreResult: ScoreResult
): JudgeReport {
  const originalCount = conditions.filter(c => c.source === 'original').length;
  const derivedCount = conditions.filter(c => c.source === 'derived').length;
  const excludedCount = counterExamples.filter(ce => ce.status === 'excluded').length;
  const unexcludedCount = counterExamples.filter(ce => ce.status === 'unexcluded').length;
  const pendingCount = counterExamples.filter(ce => ce.status === 'pending').length;

  const validLinks = logicLinks.filter(l => l.status === 'valid');
  const invalidLinks = logicLinks.filter(l => l.status === 'invalid');

  const conclusion = generateConclusion(scoreResult, counterExamples, invalidLinks);

  return {
    id: `report-${Date.now()}`,
    sessionId,
    caseInfo: {
      title: theoremTitle,
      theorem: theoremStatement,
      studentProof,
    },
    evidenceSummary: {
      totalConditions: conditions.length,
      originalCount,
      derivedCount,
      counterExamples: {
        excluded: excludedCount,
        unexcluded: unexcludedCount,
        pending: pendingCount,
      },
    },
    judgmentDetails: logicLinks.map(link => ({
      from: getCardContent(conditions, link.fromCardId),
      to: getCardContent(conditions, link.toCardId),
      status: link.status,
      rule: link.rule,
    })),
    deductionBreakdown: scoreResult.deductions,
    conclusion,
    evidenceStandards: getEvidenceStandards(),
    generatedAt: Date.now(),
  };
}

function getCardContent(conditions: ConditionCard[], cardId: string): string {
  const card = conditions.find(c => c.id === cardId);
  return card ? card.content : cardId;
}

function generateConclusion(
  scoreResult: ScoreResult,
  counterExamples: CounterExample[],
  invalidLinks: LogicLink[]
): string {
  const parts: string[] = [];

  if (scoreResult.grade === 'S' || scoreResult.grade === 'A') {
    parts.push('审查结论：该证明的审查基本完整，主要逻辑链路已正确识别。');
  } else if (scoreResult.grade === 'B') {
    parts.push('审查结论：该证明的审查部分完整，存在一些遗漏。');
  } else {
    parts.push('审查结论：该证明的审查不完整，存在重要遗漏和错误。');
  }

  const unexcludedCE = counterExamples.filter(ce => ce.status === 'unexcluded');
  if (unexcludedCE.length > 0) {
    parts.push(`未排除的反例有 ${unexcludedCE.length} 个，这些反例可能揭示证明中的关键缺陷。`);
  }

  const pendingCE = counterExamples.filter(ce => ce.status === 'pending');
  if (pendingCE.length > 0) {
    parts.push(`尚有 ${pendingCE.length} 个反例未判定，建议进一步审查。`);
  }

  if (invalidLinks.length > 0) {
    parts.push(`发现 ${invalidLinks.length} 条无效逻辑连线，表明证明中存在推理错误。`);
  }

  const lemmaMisuse = scoreResult.deductions.filter(d => d.category === 'lemma_misuse');
  if (lemmaMisuse.length > 0) {
    parts.push(`引理错用 ${lemmaMisuse.length} 处，需关注证明中隐含假设的正确性。`);
  }

  const conditionMissing = scoreResult.deductions.filter(d => d.category === 'condition_missing');
  if (conditionMissing.length > 0) {
    parts.push(`条件缺失 ${conditionMissing.length} 处，证明跳过了必要的前置条件验证。`);
  }

  return parts.join('');
}

function getEvidenceStandards(): string {
  return [
    '证据判定口径说明：',
    '1. 引理错用：当逻辑连线的两端不构成有效推理关系时，判定为引理错用。评判标准为该推理是否在标准证明体系中成立。',
    '2. 条件缺失：当证明使用某引理但未验证其前置条件时，判定为条件缺失。评判标准为该引理的标准表述中是否包含该前置条件。',
    '3. 反例未排除：当存在反例可推翻证明中某一步的结论，且审查未标记排除时，判定为反例未排除。评判标准为反例是否直接针对证明中的某一推理步骤。',
    '4. 评分权重：逻辑连线 10分/条，证据判定 15分/项正确排除，时间奖励最高20分。',
  ].join('\n');
}

export function exportReportAsJSON(report: JudgeReport): string {
  return JSON.stringify(report, null, 2);
}

export function generateShareLink(report: JudgeReport): string {
  const encoded = btoa(encodeURIComponent(JSON.stringify({
    id: report.id,
    title: report.caseInfo.title,
    grade: report.conclusion.includes('完整') ? '通过' : '未通过',
    generatedAt: report.generatedAt,
  })));
  return `${window.location.origin}/report?data=${encoded}`;
}
