import type { LogicLink, CounterExample, StepRecord, ScoreResult, DeductionItem, CorrectLink, ConditionCard } from '@/types/game';

const LINK_SCORE_PER_CORRECT = 10;
const EVIDENCE_SCORE_PER_CORRECT = 15;
const TIME_BONUS_MAX = 20;

export function calculateScore(
  links: LogicLink[],
  counterExamples: CounterExample[],
  correctLinks: CorrectLink[],
  conditions: ConditionCard[],
  stepRecords: StepRecord[],
  elapsedTime: number,
  totalTime: number
): ScoreResult {
  let linkScore = 0;
  let evidenceScore = 0;
  const deductions: DeductionItem[] = [];

  const validLinks = links.filter(l => l.status === 'valid');
  const correctLinkSet = new Set(correctLinks.map(cl => `${cl.fromCardId}->${cl.toCardId}`));

  for (const link of validLinks) {
    const key = `${link.fromCardId}->${link.toCardId}`;
    if (correctLinkSet.has(key)) {
      linkScore += LINK_SCORE_PER_CORRECT;
    } else {
      deductions.push({
        stepIndex: link.stepIndex,
        category: 'lemma_misuse',
        description: `逻辑连线错误：${getCardContent(conditions, link.fromCardId)} → ${getCardContent(conditions, link.toCardId)}，该推理关系不成立`,
        evidenceRef: link.id,
        pointsDeducted: -5,
      });
      linkScore -= 5;
    }
  }

  const missingLinks = correctLinks.filter(
    cl => !validLinks.some(l => l.fromCardId === cl.fromCardId && l.toCardId === cl.toCardId && l.status === 'valid')
  );
  for (const ml of missingLinks) {
    deductions.push({
      stepIndex: -1,
      category: 'condition_missing',
      description: `缺失推理链：${getCardContent(conditions, ml.fromCardId)} → ${getCardContent(conditions, ml.toCardId)}`,
      evidenceRef: `${ml.fromCardId}->${ml.toCardId}`,
      pointsDeducted: -3,
    });
    linkScore -= 3;
  }

  const linkMaxScore = correctLinks.length * LINK_SCORE_PER_CORRECT;

  for (const ce of counterExamples) {
    if (ce.relatedConditionId === 'c_trap' || ce.id === 'e1') {
      if (ce.status === 'excluded') {
        evidenceScore += EVIDENCE_SCORE_PER_CORRECT;
      } else if (ce.status === 'unexcluded') {
        deductions.push({
          stepIndex: getStepIndexForEvidence(stepRecords, ce.id),
          category: 'counterexample_unexcluded',
          description: `反例未排除：${ce.content}。该反例表明学生证明中 "N 必定是素数" 的隐含假设是错误的`,
          evidenceRef: ce.id,
          pointsDeducted: -10,
        });
        evidenceScore -= 10;
      } else {
        deductions.push({
          stepIndex: -1,
          category: 'counterexample_unexcluded',
          description: `反例未判定：${ce.content}，该证据需要明确排除或确认`,
          evidenceRef: ce.id,
          pointsDeducted: -5,
        });
        evidenceScore -= 5;
      }
    }

    if (ce.id === 'e3' || ce.relatedConditionId === 'c3') {
      if (ce.status === 'excluded') {
        evidenceScore += EVIDENCE_SCORE_PER_CORRECT;
      } else if (ce.status === 'unexcluded') {
        deductions.push({
          stepIndex: getStepIndexForEvidence(stepRecords, ce.id),
          category: 'condition_missing',
          description: `条件缺失未排除：${ce.content}。证明使用了算术基本定理但未验证前置条件`,
          evidenceRef: ce.id,
          pointsDeducted: -8,
        });
        evidenceScore -= 8;
      }
    }

    if (ce.id === 'e2') {
      if (ce.status === 'excluded') {
        evidenceScore += 5;
      }
    }
  }

  const evidenceMaxScore = 3 * EVIDENCE_SCORE_PER_CORRECT;
  const timeRatio = Math.max(0, 1 - elapsedTime / totalTime);
  const timeBonus = Math.round(TIME_BONUS_MAX * timeRatio);

  const totalScore = Math.max(0, linkScore + evidenceScore + timeBonus);
  const maxScore = linkMaxScore + evidenceMaxScore + TIME_BONUS_MAX;

  let grade: ScoreResult['grade'];
  const ratio = totalScore / maxScore;
  if (ratio >= 0.95) grade = 'S';
  else if (ratio >= 0.8) grade = 'A';
  else if (ratio >= 0.6) grade = 'B';
  else if (ratio >= 0.4) grade = 'C';
  else grade = 'D';

  return {
    totalScore,
    maxScore,
    grade,
    linkScore: Math.max(0, linkScore),
    linkMaxScore,
    evidenceScore: Math.max(0, evidenceScore),
    evidenceMaxScore,
    timeBonus,
    deductions,
  };
}

function getCardContent(conditions: ConditionCard[], cardId: string): string {
  const card = conditions.find(c => c.id === cardId);
  return card ? card.content.substring(0, 20) + '...' : cardId;
}

function getStepIndexForEvidence(records: StepRecord[], evidenceId: string): number {
  const record = records.find(r => r.actionDetail.includes(evidenceId));
  return record ? records.indexOf(record) : -1;
}
