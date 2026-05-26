import { jsPDF } from 'jspdf';
import { GameState, ReportData } from '../types';
import { calculateFinalScore } from '../engine/scoring';

export function generateReportData(gameState: GameState): ReportData {
  const { finalScore, grade, summary } = calculateFinalScore(
    gameState.score,
    gameState.plots,
    gameState.currentRound
  );

  const successfulPlots = gameState.plots.filter(
    p => p.waterCurrent >= p.waterRequired * 0.8 && p.waterCurrent <= p.waterRequired * 1.2
  ).length;

  const failedPlots = gameState.plots.filter(
    p => p.waterCurrent < p.waterRequired * 0.5 || p.waterCurrent > p.waterRequired * 1.5
  ).length;

  const waterEfficiency = gameState.totalWaterUsed > 0
    ? Math.round(((gameState.totalWaterUsed - gameState.totalEvaporation) / gameState.totalWaterUsed) * 100)
    : 0;

  return {
    gameState,
    finalScore,
    anomalies: gameState.anomalies,
    actions: gameState.actionHistory,
    summary: {
      totalRounds: gameState.currentRound,
      successfulPlots,
      failedPlots,
      waterEfficiency
    }
  };
}

export function exportReportAsText(reportData: ReportData): string {
  const { gameState, finalScore, anomalies, actions, summary } = reportData;
  const { grade } = calculateFinalScore(gameState.score, gameState.plots, gameState.currentRound);

  let text = '========================================\n';
  text += '         农田灌溉报告\n';
  text += '========================================\n\n';
  text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  text += `游戏等级: ${grade}\n`;
  text += `最终得分: ${finalScore}\n\n`;

  text += '--- 游戏概览 ---\n';
  text += `总回合数: ${summary.totalRounds}\n`;
  text += `成功灌溉地块: ${summary.successfulPlots}/${gameState.plots.length}\n`;
  text += `失败地块: ${summary.failedPlots}\n`;
  text += `用水效率: ${summary.waterEfficiency}%\n`;
  text += `总用水量: ${gameState.totalWaterUsed} 单位\n`;
  text += `总蒸发量: ${gameState.totalEvaporation} 单位\n\n`;

  text += '--- 地块状态 ---\n';
  gameState.plots.forEach(plot => {
    text += `${plot.name} (${plot.cropType}):\n`;
    text += `  需水量: ${plot.waterRequired} 单位\n`;
    text += `  实际水量: ${plot.waterCurrent} 单位\n`;
    text += `  过度灌溉次数: ${plot.overwateredCount}\n\n`;
  });

  text += '--- 异常记录 ---\n';
  if (anomalies.length === 0) {
    text += '无异常记录\n\n';
  } else {
    anomalies.forEach((a, i) => {
      text += `${i + 1}. [回合${a.round}] ${a.message}\n`;
    });
    text += '\n';
  }

  text += '--- 操作历史 ---\n';
  actions.forEach((action, i) => {
    const valve = gameState.valves.find(v => v.id === action.valveId);
    const valvePos = valve ? `(${valve.position.row},${valve.position.col})` : '';
    text += `${i + 1}. [回合${action.round}] 阀门${action.valveId}${valvePos} ${action.action === 'open' ? '开启' : '关闭'}\n`;
  });

  text += '\n--- 数据来源 ---\n';
  text += '本报告数据来自农田灌溉阀门棋游戏系统\n';
  text += '灌溉算法: BFS水流路径计算\n';
  text += '异常检测: 干旱阈值50%需水量，过度灌溉>120%需水量\n';
  text += '蒸发模型: 根据天气类型动态计算\n';

  return text;
}

export function exportReportAsPDF(reportData: ReportData): void {
  const text = exportReportAsText(reportData);
  const doc = new jsPDF();
  
  doc.setFontSize(12);
  const lines = text.split('\n');
  let y = 15;
  
  lines.forEach(line => {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    doc.text(line, 14, y);
    y += 7;
  });

  doc.save(`农田灌溉报告_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
