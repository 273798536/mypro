import type { CaseData, EvidenceLink, Conclusion, Score, ErrorBreakdown, CorrectLink, ErrorFlag } from '@/types';

export function calculateScore(
  caseData: CaseData,
  userLinks: EvidenceLink[],
  userConclusion: Conclusion
): Score {
  const linkScore = calculateLinkScore(caseData.correctLinks, userLinks, caseData.clues);
  const conclusionScore = calculateConclusionScore(caseData.correctConclusion, userConclusion);
  const errorBreakdown = calculateErrorBreakdown(caseData, userLinks, userConclusion);

  const total = Math.max(0, Math.min(100, linkScore.total + conclusionScore.total));

  return {
    total,
    evidenceChainScore: linkScore.total,
    conclusionAccuracy: conclusionScore.total,
    errorBreakdown,
    linkDetails: linkScore.details,
    conclusionDetails: conclusionScore.details,
  };
}

function calculateLinkScore(
  correctLinks: CorrectLink[],
  userLinks: EvidenceLink[],
  _clues: CaseData['clues']
) {
  let score = 0;
  const details: Score['linkDetails'] = [];

  const correctSet = new Set(
    correctLinks.map((l) => `${l.fromClueId}->${l.toClueId}`)
  );
  const reverseCorrectSet = new Set(
    correctLinks.map((l) => `${l.toClueId}->${l.fromClueId}`)
  );

  const matchedCorrect = new Set<string>();

  for (const link of userLinks) {
    const key = `${link.fromClueId}->${link.toClueId}`;
    const isValid =
      correctSet.has(key) || reverseCorrectSet.has(key);

    if (isValid) {
      matchedCorrect.add(correctSet.has(key) ? key : `${link.toClueId}->${link.fromClueId}`);
      score += 8;
      details.push({
        linkId: link.id,
        fromClueId: link.fromClueId,
        toClueId: link.toClueId,
        valid: true,
        impact: 8,
      });
    } else {
      score -= 5;
      details.push({
        linkId: link.id,
        fromClueId: link.fromClueId,
        toClueId: link.toClueId,
        valid: false,
        impact: -5,
      });
    }
  }

  if (matchedCorrect.size === correctSet.size && correctSet.size > 0) {
    score += 10;
  }

  return { total: Math.max(0, score), details };
}

function calculateConclusionScore(
  correct: Conclusion,
  user: Conclusion
) {
  const impacts: number[] = [];
  let score = 0;

  const mainIssueCorrect = user.mainIssue === correct.mainIssue;
  if (mainIssueCorrect) {
    score += 30;
    impacts.push(30);
  } else {
    impacts.push(0);
  }

  const severityCorrect = user.severity === correct.severity;
  if (severityCorrect) {
    score += 15;
    impacts.push(15);
  } else {
    impacts.push(0);
  }

  const actionCorrect =
    user.recommendedAction.length > 10 &&
    (user.recommendedAction.includes('下架') ||
      user.recommendedAction.includes('补办') ||
      user.recommendedAction.includes('声明') ||
      user.recommendedAction.includes('驳回') ||
      user.recommendedAction.includes('续签') ||
      user.recommendedAction.includes('协商'));
  if (actionCorrect) {
    score += 15;
    impacts.push(15);
  } else {
    impacts.push(0);
  }

  return { total: score, details: { mainIssueCorrect, severityCorrect, actionCorrect, impacts } };
}

function calculateErrorBreakdown(
  caseData: CaseData,
  userLinks: EvidenceLink[],
  userConclusion: Conclusion
): ErrorBreakdown {
  const flags = caseData.errorFlags;

  const hasSampleLink = userLinks.some((l) => {
    const fromClue = caseData.clues.find((c) => c.id === l.fromClueId);
    const toClue = caseData.clues.find((c) => c.id === l.toClueId);
    return (
      (fromClue?.category === 'SAMPLE' || fromClue?.category === 'UNDECLARED') ||
      (toClue?.category === 'SAMPLE' || toClue?.category === 'UNDECLARED')
    );
  });

  const hasExpiredLink = userLinks.some((l) => {
    const fromClue = caseData.clues.find((c) => c.id === l.fromClueId);
    const toClue = caseData.clues.find((c) => c.id === l.toClueId);
    return fromClue?.category === 'EXPIRED' || toClue?.category === 'EXPIRED';
  });

  const hasNameConflictLink = userLinks.some((l) => {
    const fromClue = caseData.clues.find((c) => c.id === l.fromClueId);
    const toClue = caseData.clues.find((c) => c.id === l.toClueId);
    return fromClue?.category === 'NAME_CONFLICT' || toClue?.category === 'NAME_CONFLICT';
  });

  return {
    SAMPLE_UNDECLARED: {
      found: hasSampleLink,
      correct: flags.includes('SAMPLE_UNDECLARED')
        ? hasSampleLink && (userConclusion.mainIssue === 'SAMPLE_UNDECLARED')
        : !hasSampleLink,
      detail: flags.includes('SAMPLE_UNDECLARED')
        ? hasSampleLink
          ? userConclusion.mainIssue === 'SAMPLE_UNDECLARED'
            ? '正确识别采样未申报问题并做出正确判定'
            : '识别了采样线索但判定结论有误'
          : '未识别采样未申报问题'
        : '本案件不存在采样未申报问题',
    },
    BGM_EXPIRED: {
      found: hasExpiredLink,
      correct: flags.includes('BGM_EXPIRED')
        ? hasExpiredLink && (userConclusion.mainIssue === 'BGM_EXPIRED' || userConclusion.severity === 'HIGH' || userConclusion.severity === 'CRITICAL' || userConclusion.recommendedAction.includes('过期') || userConclusion.recommendedAction.includes('续签'))
        : !hasExpiredLink,
      detail: flags.includes('BGM_EXPIRED')
        ? hasExpiredLink
          ? '识别了授权过期线索'
          : '未识别授权过期问题（注意：授权过期不应自动通过）'
        : '本案件不存在授权过期问题',
    },
    NAME_CONFLICT: {
      found: hasNameConflictLink,
      correct: flags.includes('NAME_CONFLICT')
        ? hasNameConflictLink && (userConclusion.mainIssue === 'NAME_CONFLICT')
        : !hasNameConflictLink,
      detail: flags.includes('NAME_CONFLICT')
        ? hasNameConflictLink
          ? userConclusion.mainIssue === 'NAME_CONFLICT'
            ? '正确识别同名歌曲误判问题'
            : '识别了同名冲突线索但判定结论有误'
          : '未识别同名歌曲误判问题'
        : '本案件不存在同名歌曲误判问题',
    },
  };
}

export function getErrorFlagLabel(flag: ErrorFlag): string {
  const labels: Record<ErrorFlag, string> = {
    SAMPLE_UNDECLARED: '采样未申报',
    BGM_EXPIRED: '授权过期',
    NAME_CONFLICT: '同名歌曲误判',
  };
  return labels[flag];
}

export function getMainIssueLabel(issue: string): string {
  const labels: Record<string, string> = {
    COVER_OK: '翻唱授权正常',
    COVER_NO_AUTH: '翻唱无授权',
    SAMPLE_DECLARED: '采样已申报',
    SAMPLE_UNDECLARED: '采样未申报',
    BGM_AUTHORIZED: 'BGM授权有效',
    BGM_EXPIRED: 'BGM授权过期',
    NAME_CONFLICT: '同名歌曲误判',
  };
  return labels[issue] || issue;
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    CRITICAL: '严重',
  };
  return labels[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    LOW: 'text-emerald-400',
    MEDIUM: 'text-amber-400',
    HIGH: 'text-orange-400',
    CRITICAL: 'text-red-400',
  };
  return colors[severity] || 'text-slate-400';
}
