import { Timecode } from '../types';

export function parseTimecode(tc: Timecode): number {
  const parts = tc.split(':');
  if (parts.length !== 4) {
    throw new Error(`无效时码格式: ${tc}, 应为 HH:MM:SS:FF`);
  }
  const [hours, minutes, seconds, frames] = parts.map(Number);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + Math.round((frames / 25) * 1000);
}

export function formatTimecode(ms: number): Timecode {
  const totalSeconds = Math.floor(ms / 1000);
  const frames = Math.round(((ms % 1000) / 1000) * 25);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function calculateTimecodeDeviation(tc1: Timecode, tc2: Timecode): number {
  return parseTimecode(tc1) - parseTimecode(tc2);
}

export function formatDeviation(ms: number): string {
  const absMs = Math.abs(ms);
  const direction = ms > 0 ? '晚' : ms < 0 ? '早' : '同步';
  if (absMs === 0) return '0ms (同步)';
  if (absMs < 1000) return `${absMs}ms (${direction})`;
  const seconds = (absMs / 1000).toFixed(2);
  return `${seconds}s (${direction})`;
}

export function isDeviationHalfFrame(ms: number): boolean {
  const halfFrameMs = 20;
  return Math.abs(ms) <= halfFrameMs && Math.abs(ms) > 0;
}
