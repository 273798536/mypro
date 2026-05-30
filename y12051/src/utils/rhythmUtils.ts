import { JudgmentType, JudgmentWindows, JUDGMENT_WINDOWS, SYNCOPATION_PENALTY } from '../types';

export function calculateBeatDuration(bpm: number): number {
  return 60000 / bpm;
}

export function calculateTimingError(hitTime: number, targetTime: number): number {
  return hitTime - targetTime;
}

export function judgeTiming(
  timingError: number,
  sensitivity: 'easy' | 'normal' | 'hard',
  isSyncopated: boolean = false
): JudgmentType {
  const windows: JudgmentWindows = JUDGMENT_WINDOWS[sensitivity];
  const penalty = isSyncopated ? SYNCOPATION_PENALTY : 1;
  
  const absError = Math.abs(timingError);
  
  if (absError <= windows.perfect * penalty) {
    return 'perfect';
  } else if (absError <= windows.great * penalty) {
    return 'great';
  } else if (absError <= windows.good * penalty) {
    return 'good';
  } else if (timingError < 0) {
    return 'early';
  } else {
    return 'late';
  }
}

export function isWithinJudgmentWindow(
  timingError: number,
  sensitivity: 'easy' | 'normal' | 'hard'
): boolean {
  const windows = JUDGMENT_WINDOWS[sensitivity];
  return Math.abs(timingError) <= windows.good;
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimingError(error: number): string {
  const sign = error > 0 ? '+' : '';
  return `${sign}${error}ms`;
}

export function getDifficultyLabel(difficulty: number): string {
  const labels = ['', '简单', '普通', '困难', '专家', '大师'];
  return labels[difficulty] || '未知';
}

export function getDifficultyStars(difficulty: number): string {
  return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
}
