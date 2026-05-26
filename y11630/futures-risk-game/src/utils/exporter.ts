import type { GameState, ScoreBreakdown, OperationLog, LiquidationRecord } from '../types';

export const exportToJSON = (
  gameState: GameState, scoreBreakdown: ScoreBreakdown): void => {
  const exportData = {
    gameSummary: {
      totalScore: scoreBreakdown.totalScore,
      rating: scoreBreakdown.rating,
      accuracy: scoreBreakdown.accuracy,
      totalRounds: gameState.totalRounds,
      roundsCompleted: gameState.currentRound,
      correctOperations: scoreBreakdown.correctOperations,
      wrongOperations: scoreBreakdown.wrongOperations,
      timeouts: scoreBreakdown.timeouts,
    },
    operations: gameState.operationLogs,
    liquidations: gameState.liquidationRecords,
    marketEvents: gameState.marketEvents,
    finalAccounts: gameState.accounts.map(acc => ({
      name: acc.name,
      status: acc.status,
      finalEquity: acc.equity,
      finalRiskLevel: acc.riskLevel,
    })),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `futures-risk-game-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (
  gameState: GameState,
  scoreBreakdown: ScoreBreakdown
): void => {
  const headers = [
    '回合',
    '操作类型',
    '账户',
    '操作者',
    '原因',
    '结果',
    '分数变化',
    '时间',
  ];
  
  const operationRows = gameState.operationLogs.map(log => [
    log.roundNumber,
    getOperationTypeName(log.type),
    log.accountName,
    log.operator === 'player' ? '玩家' : '系统',
    log.reason,
    log.result === 'success' ? '成功' : '失败',
    log.scoreChange,
    new Date(log.timestamp).toLocaleString('zh-CN'),
  ]);

  const summaryRows = [
    [],
    ['=== 成绩汇总 ==='],
    ['总分', scoreBreakdown.totalScore],
    ['评级', scoreBreakdown.rating],
    ['正确率', `${scoreBreakdown.accuracy.toFixed(1)}%`],
    ['正确操作', scoreBreakdown.correctOperations],
    ['错误操作', scoreBreakdown.wrongOperations],
    ['超时次数', scoreBreakdown.timeouts],
    ['存活回合', scoreBreakdown.roundsSurvived],
  ];

  const csvContent = [
    headers.join(','),
    ...operationRows.map(row => row.join(',')),
    ...summaryRows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `futures-risk-game-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getOperationTypeName = (type: string): string => {
  const names: Record<string, string> = {
    add_margin: '追加保证金',
    partial_close: '部分平仓',
    full_close: '全部平仓',
    skip: '跳过',
    auto_liquidate: '自动强平',
  };
  return names[type] || type;
};

export const generateScoreBreakdown = (
  operationLogs: OperationLog[],
  _liquidationRecords: LiquidationRecord[],
  _totalRounds: number,
  roundsCompleted: number,
  totalScore: number
): ScoreBreakdown => {
  const correctOperations = operationLogs.filter(
    log => log.result === 'success' && log.scoreChange > 0
  ).length;
  const wrongOperations = operationLogs.filter(
    log => log.result === 'success' && log.scoreChange < 0
  ).length;
  const timeouts = operationLogs.filter(
    log => log.operator === 'system'
  ).length;

  const accuracy = operationLogs.length > 0
    ? (correctOperations / operationLogs.length) * 100
    : 0;

  let rating: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
  if (totalScore >= 900) rating = 'S';
  else if (totalScore >= 800) rating = 'A';
  else if (totalScore >= 700) rating = 'B';
  else if (totalScore >= 600) rating = 'C';

  return {
    correctOperations,
    wrongOperations,
    timeouts,
    roundsSurvived: roundsCompleted,
    totalScore,
    rating,
    accuracy,
  };
};
