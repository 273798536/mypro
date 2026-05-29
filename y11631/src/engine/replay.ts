import { ReplayData, ReplaySnapshot, GameState, SettlementReport, GameEvent, InventoryPoint } from './types';
import { GAME_CONFIG, DIFFICULTY_CONFIGS } from './config';

export function createReplayData(
  snapshots: ReplaySnapshot[],
  events: GameEvent[],
  difficulty: string,
  finalScore: number
): ReplayData {
  return {
    id: Math.random().toString(36).substring(2, 11),
    startTime: snapshots[0]?.timestamp || 0,
    endTime: snapshots[snapshots.length - 1]?.timestamp || 0,
    difficulty: difficulty as any,
    finalScore,
    snapshots,
    events,
  };
}

export function exportReplayToJson(replayData: ReplayData): string {
  return JSON.stringify(replayData, null, 2);
}

export function downloadReplay(replayData: ReplayData): void {
  const json = exportReplayToJson(replayData);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `replay_${replayData.id}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadReplayFromJson(json: string): ReplayData | null {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to parse replay data:', e);
    return null;
  }
}

export function generateSettlementReport(
  finalState: GameState,
  difficulty: string
): SettlementReport {
  const config = DIFFICULTY_CONFIGS[difficulty as keyof typeof DIFFICULTY_CONFIGS];
  
  const realizedPnL = finalState.realizedPnL;
  const unrealizedPnL = finalState.unrealizedPnL;
  const fees = -finalState.totalFees;
  const inventoryPenalty = -finalState.inventoryPenalty;
  const eventBonus = finalState.eventBonus;
  const totalScore = finalState.score;
  
  const buyTrades = finalState.tradeHistory.filter(t => t.side === 'buy').length;
  const sellTrades = finalState.tradeHistory.filter(t => t.side === 'sell').length;
  const totalTrades = finalState.tradeHistory.length;
  
  const avgSpread = totalTrades > 1
    ? finalState.tradeHistory.reduce((sum, t) => sum + Math.abs(t.pnlContribution) / t.quantity, 0) / totalTrades
    : 0;
  
  let maxInventory = 0;
  let inventoryViolations = 0;
  const inventoryHistory: InventoryPoint[] = finalState.inventoryHistory || [];
  for (const point of inventoryHistory) {
    const absInv = Math.abs(point.inventory);
    if (absInv > maxInventory) maxInventory = absInv;
    if (absInv > GAME_CONFIG.INVENTORY_THRESHOLD) inventoryViolations++;
  }
  
  const grossProfit = Math.max(0, realizedPnL + unrealizedPnL);
  const feeToProfitRatio = grossProfit > 0 ? Math.abs(fees) / grossProfit : 0;
  
  const targetScore = config?.targetScore || 1000;
  const scoreRatio = totalScore / targetScore;
  
  let rating: SettlementReport['rating'] = 'F';
  if (scoreRatio >= 1.5) rating = 'S';
  else if (scoreRatio >= 1.0) rating = 'A';
  else if (scoreRatio >= 0.7) rating = 'B';
  else if (scoreRatio >= 0.4) rating = 'C';
  else if (scoreRatio >= 0) rating = 'D';
  
  const failureReasons: string[] = [];
  if (totalScore < 0) {
    failureReasons.push('最终得分为负，做市策略失败');
  }
  if (feeToProfitRatio > 0.5) {
    failureReasons.push(`手续费占利润的${(feeToProfitRatio * 100).toFixed(0)}%，交易过于频繁`);
  }
  if (inventoryViolations > 10) {
    failureReasons.push(`库存超标${inventoryViolations}次，风险管理不当`);
  }
  if (finalState.endReason === 'bankrupt') {
    failureReasons.push('资金破产，强制平仓结束');
  }
  if (finalState.endReason === 'force_liquidation') {
    failureReasons.push('触及强平线，游戏提前结束');
  }
  
  return {
    totalScore,
    scoreBreakdown: {
      realizedPnL,
      unrealizedPnL,
      fees,
      inventoryPenalty,
      eventBonus,
    },
    tradeSummary: {
      totalTrades,
      buyTrades,
      sellTrades,
      avgSpread,
    },
    riskAnalysis: {
      maxInventory,
      inventoryViolations,
      feeToProfitRatio,
    },
    eventsEncountered: finalState.events,
    rating,
    failureReasons,
  };
}

export function getRatingColor(rating: string): string {
  switch (rating) {
    case 'S': return 'text-yellow-400';
    case 'A': return 'text-trade-up';
    case 'B': return 'text-trade-info';
    case 'C': return 'text-trade-warn';
    case 'D': return 'text-orange-500';
    case 'F': return 'text-trade-down';
    default: return 'text-white';
  }
}
