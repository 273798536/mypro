import type { EventSeverity } from '../types/game';

export const EVENT_CONFIG = {
  volatilityStorm: {
    probability: 0.08,
    minInterval: 15,
    ivChangeRange: [0.05, 0.25] as [number, number],
  },
  deltaSurge: {
    probability: 0.1,
    minInterval: 10,
    deltaChangeRange: [0.1, 0.3] as [number, number],
  },
  gammaGate: {
    probability: 0.05,
    minInterval: 30,
    delayRange: [5, 15] as [number, number],
    gammaChangeRange: [0.02, 0.08] as [number, number],
  },
  marginWarning: {
    probability: 0.06,
    minInterval: 20,
  },
  compoundEvent: {
    probability: 0.03,
    minInterval: 45,
  },
  infoConflict: {
    probability: 0.04,
    minInterval: 25,
  },
};

export const DEDUCTION_RULES: Record<string, { points: number; reason: string }> = {
  unhandled_volatility: { points: 50, reason: '未及时应对波动率风暴' },
  delta_mismatch: { points: 30, reason: 'Delta对冲不及时' },
  gamma_gate_misjudgment: { points: 40, reason: 'Gamma门延迟数据判断错误' },
  conflict_wrong_resolution: { points: 60, reason: '三方信息冲突判断错误' },
  conflict_no_trace: { points: 20, reason: '信息冲突未在10秒内留痕' },
  conflict_timeout: { points: 30, reason: '留痕后30秒内未做出判断' },
  direction_mistake: { points: 45, reason: '方向误判' },
  margin_call: { points: 70, reason: '保证金不足触发追缴' },
  margin_liquidation: { points: 150, reason: '保证金爆仓，游戏结束' },
  late_arrival_misjudgment: { points: 35, reason: '晚到数据判断错误' },
  compound_event_failure: { points: 100, reason: '复合事件处理失败' },
  order_misjudgment: { points: 25, reason: '事件先后顺序判断错误' },
};

export const BONUS_RULES: Record<string, { points: number; reason: string }> = {
  perfect_conflict_resolution: { points: 80, reason: '三方信息冲突完美处理' },
  early_volatility_response: { points: 40, reason: '波动率风暴提前响应' },
  delta_neutral_maintained: { points: 50, reason: '连续30秒维持Delta中性' },
  no_margin_warnings: { points: 60, reason: '全程无保证金警告' },
  correct_compound_event: { points: 120, reason: '复合事件处理正确' },
  correct_order_identification: { points: 20, reason: '正确识别事件先后顺序' },
  gamma_gate_correct_judgment: { points: 40, reason: 'Gamma门延迟数据判断正确' },
  all_events_handled: { points: 100, reason: '所有事件均及时处理' },
};

export const TIME_WEIGHTS = [
  { maxTime: 5, weight: 1.0, label: '5秒内' },
  { maxTime: 10, weight: 0.7, label: '5-10秒' },
  { maxTime: 30, weight: 0.3, label: '10秒以上' },
  { maxTime: Infinity, weight: 0, label: '未处理' },
];

export const MARGIN_RULES = {
  maintenanceRate: 0.15,
  warningLine: 1.5,
  callLine: 1.2,
  liquidationLine: 1.0,
};

export const SEVERITY_COLORS: Record<EventSeverity, string> = {
  low: 'text-neon-green',
  medium: 'text-neon-yellow',
  high: 'text-neon-red',
  critical: 'text-neon-red font-bold',
};

export const SEVERITY_BG_COLORS: Record<EventSeverity, string> = {
  low: 'bg-neon-green/20 border-neon-green/50',
  medium: 'bg-neon-yellow/20 border-neon-yellow/50',
  high: 'bg-neon-red/20 border-neon-red/50',
  critical: 'bg-neon-red/30 border-neon-red animate-pulse',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  volatility_storm: '波动率风暴',
  delta_surge: 'Delta突变',
  gamma_gate: 'Gamma门',
  margin_warning: '保证金警告',
  compound: '复合事件',
  info_conflict: '信息冲突',
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  volatility_storm: 'text-neon-purple',
  delta_surge: 'text-neon-cyan',
  gamma_gate: 'text-neon-yellow',
  margin_warning: 'text-neon-red',
  compound: 'text-neon-red font-bold',
  info_conflict: 'text-neon-yellow',
};

export const SETTLEMENT_RULES = `结算口径说明
============

1. 希腊值计算方法
   - Delta: N(d1) 看涨期权，N(d1)-1 看跌期权
   - Gamma: N'(d1)/(S*σ*√T)
   - Vega: S*N'(d1)*√T/100
   - Theta: 按年波动率折算为每日衰减

2. 时间权重
   - 事件处理时间在5秒内：全额计分
   - 5-10秒：70%计分
   - 10秒以上：30%计分
   - 未处理：0%

3. 冲突处理规则
   - 三者冲突时必须先点击"留痕"按钮，10秒内未留痕扣20分
   - 留痕后30秒内需做出判断，超时按错误处理
   - 判断标准：以标的价格变动方向为准，结合波动率变化幅度

4. 复合事件顺序认定
   - 按事件实际发生时间排序，而非玩家感知时间
   - 晚到数据标注"延迟X秒到达"
   - 处理顺序影响最终得分：正确识别先后顺序额外加20分

5. 保证金计算
   - 维持保证金 = 仓位名义价值 * 15%
   - 预警线：保证金比率 < 1.5
   - 追缴线：保证金比率 < 1.2
   - 爆仓线：保证金比率 < 1.0（游戏结束）

6. 得分计算
   - 基础分：1000分
   - 扣分：按事件类型和处理时间加权
   - 奖励：正确处理特殊事件获得
   - 总分 = 基础分 - 扣分合计 + 奖励合计
`;

export const GAME_CONFIG = {
  baseScore: 1000,
  maxDuration: 300,
  initialMargin: 100000,
  initialUnderlying: 100,
  initialStrike: 100,
  initialExpiry: 30,
  initialVolatility: 0.2,
  riskFreeRate: 0.05,
  initialQuantity: 100,
  shipSpeed: 2,
  deltaNeutralThreshold: 0.05,
};
