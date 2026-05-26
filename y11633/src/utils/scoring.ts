import type { ScoreItem, LevelConfig, OrderPriority } from '../types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function calculateOrderReward(
  priority: OrderPriority,
  timeRemaining: number,
  timeLimit: number,
  config: LevelConfig
): { base: number; efficiency: number } {
  const base = config.orderReward[priority];
  const efficiencyRatio = timeRemaining / timeLimit;
  const efficiency = efficiencyRatio > 0.5 ? Math.floor(base * (efficiencyRatio - 0.5)) : 0;
  return { base, efficiency };
}

export function createScoreItem(
  type: ScoreItem['type'],
  description: string,
  value: number,
  source: string
): ScoreItem {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    description,
    value,
    source,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getPriorityLabel(priority: OrderPriority): string {
  const labels = { high: '高', medium: '中', low: '低' };
  return labels[priority];
}

export function getPriorityColor(priority: OrderPriority): string {
  const colors = { high: 'text-red-500', medium: 'text-yellow-500', low: 'text-green-500' };
  return colors[priority];
}

export function getPriorityBgColor(priority: OrderPriority): string {
  const colors = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
  return colors[priority];
}
