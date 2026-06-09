import type { CameraView } from '@/types';

export const presetViews: CameraView[] = [
  {
    id: 'view-001',
    name: '全景俯视',
    description: '默认视角，观察整体水位分布',
    position: [0, 18, 20],
    target: [0, 3, 0],
    impactLevel: 'none',
    impactNote: '标准视角，不影响判断',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'view-002',
    name: '上游侧视',
    description: '观察上游闸门和水位差',
    position: [-15, 8, 0],
    target: [-4, 5, 0],
    impactLevel: 'low',
    impactNote: '侧面视角容易低估闸室水位的纵向分布差异',
    createdAt: Date.now() - 1800000,
  },
  {
    id: 'view-003',
    name: '阀门特写',
    description: '聚焦输水阀门区域',
    position: [4, 3, 6],
    target: [3, 1.5, 0],
    impactLevel: 'medium',
    impactNote: '特写视角会忽略左侧对称阀门状态，可能误判为单侧问题',
    createdAt: Date.now() - 900000,
  },
  {
    id: 'view-004',
    name: '底部仰视',
    description: '从闸室底部向上观察',
    position: [0, -5, 0],
    target: [0, 10, 0],
    impactLevel: 'high',
    impactNote: '仰视视角严重压缩水位高度感，可能完全忽略0.6m的水位差！',
    createdAt: Date.now() - 600000,
  },
];
