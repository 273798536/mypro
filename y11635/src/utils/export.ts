import { ExportData, WaterLevelPoint } from '../types/game';
import { OVERFLOW_LINE, SAFE_LEVEL, WARNING_LINE } from '../data/constants';

export function generateWaterLevelData(logs: { round: number; reservoirLevel: number }[]): WaterLevelPoint[] {
  return logs.map(log => ({
    round: log.round,
    level: Math.round(log.reservoirLevel * 10) / 10,
    safeLine: SAFE_LEVEL,
    warningLine: WARNING_LINE,
    overflowLine: OVERFLOW_LINE,
  }));
}

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportAsText(data: ExportData): string {
  const lines: string[] = [];
  
  lines.push('═'.repeat(50));
  lines.push('  水库闸门防洪棋 - 游戏结算报告');
  lines.push('═'.repeat(50));
  lines.push('');
  
  lines.push(`游戏状态: ${data.status === 'success' ? '成功通关' : data.status === 'failed' ? '游戏失败' : '进行中'}`);
  lines.push(`总得分: ${data.totalScore}`);
  
  if (data.failureReason) {
    lines.push(`失败原因: ${data.failureReason}`);
  }
  lines.push('');
  
  lines.push('─'.repeat(50));
  lines.push('  各回合操作记录');
  lines.push('─'.repeat(50));
  lines.push('');
  
  for (const log of data.logs) {
    lines.push(`回合 ${log.round}:`);
    lines.push(`  天气: ${log.weather.name}`);
    lines.push(`  上游来水: ${log.upstreamInflow}`);
    lines.push(`  闸门开度: ${log.gateOpening}%`);
    lines.push(`  水库水位: ${log.reservoirLevel.toFixed(1)}`);
    lines.push(`  预警状态: ${log.warningIssued ? '已发布' : '未发布'}`);
    lines.push(`  得分变化: ${log.scoreChange >= 0 ? '+' : ''}${log.scoreChange}`);
    if (log.events.length > 0) {
      lines.push(`  事件:`);
      for (const event of log.events) {
        lines.push(`    - ${event}`);
      }
    }
    lines.push('');
  }
  
  lines.push('─'.repeat(50));
  lines.push('  得分明细');
  lines.push('─'.repeat(50));
  lines.push('');
  
  for (const detail of data.scoreDetails) {
    lines.push(`[回合${detail.round}] ${detail.category}: ${detail.score >= 0 ? '+' : ''}${detail.score}`);
    lines.push(`  原因: ${detail.reason}`);
    lines.push('');
  }
  
  lines.push('═'.repeat(50));
  lines.push('  报告生成时间: ' + new Date().toLocaleString('zh-CN'));
  lines.push('═'.repeat(50));
  
  return lines.join('\n');
}

export function exportScoreBreakdown(data: ExportData): string {
  const lines: string[] = [];
  lines.push('回合,类别,得分,原因');
  
  for (const detail of data.scoreDetails) {
    const reason = detail.reason.replace(/,/g, '，');
    lines.push(`${detail.round},${detail.category},${detail.score},"${reason}"`);
  }
  
  return lines.join('\n');
}
