import type { PackageDestination } from '../engine/types';

export const LINE_COLORS: Record<number, string> = {
  0: '#165DFF',
  1: '#FF7D00',
  2: '#00B42A',
};

export const LINE_NAMES: Record<number, string> = {
  0: 'A 线',
  1: 'B 线',
  2: 'C 线',
};

export const LINE_DESTINATIONS: Record<number, PackageDestination> = {
  0: 'A',
  1: 'B',
  2: 'C',
};

export const PACKAGE_TYPE_COLORS: Record<string, string> = {
  normal: '#E5E6EB',
  urgent: '#F53F3F',
  damaged: '#FFAA00',
};

export const PACKAGE_TYPE_LABELS: Record<string, string> = {
  normal: '普通件',
  urgent: '急件',
  damaged: '破损件',
};

export const QUEUE_STRATEGY_LABELS: Record<string, string> = {
  fifo: '先进先出 (FIFO)',
  priority: '优先级排序',
  sjf: '最短作业优先 (SJF)',
};

export const PATH_STRATEGY_LABELS: Record<string, string> = {
  'round-robin': '轮询分配',
  'shortest-queue': '最短队列',
  'destination-match': '目的地匹配',
};

export const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  urgent_starvation: '急件饥饿',
  line_congestion: '路线堵塞',
  damaged_failure: '破损件处理失败',
  deadline_missed: '超时未送达',
};

export const EXCEPTION_PENALTIES: Record<string, number> = {
  urgent_starvation: 50,
  line_congestion: 30,
  damaged_failure: 40,
  deadline_missed: 25,
};

export const SCORE_VALUES = {
  BASE_PER_PACKAGE: 10,
  URGENCY_BONUS_MULTIPLIER: 2,
  EARLY_COMPLETION_BONUS: 5,
};
