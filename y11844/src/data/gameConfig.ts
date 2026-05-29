import type { Resources } from '@/types';

export const GAME_CONFIG = {
  TOTAL_ROUNDS: 5,
  INITIAL_RESOURCES: {
    budget: 10000,
    electricity: 500,
    transport: 50,
  } as Resources,
  ANOMALY_DETECTION_ENABLED: true,
  CONFLICT_THRESHOLD_PERCENT: 5,
  DELAY_ROUNDS: 2,
  MAX_ACTIVITIES_PER_ROUND: 3,
  OFFSET_LIMIT_PER_ROUND: 2,
} as const;

export const ANOMALY_MESSAGES = {
  overdraft: {
    title: '预算透支警告',
    description: '所选活动组合超出了可用资源限额',
    severity: 'critical' as const,
  },
  double_offset: {
    title: '重复抵扣检测',
    description: '同一碳减排记录被多次用于抵扣',
    severity: 'critical' as const,
  },
  delay: {
    title: '低碳方案延迟',
    description: '低碳活动因供应链或施工问题延迟生效',
    severity: 'warning' as const,
  },
};

export const CATEGORY_LABELS: Record<string, string> = {
  energy: '能源优化',
  transport: '绿色交通',
  education: '环保宣传',
  planting: '碳汇造林',
};

export const CATEGORY_COLORS: Record<string, string> = {
  energy: 'text-yellow-400',
  transport: 'text-blue-400',
  education: 'text-purple-400',
  planting: 'text-green-400',
};
