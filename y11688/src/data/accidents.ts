import type { Accident } from '@/types';

export const accidents: Accident[] = [
  {
    id: 'acc-001',
    slopeId: 'slope-006',
    position: { x: 50, y: 8, z: 25 },
    type: 'fall',
    severity: 'critical',
    time: new Date('2026-05-27T14:30:00'),
    reporter: 'patrol-003',
    description: '高级道专家道区域滑雪者失控摔倒，造成腿部骨折',
    source: '巡逻员现场报告',
  },
  {
    id: 'acc-002',
    slopeId: 'slope-005',
    position: { x: 45, y: 6, z: -20 },
    type: 'collision',
    severity: 'high',
    time: new Date('2026-05-27T13:15:00'),
    reporter: 'patrol-002',
    description: '两名滑雪者在转弯处相撞，其中一人头部受轻伤',
    source: '巡逻员现场报告',
  },
  {
    id: 'acc-003',
    slopeId: 'slope-004',
    position: { x: 10, y: 5, z: -30 },
    type: 'fall',
    severity: 'medium',
    time: new Date('2026-05-27T11:45:00'),
    reporter: 'patrol-001',
    description: '滑雪者在冰面上滑倒，手腕扭伤',
    source: '巡逻员现场报告',
  },
  {
    id: 'acc-004',
    slopeId: 'slope-003',
    position: { x: -30, y: 4, z: -25 },
    type: 'equipment',
    severity: 'low',
    time: new Date('2026-05-27T10:30:00'),
    reporter: 'patrol-001',
    description: '滑雪板固定器故障，滑雪者安全停止',
    source: '巡逻员现场报告',
  },
  {
    id: 'acc-005',
    slopeId: 'slope-002',
    position: { x: 15, y: 3, z: 20 },
    type: 'medical',
    severity: 'medium',
    time: new Date('2026-05-27T15:00:00'),
    reporter: 'patrol-002',
    description: '滑雪者出现体力不支和轻微冻伤症状',
    source: '巡逻员现场报告',
  },
  {
    id: 'acc-006',
    slopeId: 'slope-006',
    position: { x: 55, y: 10, z: 35 },
    type: 'fall',
    severity: 'high',
    time: new Date('2026-05-26T14:00:00'),
    reporter: 'patrol-003',
    description: '专家道区域滑雪者高速冲出雪道',
    source: '历史数据导入',
  },
  {
    id: 'acc-007',
    slopeId: 'slope-004',
    position: { x: 5, y: 5, z: -15 },
    type: 'collision',
    severity: 'medium',
    time: new Date('2026-05-26T12:30:00'),
    reporter: 'patrol-001',
    description: '中级道入口处滑雪者相撞',
    source: '历史数据导入',
  },
];

export const getAccidentsBySlopeId = (slopeId: string): Accident[] => {
  return accidents.filter((a) => a.slopeId === slopeId);
};

export const getAccidentsBySeverity = (
  severity: Accident['severity']
): Accident[] => {
  return accidents.filter((a) => a.severity === severity);
};
