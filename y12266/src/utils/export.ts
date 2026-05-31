import type { ScoreReport, ErrorType } from '../types';
import { ERROR_TYPE_NAMES } from '../data/musicTheory';

export function exportScoreToJSON(report: ScoreReport): string {
  return JSON.stringify(report, null, 2);
}

export function downloadScoreReport(report: ScoreReport): void {
  const dataStr = exportScoreToJSON(report);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `音阶魔法塔_成绩_${report.levelName}_${new Date(report.endTime).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

export function getErrorTypeName(errorType: ErrorType): string {
  return ERROR_TYPE_NAMES[errorType] || errorType;
}

export function getErrorTypeColor(errorType: ErrorType): string {
  const colors: Record<ErrorType, string> = {
    accidental_miss: '#FF6B6B',
    enharmonic_confusion: '#4ECDC4',
    chord_misattribution: '#FFE66D',
    tower_late: '#95E1D3'
  };
  return colors[errorType] || '#666';
}

export function generateAnalysisText(report: ScoreReport): string {
  const lines: string[] = [];
  
  lines.push('=== 音阶魔法塔 成绩分析报告 ===');
  lines.push(`关卡: ${report.levelName}`);
  lines.push(`游戏时间: ${formatTimestamp(report.startTime)} - ${formatTimestamp(report.endTime)}`);
  lines.push(`时长: ${formatDuration(report.duration)}`);
  lines.push('');
  lines.push(`总分: ${report.totalScore}`);
  lines.push(`正确率: ${(report.accuracy * 100).toFixed(1)}%`);
  lines.push(`最高连击: ${report.maxCombo}`);
  lines.push(`总判定次数: ${report.totalJudgments}`);
  lines.push(`正确次数: ${report.correctCount}`);
  lines.push('');
  lines.push('=== 错误类型分析 ===');
  
  const errorEntries = Object.entries(report.errorBreakdown)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (errorEntries.length === 0) {
    lines.push('无错误记录，表现完美！');
  } else {
    errorEntries.forEach(([type, count]) => {
      const percentage = report.totalJudgments > 0 
        ? ((count / report.totalJudgments) * 100).toFixed(1) 
        : '0';
      lines.push(`${getErrorTypeName(type as ErrorType)}: ${count}次 (${percentage}%)`);
    });
  }
  
  lines.push('');
  lines.push('=== 详细判定记录 ===');
  report.judgments.forEach((j, i) => {
    const status = j.isCorrect ? '✓ 正确' : '✗ 错误';
    const errors = j.errorTypes.length > 0 
      ? ` [${j.errorTypes.map(e => getErrorTypeName(e)).join(', ')}]` 
      : '';
    lines.push(`${i + 1}. ${status} 正确答案:${j.correctAnswer} 你的答案:${j.userAnswer}${errors}`);
    if (j.conflictDetected) {
      j.conflictDetails.forEach(d => lines.push(`   冲突: ${d}`));
    }
    lines.push(`   说明: ${j.explanation}`);
    lines.push('');
  });
  
  return lines.join('\n');
}
