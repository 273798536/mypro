import { PenaltyItem } from '../types/game';
import { generateId } from './mockData';

export const scoringRules = {
  safeRound: 10,
  avoidPriceJumpTrap: 20,
  correctCollateralAdd: 15,
  correctRepay: 15,
  holdStillSafe: 5,
  liquidation: -50,
  missedPriceJump: -30,
  repeatedLiquidation: -40,
  gasShortage: -25,
  successfulVerification: 10,
};

export const calculateMaxScore = (totalRounds: number): number => {
  return totalRounds * scoringRules.safeRound + 50;
};

export const createPenalty = (
  round: number,
  type: string,
  description: string,
  score: number,
  linkedActionId: string
): PenaltyItem => {
  return {
    id: `penalty-${generateId()}`,
    round,
    type,
    description,
    score,
    linkedActionId,
  };
};

export const getScoreColor = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return 'text-emerald-400';
  if (percentage >= 60) return 'text-yellow-400';
  if (percentage >= 40) return 'text-orange-400';
  return 'text-red-400';
};

export const getScoreRingColor = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return '#10b981';
  if (percentage >= 60) return '#fbbf24';
  if (percentage >= 40) return '#f97316';
  return '#ef4444';
};

export const getResultMessage = (score: number, maxScore: number, survived: boolean): { title: string; message: string; level: string } => {
  const percentage = (score / maxScore) * 100;
  
  if (!survived) {
    return {
      title: '仓位被清算',
      message: '你的抵押率跌破清算线，仓位已被清算。不要灰心，再试一次！',
      level: 'liquidated',
    };
  }
  
  if (percentage >= 90) {
    return {
      title: '清算守卫大师',
      message: '完美！你成功守住了所有风险点，是真正的DeFi清算守卫！',
      level: 'master',
    };
  }
  
  if (percentage >= 70) {
    return {
      title: '优秀守卫',
      message: '表现出色！你对清算规则有很好的理解，继续保持！',
      level: 'excellent',
    };
  }
  
  if (percentage >= 50) {
    return {
      title: '合格守卫',
      message: '勉强过关，但还有提升空间。建议复习价格跳变和异常处理环节。',
      level: 'pass',
    };
  }
  
  return {
    title: '需要练习',
    message: '建议重新学习清算基础知识，理解抵押率计算公式和清算触发条件。',
    level: 'beginner',
  };
};
