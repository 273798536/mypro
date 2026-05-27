import type { RunRecord } from './types';

const KEY = 'gravity-slingshot-runs';

export function saveRun(run: RunRecord) {
  const all = getAllRuns();
  all.push(run);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getAllRuns(): RunRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getRun(id: string): RunRecord | undefined {
  return getAllRuns().find((r) => r.id === id);
}

export function getHighScore(levelId: string): number {
  const runs = getAllRuns().filter((r) => r.levelId === levelId);
  return runs.reduce((max, r) => Math.max(max, r.score.total), 0);
}
