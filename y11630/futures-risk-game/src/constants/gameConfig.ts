import type { GameConfig, Contract } from '../types';

export const GAME_CONFIG: GameConfig = {
  TOTAL_ROUNDS: 10,
  TIME_PER_ROUND: 30,
  INITIAL_ACCOUNTS: 4,
  WARNING_THRESHOLD: 100,
  DANGER_THRESHOLD: 120,
  EXTREME_PRICE_CHANGE: 5,
  SCORE_CORRECT_OPERATION: 100,
  SCORE_WRONG_OPERATION: -50,
  SCORE_TIMEOUT: -30,
  SCORE_PER_ROUND_SURVIVE: 50,
};

export const CONTRACTS: Contract[] = [
  { code: 'CU', name: '沪铜', multiplier: 5, marginRate: 0.08, initialPrice: 68000 },
  { code: 'AU', name: '沪金', multiplier: 1000, marginRate: 0.06, initialPrice: 450 },
  { code: 'RB', name: '螺纹钢', multiplier: 10, marginRate: 0.07, initialPrice: 3600 },
  { code: 'I', name: '铁矿石', multiplier: 100, marginRate: 0.10, initialPrice: 850 },
  { code: 'M', name: '豆粕', multiplier: 10, marginRate: 0.06, initialPrice: 3200 },
  { code: 'IF', name: '沪深300', multiplier: 300, marginRate: 0.12, initialPrice: 3800 },
];

export const ACCOUNT_NAMES = [
  '张三',
  '李四',
  '王五',
  '赵六',
  '钱七',
  '孙八',
  '周九',
  '吴十',
];

export const MARKET_EVENTS = {
  normal_up: [
    { description: '宏观数据利好', weight: 1 },
    { description: '库存下降超预期', weight: 1 },
    { description: '需求回暖', weight: 1 },
    { description: '政策利好', weight: 0.5 },
  ],
  normal_down: [
    { description: '宏观数据不及预期', weight: 1 },
    { description: '库存累积', weight: 1 },
    { description: '需求疲软', weight: 1 },
    { description: '政策收紧预期', weight: 0.5 },
  ],
  extreme_up: [
    { description: '【极端行情】突发供应中断！', weight: 1 },
    { description: '【极端行情】地缘政治冲突升级！', weight: 1 },
    { description: '【极端行情】重大政策利好！', weight: 0.5 },
  ],
  extreme_down: [
    { description: '【极端行情】系统性风险爆发！', weight: 1 },
    { description: '【极端行情】黑天鹅事件！', weight: 1 },
    { description: '【极端行情】重大利空突袭！', weight: 0.5 },
  ],
};

export const LIQUIDATION_REASONS = {
  risk_too_high: '风险度超过阈值，触发强制平仓',
  no_margin_added: '未及时追加保证金，触发强制平仓',
  extreme_market: '极端行情下，风险快速恶化',
  system_auto: '操作超时，系统自动强平',
};

export const OPERATION_REASONS = {
  add_margin_proactive: '主动追加保证金，降低风险',
  add_margin_warning: '收到预警后追加保证金',
  add_margin_danger: '高风险状态下紧急追加保证金',
  partial_close_proactive: '主动减仓，控制风险',
  partial_close_warning: '预警后部分平仓',
  full_close_danger: '高风险下全部平仓',
  full_close_liquidation: '强制平仓',
  skip_safe: '风险可控，选择观望',
  skip_warning: '收到预警但未采取行动',
};
