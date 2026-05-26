import type { GameReport, HistoryRecord } from '@/types';

const REPORTS_KEY = 'archive_game_reports';
const HISTORY_KEY = 'archive_game_history';

export function saveReport(report: GameReport): void {
  const reports = getAllReports();
  reports.push(report);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function getReport(id: string): GameReport | null {
  const reports = getAllReports();
  return reports.find((r) => r.id === id) || null;
}

export function getAllReports(): GameReport[] {
  const data = localStorage.getItem(REPORTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveHistory(record: HistoryRecord): void {
  const history = getHistoryList();
  history.unshift(record);
  if (history.length > 50) {
    history.pop();
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistoryList(): HistoryRecord[] {
  const data = localStorage.getItem(HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getHistoryRecord(id: string): HistoryRecord | null {
  const history = getHistoryList();
  return history.find((r) => r.id === id) || null;
}

export function clearHistory(): void {
  localStorage.removeItem(REPORTS_KEY);
  localStorage.removeItem(HISTORY_KEY);
}

export function createHistoryRecord(report: GameReport): HistoryRecord {
  return {
    id: `history-${Date.now()}`,
    date: report.endTime,
    difficulty: report.difficulty,
    score: report.totalScore,
    accuracy: report.accuracy,
    duration: report.endTime - report.startTime,
    reportId: report.id,
  };
}
