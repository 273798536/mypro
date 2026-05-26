import type { GameState, OperationLog, MarketEvent, LiquidationRecord } from '../types';

export interface ReplayFrame {
  roundNumber: number;
  marketEvent?: MarketEvent;
  operations: OperationLog[];
  liquidations: LiquidationRecord[];
  timestamp: number;
}

export const generateReplayFrames = (gameState: GameState): ReplayFrame[] => {
  const frames: ReplayFrame[] = [];
  
  for (let round = 1; round <= gameState.currentRound; round++) {
    const marketEvent = gameState.marketEvents.find(e => e.roundNumber === round);
    const operations = gameState.operationLogs.filter(l => l.roundNumber === round);
    const liquidations = gameState.liquidationRecords.filter(r => r.roundNumber === round);
    
    frames.push({
      roundNumber: round,
      marketEvent,
      operations,
      liquidations,
      timestamp: marketEvent?.timestamp || Date.now(),
    });
  }
  
  return frames;
};

export const getFailureReplayFrame = (
  frames: ReplayFrame[],
  roundNumber: number
): ReplayFrame | undefined => {
  return frames.find(f => f.roundNumber === roundNumber);
};

export const getFailureAnalysis = (gameState: GameState): string[] => {
  const analysis: string[] = [];
  
  const highRiskAccounts = gameState.accounts.filter(acc => acc.status === 'danger' || acc.status === 'liquidated');
  
  if (highRiskAccounts.length > 0) {
    analysis.push('有 ' + highRiskAccounts.length + ' 个账户处于高风险或已爆仓');
  }
  
  const systemOperations = gameState.operationLogs.filter(
    log => log.operator === 'system'
  );
  
  if (systemOperations.length > 0) {
    analysis.push('发生 ' + systemOperations.length + ' 次系统自动强平，建议提高操作速度');
  }
  
  const wrongOperations = gameState.operationLogs.filter(
    log => log.scoreChange < 0
  );
  
  if (wrongOperations.length > 0) {
    analysis.push('有 ' + wrongOperations.length + ' 次操作判断失误，建议复盘学习');
  }
  
  const extremeEvents = gameState.marketEvents.filter(e => e.isExtreme);
  if (extremeEvents.length > 2) {
    analysis.push('遇到 ' + extremeEvents.length + ' 次极端行情，应对能力有待加强');
  }
  
  if (analysis.length === 0) {
    analysis.push('表现优秀！继续保持！');
  }
  
  return analysis;
};

export const getOperationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    add_margin: '追加保证金',
    partial_close: '部分平仓',
    full_close: '全部平仓',
    skip: '跳过',
    auto_liquidate: '自动强平',
  };
  return labels[type] || type;
};

export const getOperationTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    add_margin: 'plus',
    partial_close: 'minus',
    full_close: 'x',
    skip: 'skip',
    auto_liquidate: 'alert',
  };
  return icons[type] || 'circle';
};
