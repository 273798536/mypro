import type { TransferWindow, Anomaly } from '@/types';

export function checkWindowMissed(window: TransferWindow, currentTime: number): Anomaly | null {
  if (window.isMissed) {
    return {
      id: `anomaly-window-${Date.now()}`,
      type: 'window_missed',
      description: `发射窗口错过：${window.targetPlanetName} 转移窗口已关闭`,
      stepIndex: -1,
      isResolved: false,
    };
  }

  if (currentTime > window.closeTime) {
    return {
      id: `anomaly-window-${Date.now()}`,
      type: 'window_missed',
      description: `发射窗口错过：${window.targetPlanetName} 窗口已于第 ${window.closeTime.toFixed(1)} 步关闭，当前第 ${currentTime.toFixed(1)} 步`,
      stepIndex: -1,
      isResolved: false,
    };
  }

  return null;
}

export function windowQuality(window: TransferWindow, currentTime: number): {
  quality: 'optimal' | 'good' | 'marginal' | 'poor';
  timeOffset: number;
} {
  const offset = Math.abs(currentTime - window.optimalTime);

  if (offset <= 0.3) return { quality: 'optimal', timeOffset: offset };
  if (offset <= 0.8) return { quality: 'good', timeOffset: offset };
  if (offset <= 1.2) return { quality: 'marginal', timeOffset: offset };
  return { quality: 'poor', timeOffset: offset };
}

export function adjustedFuelCost(window: TransferWindow, currentTime: number): number {
  const offset = Math.abs(currentTime - window.optimalTime);
  return window.fuelCost * (1 + offset * 0.5);
}

export function filterWindowsByTime(
  windows: TransferWindow[],
  currentTime: number
): { available: TransferWindow[]; missed: TransferWindow[] } {
  const available: TransferWindow[] = [];
  const missed: TransferWindow[] = [];

  for (const w of windows) {
    if (w.isMissed || currentTime > w.closeTime) {
      missed.push({ ...w, isMissed: true });
    } else {
      available.push(w);
    }
  }

  return { available, missed };
}
