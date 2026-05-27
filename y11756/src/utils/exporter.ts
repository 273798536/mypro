import html2canvas from 'html2canvas';
import { GameState } from '../types/game.types';
import { formatPercent, formatCurrency } from './calculator';

export const exportToJSON = (game: GameState): void => {
  const exportData = {
    gameId: game.gameId,
    difficulty: game.difficulty,
    totalRounds: game.maxRounds,
    playedRounds: game.round,
    initialAssets: game.initialAssets,
    finalAssets: game.totalAssets,
    totalReturn: game.score?.totalReturn ?? 0,
    totalScore: game.score?.totalScore ?? 0,
    grade: game.score?.grade ?? 'N/A',
    netValueHistory: game.netValueHistory,
    tradeHistory: game.tradeHistory.map(t => ({
      round: t.round,
      industryId: t.industryId,
      action: t.action,
      weightChange: t.weightChange,
      price: t.price,
      fee: t.fee,
    })),
    eventHistory: game.eventHistory.map(e => ({
      round: e.round,
      title: e.title,
      type: e.type,
      source: e.source,
      impact: e.impact,
    })),
    riskWarnings: game.riskWarnings.map(w => ({
      type: w.type,
      severity: w.severity,
      message: w.message,
    })),
    totalFees: game.totalFees,
    score: game.score,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fund-manager-report-${game.gameId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToImage = async (elementId: string, filename: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element ${elementId} not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export to image failed:', error);
    throw error;
  }
};

export const generateReportText = (game: GameState): string => {
  if (!game.score) return '';

  const lines = [
    '═══════════════════════════════════════════════════════════════',
    '                    基金经理调仓赛 - 结算报告',
    '═══════════════════════════════════════════════════════════════',
    '',
    `📊 游戏ID: ${game.gameId}`,
    `🎯 难度等级: ${game.difficulty === 'easy' ? '简单' : game.difficulty === 'normal' ? '普通' : '困难'}`,
    `📅 游戏回合: ${game.round} / ${game.maxRounds}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '                           最终成绩',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `🏆 评级: ${game.score.grade}`,
    `⭐ 综合得分: ${game.score.totalScore} / 100`,
    `💰 总收益率: ${formatPercent(game.score.totalReturn)}`,
    `📈 风险调整收益: ${game.score.riskAdjustedReturn.toFixed(1)} / 100`,
    `📉 最大回撤: ${formatPercent(game.score.maxDrawdown)}`,
    `🎯 分散化得分: ${game.score.diversificationScore} / 100`,
    `💱 手续费效率: ${game.score.feeEfficiency} / 100`,
    `📰 事件响应得分: ${game.score.eventResponseScore} / 100`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '                        资产统计',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `初始资金: ${formatCurrency(game.initialAssets)}`,
    `最终资金: ${formatCurrency(game.totalAssets)}`,
    `累计盈亏: ${formatCurrency(game.totalAssets - game.initialAssets)}`,
    `累计手续费: ${formatCurrency(game.totalFees)}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '                        失败原因',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  if (game.score.failureReasons.length > 0) {
    game.score.failureReasons.forEach((reason, i) => {
      lines.push(`  ❌ ${i + 1}. ${reason}`);
    });
  } else {
    lines.push('  ✅ 表现优秀，无重大失误！');
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('                        投资建议');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  game.score.suggestions.forEach((suggestion, i) => {
    lines.push(`  💡 ${i + 1}. ${suggestion}`);
  });

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`                    报告生成时间: ${new Date().toLocaleString()}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
};

export const exportToText = (game: GameState): void => {
  const text = generateReportText(game);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fund-manager-report-${game.gameId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
