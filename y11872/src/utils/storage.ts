import { HistoryVersion, PendingIssue } from '@/types';

const HISTORY_KEY = 'theater_visibility_history';
const ISSUES_KEY = 'theater_pending_issues';
const MAX_HISTORY = 50;

export function saveHistory(history: HistoryVersion[]): void {
  const trimmed = history.slice(-MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function loadHistory(): HistoryVersion[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveIssues(issues: PendingIssue[]): void {
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
}

export function loadIssues(): PendingIssue[] {
  try {
    const data = localStorage.getItem(ISSUES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function findDuplicateHash(hash: string, history: HistoryVersion[]): HistoryVersion | undefined {
  return history.find(h => h.configHash === hash);
}
