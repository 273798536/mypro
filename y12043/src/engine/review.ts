import { GameState, Fund, ReviewAnalysis, FeeRecord } from '@/types';
import { calculateIndustryConcentration, getMaxConcentration } from './risk';
import { findMissedFees, getTotalFees } from './fee';

export function generateReviewAnalysis(
  game: GameState,
  funds: Fund[]
): ReviewAnalysis {
  const finalReturn = game.currentCapital - game.startCapital;
  const finalReturnPercent = (game.currentCapital - game.startCapital) / game.startCapital;
  
  const concentration = calculateIndustryConcentration(game.portfolio, funds);
  const maxConcentration = getMaxConcentration(concentration);
  
  const maxDrawdown = Math.max(...game.drawdowns.map(d => d.drawdownPercent), 0);
  
  const totalFees = getTotalFees(game.fees);
  const missedFees = findMissedFees(game.fees);
  
  const keyMistakes = analyzeKeyMistakes(game, funds);
  const diversificationScore = calculateDiversificationScore(concentration);
  const routeEfficiency = calculateRouteEfficiency(game);
  
  const suggestions = generateSuggestions(game, funds, concentration, missedFees);
  
  return {
    finalReturn,
    finalReturnPercent,
    maxDrawdown,
    industryConcentration: concentration,
    totalFees,
    missedFees,
    keyMistakes,
    routeEfficiency,
    diversificationScore,
    suggestions,
  };
}

function analyzeKeyMistakes(
  game: GameState,
  funds: Fund[]
): ReviewAnalysis['keyMistakes'] {
  const mistakes: ReviewAnalysis['keyMistakes'] = [];
  
  game.drawdowns.forEach((drawdown, index) => {
    mistakes.push({
      step: drawdown.step,
      type: 'drawdown',
      description: drawdown.cause,
      impact: drawdown.drawdownPercent * 100,
      suggestion: drawdown.suggestion,
    });
  });
  
  game.decisions.forEach((decision, index) => {
    if (!decision.fundId) return;
    const fund = funds.find(f => f.id === decision.fundId);
    if (!fund) return;
    
    if (fund.isHot && index > 0) {
      const prevDecision = game.decisions[index - 1];
      const prevFund = prevDecision?.fundId ? funds.find(f => f.id === prevDecision.fundId) : null;
      if (prevFund?.isHot) {
        mistakes.push({
          step: decision.step,
          type: 'chasing_return',
          description: `连续追涨热门基金"${fund.name}"`,
          impact: 5,
          suggestion: '避免追涨杀跌，建立投资纪律',
        });
      }
    }
  });
  
  if (mistakes.length > 5) {
    return mistakes.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }
  
  return mistakes.sort((a, b) => a.step - b.step);
}

function calculateDiversificationScore(
  concentration: Record<string, number>
): number {
  const industries = Object.keys(concentration).filter(k => k !== 'unknown');
  const count = industries.length;
  
  if (count === 0) return 0;
  
  const maxConc = Math.max(...Object.values(concentration), 0);
  const concPenalty = maxConc > 0.5 ? (maxConc - 0.5) * 50 : 0;
  
  return Math.max(0, Math.min(100, count * 20 - concPenalty));
}

function calculateRouteEfficiency(game: GameState): number {
  const efficientBranches = game.decisions.filter(d => d.routeBranch === 'A').length;
  return (efficientBranches / Math.max(game.decisions.length, 1)) * 100;
}

function generateSuggestions(
  game: GameState,
  funds: Fund[],
  concentration: Record<string, number>,
  missedFees: FeeRecord[]
): string[] {
  const suggestions: string[] = [];
  
  const maxConc = Math.max(...Object.values(concentration), 0);
  if (maxConc > 0.4) {
    suggestions.push('行业集中度较高，建议分散投资到3个以上行业');
  }
  
  const highRiskFunds = Object.entries(game.portfolio).filter(([fundId]) => {
    const fund = funds.find(f => f.id === fundId);
    return fund && fund.riskLevel >= 4;
  });
  if (highRiskFunds.length > 0) {
    suggestions.push('高风险基金占比较大，建议搭配低风险产品平衡组合');
  }
  
  if (missedFees.length > 0) {
    const missedAmount = missedFees.reduce((sum, f) => sum + f.amount, 0);
    suggestions.push(`有${missedFees.length}笔手续费待扣除，合计${missedAmount.toFixed(2)}元，注意隐性成本`);
  }
  
  if (game.drawdowns.length >= 2) {
    suggestions.push('多次触发回撤，建议设置止损点并严格执行');
  }
  
  const frequentTrades = game.decisions.length > 6;
  if (frequentTrades) {
    suggestions.push('交易过于频繁，手续费侵蚀收益，建议长期持有');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('投资策略稳健，继续保持分散投资理念');
  }
  
  return suggestions;
}

export function getPerformanceGrade(returnPercent: number): { grade: string; color: string } {
  if (returnPercent >= 0.15) return { grade: 'S', color: '#FFD700' };
  if (returnPercent >= 0.10) return { grade: 'A', color: '#10B981' };
  if (returnPercent >= 0.05) return { grade: 'B', color: '#3B82F6' };
  if (returnPercent >= 0) return { grade: 'C', color: '#F59E0B' };
  if (returnPercent >= -0.10) return { grade: 'D', color: '#EF4444' };
  return { grade: 'F', color: '#7F1D1D' };
}
