import { ExportReport, GameState, PhysicsState, GameAction, TempPoint } from '@/types';

export function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function buildExportReport(
  gameState: GameState,
  physicsState: PhysicsState
): ExportReport {
  const { gameId, currentOrder, actions, startTime, score, exceptions, badRows } = gameState;
  const { temperatureHistory } = physicsState;

  if (!currentOrder || !score) {
    throw new Error('游戏未完成，无法生成报告');
  }

  const actionsWithDetails = actions.map((action, index) => {
    const tempBefore = index === 0 
      ? temperatureHistory[0]?.temperature || 25 
      : temperatureHistory.find(t => t.actionId === actions[index - 1]?.id)?.temperature || 25;
    const tempAfter = temperatureHistory.find(t => t.actionId === action.id)?.temperature || tempBefore;
    const scoreImpact = score.detail.find(d => d.actionId === action.id)?.deduction || 0;

    return {
      ...action,
      temperatureBefore: tempBefore,
      temperatureAfter: tempAfter,
      scoreImpact,
    };
  });

  const verification = verifyDataChain(gameState, physicsState);

  return {
    gameId,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(startTime + gameState.elapsedTime * 1000).toISOString(),
    order: currentOrder,
    actions: actionsWithDetails,
    temperatureCurve: temperatureHistory,
    score,
    exceptions,
    badRows,
    dataChainVerification: verification,
  };
}

function verifyDataChain(
  gameState: GameState,
  physicsState: PhysicsState
): ExportReport['dataChainVerification'] {
  const lastHistoryPoint = physicsState.temperatureHistory[physicsState.temperatureHistory.length - 1];
  const thermometerConsistent = Math.abs(
    (lastHistoryPoint?.temperature || 0) - physicsState.temperature
  ) < 0.1;

  const curveMatchesHistory = physicsState.temperatureHistory.every((point, index) => {
    if (index === 0) return true;
    const prevPoint = physicsState.temperatureHistory[index - 1];
    return point.timestamp > prevPoint.timestamp;
  });

  const scoreUsesCurveData = gameState.score?.detail.every(detail => {
    return physicsState.temperatureHistory.some(t => t.actionId === detail.actionId);
  }) ?? false;

  return {
    thermometerConsistent,
    curveMatchesHistory,
    scoreUsesCurveData,
  };
}

export function exportToJSON(report: ExportReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportToCSV(report: ExportReport): string {
  const header = [
    '时间戳',
    '操作类型',
    '操作前温度(℃)',
    '操作后温度(℃)',
    '传入热量(J)',
    '传出热量(J)',
    '温度变化(℃)',
    '守恒校验',
    '异常类型',
    '扣分',
  ].join(',');

  const rows = report.actions.map(action => [
    new Date(action.timestamp).toLocaleTimeString(),
    action.type,
    action.temperatureBefore.toFixed(2),
    action.temperatureAfter.toFixed(2),
    action.heatExchange.Q_in.toFixed(2),
    action.heatExchange.Q_out.toFixed(2),
    action.heatExchange.deltaT.toFixed(2),
    action.heatExchange.conservationCheck ? '通过' : '失败',
    action.heatExchange.abnormalType || '-',
    action.scoreImpact.toFixed(1),
  ].join(','));

  return [header, ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatExceptionType(type: string): string {
  const typeMap: Record<string, string> = {
    temperature_bound: '温度越界',
    conservation_error: '热量守恒错误',
    timeout: '订单超时',
  };
  return typeMap[type] || type;
}

export function formatActionType(type: string): string {
  const typeMap: Record<string, string> = {
    heat: '加热',
    ice: '加冰',
    stir: '搅拌',
    pour: '倒咖啡',
  };
  return typeMap[type] || type;
}
