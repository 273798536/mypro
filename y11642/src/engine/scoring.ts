import { BASE_SCORE_PER_PLOT } from '../data/constants';
import type { Plot } from '../types';

export function calculateRoundScore(
  plots: Plot[],
  anomalyPenalty: number
): { roundScore: number; successfulPlots: number } {
  let roundScore = 0;
  let successfulPlots = 0;

  plots.forEach(plot => {
    const waterRatio = plot.waterCurrent / plot.waterRequired;
    
    if (waterRatio >= 0.8 && waterRatio <= 1.2) {
      roundScore += BASE_SCORE_PER_PLOT;
      successfulPlots++;
    } else if (waterRatio >= 0.5 && waterRatio < 0.8) {
      roundScore += BASE_SCORE_PER_PLOT * 0.5;
    } else if (waterRatio > 1.2 && waterRatio <= 1.5) {
      roundScore += BASE_SCORE_PER_PLOT * 0.7;
    }
  });

  roundScore = Math.max(0, roundScore - anomalyPenalty);

  return { roundScore, successfulPlots };
}

export function calculateFinalScore(
  totalScore: number,
  plots: Plot[],
  totalRounds: number
): { finalScore: number; grade: string; summary: string } {
  const maxPossibleScore = plots.length * BASE_SCORE_PER_PLOT * totalRounds;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;

  let grade = 'F';
  let summary = '';

  if (scorePercentage >= 90) {
    grade = 'A';
    summary = '优秀！水资源调配非常合理，所有作物生长良好。';
  } else if (scorePercentage >= 80) {
    grade = 'B';
    summary = '良好！大部分作物得到了适当的灌溉。';
  } else if (scorePercentage >= 70) {
    grade = 'C';
    summary = '及格。还有改进空间，注意避免干旱和过度灌溉。';
  } else if (scorePercentage >= 60) {
    grade = 'D';
    summary = '勉强通过。需要重新学习阀门控制策略。';
  } else {
    grade = 'F';
    summary = '不合格。灌溉策略存在严重问题，请重新学习。';
  }

  return {
    finalScore: totalScore,
    grade,
    summary
  };
}
