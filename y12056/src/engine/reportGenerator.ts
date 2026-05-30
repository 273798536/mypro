import type { ScoreResult } from '../types/score';
import type { Level, Connection } from '../types/game';
import type { PracticeReport, CounterexampleTrack } from '../types/report';
import { detectCounterexamples, getAffectedSteps } from './counterexampleDetector';

export function generatePracticeReport(
  scoreResult: ScoreResult,
  level: Level,
  connections: Connection[],
  studentName?: string
): PracticeReport {
  const counterexampleTracks = buildCounterexampleTracks(scoreResult, level);
  const suggestions = generateSuggestions(scoreResult);

  const scoreDetails = buildScoreDetails(scoreResult, level);

  return {
    attemptId: scoreResult.attemptId,
    levelId: level.id,
    levelTitle: level.title,
    studentName,
    completedAt: scoreResult.completedAt,
    scoreResult,
    logicConnections: connections,
    counterexampleTracks,
    scoreDetails,
    totalScore: scoreResult.totalPoints,
    maxScore: scoreResult.maxPoints,
    suggestions,
  };
}

export function buildCounterexampleTracks(
  scoreResult: ScoreResult,
  level: Level
): CounterexampleTrack[] {
  const unexcludedCounterexamples = level.counterexamples.filter((ce) =>
    scoreResult.unexcludedCounterexamples.includes(ce.id)
  );

  return unexcludedCounterexamples.map((counterexample) => {
    const affectedSteps = getAffectedSteps(counterexample, level);
    const beforeConclusion = affectedSteps.length > 0 ? affectedSteps[0].content : '';
    const afterConclusion =
      affectedSteps.length > 0 ? affectedSteps[affectedSteps.length - 1].content : '';

    return {
      counterexampleId: counterexample.id,
      content: counterexample.content,
      beforeConclusion,
      afterConclusion,
      affectedSteps: counterexample.affectedStepIds,
    };
  });
}

export function generateSuggestions(scoreResult: ScoreResult): string {
  const suggestions: string[] = [];

  if (scoreResult.missingConditions.length > 0) {
    const missingCount = scoreResult.missingConditions.length;
    suggestions.push(
      `• 条件完整性：有 ${missingCount} 个必要条件缺失，建议仔细梳理题目给出的所有已知条件，确保每个结论都有完整的条件支撑。`
    );
  }

  if (scoreResult.wrongLemmas.length > 0) {
    const wrongCount = scoreResult.wrongLemmas.length;
    suggestions.push(
      `• 引理正确性：有 ${wrongCount} 个引理使用不当，建议复习相关定理的适用条件，确保引理与结论之间的逻辑关系正确。`
    );
  }

  if (scoreResult.unexcludedCounterexamples.length > 0) {
    const unexcludedCount = scoreResult.unexcludedCounterexamples.length;
    suggestions.push(
      `• 反例排除：有 ${unexcludedCount} 个反例未排除，建议考虑命题的适用范围，检查是否遗漏了特殊情况的限定条件。`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('• 证明逻辑完整，所有条件、引理使用正确，反例已排除，继续保持！');
  }

  const accuracy =
    scoreResult.maxPoints > 0
      ? Math.round((scoreResult.totalPoints / scoreResult.maxPoints) * 100)
      : 0;

  if (accuracy >= 90) {
    suggestions.push('• 整体表现优秀！建议尝试更高难度的题目挑战自己。');
  } else if (accuracy >= 70) {
    suggestions.push('• 整体表现良好！针对上述问题进行改进，就能更上一层楼。');
  } else if (accuracy >= 50) {
    suggestions.push('• 还有提升空间！建议先复习基础知识，再逐步提高。');
  } else {
    suggestions.push('• 需要加强基础训练！建议从简单题目开始，夯实基础后再挑战。');
  }

  return suggestions.join('\n\n');
}

function buildScoreDetails(scoreResult: ScoreResult, level: Level): string {
  const details: string[] = [];

  details.push(`【评分详情】`);
  details.push(`总分：${scoreResult.totalPoints} / ${scoreResult.maxPoints} 分`);
  details.push(
    `正确率：${
      scoreResult.maxPoints > 0
        ? Math.round((scoreResult.totalPoints / scoreResult.maxPoints) * 100)
        : 0
    }%`
  );
  details.push('');

  scoreResult.stepScores.forEach((stepScore) => {
    details.push(`步骤 ${stepScore.stepNumber}：${stepScore.content}`);
    details.push(`  得分：${stepScore.earnedPoints} / ${stepScore.maxPoints} 分`);

    if (stepScore.deductionReason) {
      details.push(`  扣分原因：${stepScore.deductionReason}`);
    }

    if (stepScore.ownerGuide) {
      details.push(`  责任人指引：${stepScore.ownerGuide}`);
    }

    details.push('');
  });

  if (scoreResult.missingConditions.length > 0) {
    const missingConditionContents = scoreResult.missingConditions
      .map((id) => level.conditionCards.find((c) => c.id === id)?.content)
      .filter(Boolean);
    details.push(`缺失条件：${missingConditionContents.join('、')}`);
  }

  if (scoreResult.wrongLemmas.length > 0) {
    const wrongLemmaNames = scoreResult.wrongLemmas
      .map((id) => level.lemmaCards.find((l) => l.id === id)?.name)
      .filter(Boolean);
    details.push(`错误引理：${wrongLemmaNames.join('、')}`);
  }

  if (scoreResult.unexcludedCounterexamples.length > 0) {
    const unexcludedContents = scoreResult.unexcludedCounterexamples
      .map((id) => level.counterexamples.find((ce) => ce.id === id)?.content)
      .filter(Boolean);
    details.push(`未排除反例：${unexcludedContents.join('、')}`);
  }

  return details.join('\n');
}
