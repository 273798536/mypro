import type { FlightReport, GameState } from '../types/game';
import { SETTLEMENT_RULES } from './constants';
import { generateId } from './eventGenerator';

const STORAGE_KEYS = {
  FLIGHT_REPORTS: 'flight_reports',
  LAST_GAME_STATE: 'last_game_state',
  GAME_SETTINGS: 'game_settings',
};

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return defaultValue;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from storage:', error);
  }
}

export function generateFlightReport(state: GameState): FlightReport {
  const report: FlightReport = {
    reportId: generateId(),
    createdAt: new Date().toISOString(),
    totalScore: state.score.total,
    gameSummary: {
      duration: state.time,
      finalPosition: state.position,
      eventsCount: state.events.length,
      conflictsCount: state.conflicts.length,
    },
    deductions: state.score.riskDeductions,
    bonuses: state.score.bonuses,
    timeline: state.timeline,
    settlementRules: SETTLEMENT_RULES,
  };

  return report;
}

export function saveFlightReport(report: FlightReport): void {
  const reports = loadFromStorage<FlightReport[]>(STORAGE_KEYS.FLIGHT_REPORTS, []);
  reports.unshift(report);
  saveToStorage(STORAGE_KEYS.FLIGHT_REPORTS, reports.slice(0, 20));
}

export function getAllFlightReports(): FlightReport[] {
  return loadFromStorage<FlightReport[]>(STORAGE_KEYS.FLIGHT_REPORTS, []);
}

export function getFlightReport(reportId: string): FlightReport | null {
  const reports = getAllFlightReports();
  return reports.find((r) => r.reportId === reportId) || null;
}

export function deleteFlightReport(reportId: string): void {
  const reports = getAllFlightReports();
  const filtered = reports.filter((r) => r.reportId !== reportId);
  saveToStorage(STORAGE_KEYS.FLIGHT_REPORTS, filtered);
}

export function formatReportAsText(report: FlightReport): string {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║                期权希腊字母飞船 - 飞行报告                   ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`报告ID: ${report.reportId}`);
  lines.push(`生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('【游戏概况】');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`游戏时长: ${formatDuration(report.gameSummary.duration)}`);
  lines.push(`事件总数: ${report.gameSummary.eventsCount} 个`);
  lines.push(`信息冲突: ${report.gameSummary.conflictsCount} 次`);
  lines.push('');
  lines.push('最终仓位:');
  lines.push(`  类型: ${report.gameSummary.finalPosition.type === 'call' ? '看涨期权' : '看跌期权'}`);
  lines.push(`  行权价: ${report.gameSummary.finalPosition.strike.toFixed(2)}`);
  lines.push(`  标的价: ${report.gameSummary.finalPosition.underlying.toFixed(2)}`);
  lines.push(`  数量: ${report.gameSummary.finalPosition.quantity}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`【得分详情】  总分: ${report.totalScore}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  if (report.bonuses.length > 0) {
    lines.push('奖励项:');
    for (const bonus of report.bonuses) {
      lines.push(`  +${bonus.points.toString().padStart(4, ' ')}  ${bonus.reason}`);
    }
    lines.push('');
  }

  if (report.deductions.length > 0) {
    lines.push('扣分项:');
    for (const ded of report.deductions) {
      lines.push(`  -${ded.points.toString().padStart(4, ' ')}  ${ded.reason}`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('【事件时间线】');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  for (const item of report.timeline) {
    const timeStr = formatTime(item.timestamp);
    const delayStr = item.delayed && item.actualArrivalTime
      ? ` [延迟${(item.actualArrivalTime - item.timestamp).toFixed(0)}秒到达]`
      : '';
    lines.push(`  ${timeStr}  ${item.label}${delayStr}`);
  }
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('【结算口径】');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(report.settlementRules);

  return lines.join('\n');
}

export function shareReport(report: FlightReport): {
  text: string;
  url: string;
} {
  const text = formatReportAsText(report);
  const url = `${window.location.origin}/report/${report.reportId}`;

  return { text, url };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

export function downloadReport(report: FlightReport): void {
  const text = formatReportAsText(report);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `飞行报告-${report.reportId.slice(0, 8)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}分${secs}秒`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export { STORAGE_KEYS };
