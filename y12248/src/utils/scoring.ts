import type { ScoreBreakdown } from '../types/game';

export type ScoreEventType = 
  | 'serve_success'
  | 'serve_dirty'
  | 'source_limit_exceeded'
  | 'customer_complaint'
  | 'cache_breakdown'
  | 'expired_misread';

export interface ScoreEvent {
  type: ScoreEventType;
  cacheHit?: boolean;
}

export function calculateScoreChange(event: ScoreEvent): { change: number; breakdown: Partial<ScoreBreakdown> } {
  switch (event.type) {
    case 'serve_success':
      const base = 10;
      const cacheHitBonus = event.cacheHit ? 5 : 0;
      return {
        change: base + cacheHitBonus,
        breakdown: { base, cacheHitBonus },
      };
    case 'serve_dirty':
      return {
        change: -20,
        breakdown: { dirtyDataPenalty: -20 },
      };
    case 'source_limit_exceeded':
      return {
        change: -15,
        breakdown: { sourceLimitPenalty: -15 },
      };
    case 'customer_complaint':
      return {
        change: -10,
        breakdown: { complaintPenalty: -10 },
      };
    case 'cache_breakdown':
      return {
        change: -30,
        breakdown: { breakdownPenalty: -30 },
      };
    case 'expired_misread':
      return {
        change: -15,
        breakdown: { dirtyDataPenalty: -15 },
      };
    default:
      return { change: 0, breakdown: {} };
  }
}

export function mergeScoreBreakdown(
  current: ScoreBreakdown,
  addition: Partial<ScoreBreakdown>
): ScoreBreakdown {
  return {
    base: current.base + (addition.base || 0),
    cacheHitBonus: current.cacheHitBonus + (addition.cacheHitBonus || 0),
    dirtyDataPenalty: current.dirtyDataPenalty + (addition.dirtyDataPenalty || 0),
    sourceLimitPenalty: current.sourceLimitPenalty + (addition.sourceLimitPenalty || 0),
    complaintPenalty: current.complaintPenalty + (addition.complaintPenalty || 0),
    breakdownPenalty: current.breakdownPenalty + (addition.breakdownPenalty || 0),
  };
}

export const SCORE_RULES = [
  { event: '正确出餐', score: '+10', description: '每笔订单正确完成基础分' },
  { event: '缓存命中', score: '+5', description: '节省回源成本奖励' },
  { event: '脏数据出餐', score: '-20', description: '给顾客过期菜，证据确凿' },
  { event: '回源限流', score: '-15', description: '并发回源超过阈值，系统压力过大' },
  { event: '顾客投诉', score: '-10', description: '顾客耐心值归零' },
  { event: '缓存击穿', score: '-30', description: '热点key过期，大量回源' },
  { event: '过期误读', score: '-15', description: '新版本覆盖过期标记导致误判' },
];
