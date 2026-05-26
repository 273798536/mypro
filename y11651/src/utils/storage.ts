import type { ReplayRecord } from '../types/game';

const STORAGE_KEYS = {
  REPLAYS: 'sonar_tracker_replays',
  HIGH_SCORES: 'sonar_tracker_high_scores',
  UNLOCKED_LEVELS: 'sonar_tracker_unlocked_levels'
};

const MAX_REPLAYS = 20;

export function saveReplay(replay: ReplayRecord): void {
  try {
    const replays = getReplays();
    replays.unshift(replay);
    
    if (replays.length > MAX_REPLAYS) {
      replays.pop();
    }
    
    localStorage.setItem(STORAGE_KEYS.REPLAYS, JSON.stringify(replays));
  } catch (error) {
    console.error('Failed to save replay:', error);
  }
}

export function getReplays(): ReplayRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPLAYS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load replays:', error);
    return [];
  }
}

export function getReplayById(id: string): ReplayRecord | undefined {
  const replays = getReplays();
  return replays.find(r => r.id === id);
}

export function deleteReplay(id: string): void {
  try {
    const replays = getReplays();
    const filtered = replays.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPLAYS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete replay:', error);
  }
}

export function clearReplays(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.REPLAYS);
  } catch (error) {
    console.error('Failed to clear replays:', error);
  }
}

export function getHighScore(levelId: number): number {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
    const scores = data ? JSON.parse(data) : {};
    return scores[levelId] || 0;
  } catch (error) {
    console.error('Failed to load high score:', error);
    return 0;
  }
}

export function updateHighScore(levelId: number, score: number): boolean {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
    const scores = data ? JSON.parse(data) : {};
    const currentHigh = scores[levelId] || 0;
    
    if (score > currentHigh) {
      scores[levelId] = score;
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to update high score:', error);
    return false;
  }
}

export function getUnlockedLevels(): number[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UNLOCKED_LEVELS);
    return data ? JSON.parse(data) : [1];
  } catch (error) {
    console.error('Failed to load unlocked levels:', error);
    return [1];
  }
}

export function unlockLevel(levelId: number): void {
  try {
    const unlocked = getUnlockedLevels();
    if (!unlocked.includes(levelId)) {
      unlocked.push(levelId);
      localStorage.setItem(STORAGE_KEYS.UNLOCKED_LEVELS, JSON.stringify(unlocked));
    }
  } catch (error) {
    console.error('Failed to unlock level:', error);
  }
}

export function isLevelUnlocked(levelId: number): boolean {
  const unlocked = getUnlockedLevels();
  return unlocked.includes(levelId) || levelId === 1;
}

export function exportReplayToJSON(replay: ReplayRecord): string {
  return JSON.stringify(replay, null, 2);
}

export function downloadReplay(replay: ReplayRecord): void {
  try {
    const jsonStr = exportReplayToJSON(replay);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonar_replay_${replay.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download replay:', error);
  }
}
