import type { Package, SortingLine, GameException, QueueStrategy, PathStrategy, GameConfig } from './types';
import { EXCEPTION_PENALTIES } from '../config/constants';

export function fifoSort(packages: Package[]): Package[] {
  return [...packages].sort((a, b) => a.createdAt - b.createdAt);
}

export function prioritySort(packages: Package[]): Package[] {
  return [...packages].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.createdAt - b.createdAt;
  });
}

export function sjfSort(packages: Package[]): Package[] {
  return [...packages].sort((a, b) => {
    if (a.processingTime !== b.processingTime) return a.processingTime - b.processingTime;
    return a.createdAt - b.createdAt;
  });
}

export function sortPackages(packages: Package[], strategy: QueueStrategy): Package[] {
  switch (strategy) {
    case 'fifo':
      return fifoSort(packages);
    case 'priority':
      return prioritySort(packages);
    case 'sjf':
      return sjfSort(packages);
    default:
      return fifoSort(packages);
  }
}

let roundRobinCounter = 0;

export function selectLineByStrategy(
  pkg: Package,
  lines: SortingLine[],
  strategy: PathStrategy
): number {
  switch (strategy) {
    case 'round-robin': {
      const availableLines = lines.filter(l => l.status !== 'blocked' && l.currentLoad < l.capacity);
      if (availableLines.length === 0) return -1;
      roundRobinCounter = (roundRobinCounter + 1) % availableLines.length;
      return availableLines[roundRobinCounter].id;
    }
    case 'shortest-queue': {
      const availableLines = lines.filter(l => l.status !== 'blocked' && l.currentLoad < l.capacity);
      if (availableLines.length === 0) return -1;
      return availableLines.reduce((prev, curr) => 
        curr.currentLoad < prev.currentLoad ? curr : prev
      ).id;
    }
    case 'destination-match': {
      const matchingLine = lines.find(l => 
        l.destination === pkg.destination && l.status !== 'blocked' && l.currentLoad < l.capacity
      );
      if (matchingLine) return matchingLine.id;
      const availableLines = lines.filter(l => l.status !== 'blocked' && l.currentLoad < l.capacity);
      if (availableLines.length === 0) return -1;
      return availableLines.reduce((prev, curr) => 
        curr.currentLoad < prev.currentLoad ? curr : prev
      ).id;
    }
    default: {
      const availableLines = lines.filter(l => l.status !== 'blocked' && l.currentLoad < l.capacity);
      if (availableLines.length === 0) return -1;
      return availableLines[0].id;
    }
  }
}

export function detectUrgentStarvation(
  packages: Package[],
  currentTime: number,
  threshold: number
): GameException[] {
  return packages
    .filter(p => p.type === 'urgent' && p.status === 'waiting')
    .filter(p => (currentTime - p.createdAt) > threshold)
    .map(p => ({
      id: `starvation-${p.id}-${currentTime}`,
      type: 'urgent_starvation',
      timestamp: currentTime,
      description: `急件 ${p.id.slice(0, 6)} 已等待 ${Math.floor(currentTime - p.createdAt)} 秒未处理`,
      involvedPackageIds: [p.id],
      involvedLineIds: [],
      penalty: EXCEPTION_PENALTIES.urgent_starvation,
      resolved: false,
    }));
}

export function detectLineCongestion(
  lines: SortingLine[],
  currentTime: number,
  threshold: number
): GameException[] {
  return lines
    .filter(line => line.currentLoad >= line.capacity * threshold)
    .map(line => ({
      id: `congestion-${line.id}-${currentTime}`,
      type: 'line_congestion',
      timestamp: currentTime,
      description: `分拣线 ${line.name} 拥堵，负载率 ${Math.round(line.currentLoad / line.capacity * 100)}%`,
      involvedPackageIds: line.queue.map(p => p.id),
      involvedLineIds: [line.id],
      penalty: EXCEPTION_PENALTIES.line_congestion,
      resolved: false,
    }));
}

export function detectDamagedFailure(
  packages: Package[],
  currentTime: number
): GameException[] {
  return packages
    .filter(p => p.type === 'damaged' && p.status === 'failed')
    .filter(p => !p.completedAt || p.completedAt > p.deadline)
    .map(p => ({
      id: `damaged-${p.id}-${currentTime}`,
      type: 'damaged_failure',
      timestamp: currentTime,
      description: `破损件 ${p.id.slice(0, 6)} 处理失败，需要额外处理时间`,
      involvedPackageIds: [p.id],
      involvedLineIds: p.assignedLine ? [p.assignedLine] : [],
      penalty: EXCEPTION_PENALTIES.damaged_failure,
      resolved: false,
    }));
}

export function detectDeadlineMissed(
  packages: Package[],
  currentTime: number
): GameException[] {
  return packages
    .filter(p => p.status === 'waiting' && currentTime > p.deadline)
    .map(p => ({
      id: `deadline-${p.id}-${currentTime}`,
      type: 'deadline_missed',
      timestamp: currentTime,
      description: `包裹 ${p.id.slice(0, 6)} 已超过截止时间 ${Math.floor(currentTime - p.deadline)} 秒`,
      involvedPackageIds: [p.id],
      involvedLineIds: p.assignedLine ? [p.assignedLine] : [],
      penalty: EXCEPTION_PENALTIES.deadline_missed,
      resolved: false,
    }));
}

export function detectAllExceptions(
  packages: Package[],
  lines: SortingLine[],
  currentTime: number,
  config: GameConfig
): GameException[] {
  return [
    ...detectUrgentStarvation(packages, currentTime, config.starvationThreshold),
    ...detectLineCongestion(lines, currentTime, config.congestionThreshold),
    ...detectDamagedFailure(packages, currentTime),
    ...detectDeadlineMissed(packages, currentTime),
  ];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
