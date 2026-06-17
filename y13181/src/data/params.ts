import type { ParamVersion } from '@/types';

const BASELINE = '2026-06-18T09:00:00.000Z';

function hoursAgo(hours: number): string {
  return new Date(new Date(BASELINE).getTime() - hours * 3600000).toISOString();
}

export const paramVersion: ParamVersion = {
  version: 'v3.2.1',
  updatedAt: hoursAgo(48),
  description: '优化了极端值检测算法，调整了冷却塔CT-003的阈值基准',
  hasDiff: true,
  diffItems: [
    '极端值偏离度阈值：100% → 120%',
    'CT-003基准值：95 → 100',
    '新增材料名称匹配规则',
  ],
};

export const versionHistory: ParamVersion[] = [
  {
    version: 'v3.2.1',
    updatedAt: hoursAgo(48),
    description: '优化了极端值检测算法，调整了冷却塔CT-003的阈值基准',
    hasDiff: false,
  },
  {
    version: 'v3.1.0',
    updatedAt: hoursAgo(240),
    description: '新增口头备注标记功能，修复了材料名称匹配问题',
    hasDiff: false,
  },
  {
    version: 'v3.0.0',
    updatedAt: hoursAgo(720),
    description: '重构复核流程，支持多版本维修备注管理',
    hasDiff: false,
  },
];
