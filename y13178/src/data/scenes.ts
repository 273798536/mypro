import type { SceneAnnotation } from '@/types';

export const sceneAnnotations: SceneAnnotation[] = [
  {
    id: 'scene-001',
    title: '六月第二周散斑误差分析',
    description: '涵盖维修备注旧版、正常记录和口头备注的混合数据集，重点分析 6月5日阈值变动 和 6月13日突发跳变',
    dateRange: ['2026-06-01', '2026-06-14'],
    records: ['rec-001', 'rec-002', 'rec-003', 'rec-004', 'rec-005', 'rec-006', 'rec-007', 'rec-008', 'rec-009', 'rec-010', 'rec-011', 'rec-012', 'rec-013', 'rec-014'],
  },
];

export const defaultScene = sceneAnnotations[0];
