import type { PatrolReport } from '@/types';

export const patrolReports: PatrolReport[] = [
  {
    id: 'patrol-001',
    slopeId: 'slope-001',
    time: new Date('2026-05-27T08:00:00'),
    condition: 'good',
    snowCondition: '雪质密实，适合滑行',
    hazards: [],
    notes: '早间巡逻完成，雪道状况良好',
    patrolId: 'P001',
    source: '巡逻员移动端提交',
  },
  {
    id: 'patrol-002',
    slopeId: 'slope-002',
    time: new Date('2026-05-27T08:15:00'),
    condition: 'good',
    snowCondition: '雪面平整，无明显结冰',
    hazards: [],
    notes: '雪道状况良好，游客流量正常',
    patrolId: 'P001',
    source: '巡逻员移动端提交',
  },
  {
    id: 'patrol-003',
    slopeId: 'slope-003',
    time: new Date('2026-05-27T08:30:00'),
    condition: 'excellent',
    snowCondition: '昨夜新雪，粉雪质量极佳',
    hazards: [],
    notes: '雪质非常好，建议增加该区域巡逻频次',
    patrolId: 'P002',
    source: '巡逻员移动端提交',
  },
  {
    id: 'patrol-004',
    slopeId: 'slope-004',
    time: new Date('2026-05-27T08:45:00'),
    condition: 'fair',
    snowCondition: '部分区域有结冰现象',
    hazards: ['北坡区域结冰'],
    notes: '已在结冰区域放置警示标志，建议重点关注',
    patrolId: 'P002',
    source: '巡逻员移动端提交',
  },
  {
    id: 'patrol-005',
    slopeId: 'slope-005',
    time: new Date('2026-05-27T09:00:00'),
    condition: 'good',
    snowCondition: '雪质良好，能见度佳',
    hazards: [],
    notes: '高级道区域游客较少，状况良好',
    patrolId: 'P003',
    source: '巡逻员移动端提交',
  },
  {
    id: 'patrol-006',
    slopeId: 'slope-006',
    time: new Date('2026-05-27T09:15:00'),
    condition: 'poor',
    snowCondition: '坡度较大，部分区域雪层较薄',
    hazards: ['坡度陡峭', '岩石裸露风险'],
    notes: '专家道区域风险较高，已建议限制开放',
    patrolId: 'P003',
    source: '巡逻员移动端提交',
  },
  {
    id: 'patrol-007',
    slopeId: 'slope-004',
    time: new Date('2026-05-27T12:00:00'),
    condition: 'poor',
    snowCondition: '午后温度升高，雪面开始融化',
    hazards: ['雪质变软', '滑行速度不易控制'],
    notes: '已加强该区域巡逻，准备进行压雪作业',
    patrolId: 'P001',
    source: '巡逻员移动端提交',
  },
];

export const getPatrolReportsBySlopeId = (
  slopeId: string
): PatrolReport[] => {
  return patrolReports.filter((p) => p.slopeId === slopeId);
};

export const getLatestPatrolReport = (
  slopeId: string
): PatrolReport | undefined => {
  const reports = getPatrolReportsBySlopeId(slopeId);
  return reports.sort(
    (a, b) => b.time.getTime() - a.time.getTime()
  )[0];
};
