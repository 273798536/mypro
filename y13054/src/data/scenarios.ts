import type { Scenario, ImpactNode, ImpactLink } from '@/types';

export const scenarios: Scenario[] = [
  {
    id: 'S-A',
    name: '方案A（栈桥-奥帆中心沿海段）',
    conclusion: '方案A整体可行，但因BH-05撤回及BH-07/BH-08挂起，结论可信度受限，建议补测后重新评估。',
    confidence: 0.62,
    withdrawalImpact:
      'BH-05撤回后，方案A平均风速从7.42 m/s下调至7.31 m/s，年均发电量预估减少约2.8%，直接影响与方案B的经济性对比。',
    withdrawnPoints: ['BH-05'],
    suspendedPointGroups: [['BH-07', 'BH-08']],
  },
];

export const impactNodes: ImpactNode[] = [
  {
    id: 'N1',
    label: 'BH-05 现场上报',
    type: 'impacted',
    description: '2026-05-12 李工上报，读数 8.1 m/s',
  },
  {
    id: 'N2',
    label: '纳入方案A估算',
    type: 'impacted',
    description: '系统初次校验通过，计入平均值',
  },
  {
    id: 'N3',
    label: '方案A初步结论',
    type: 'impacted',
    description: '平均风速 7.42 m/s，优于方案B',
  },
  {
    id: 'N4',
    label: 'BH-05 GPS漂移发现',
    type: 'withdrawn',
    description: '坐标偏东约120米，2026-05-13 小赵撤回',
  },
  {
    id: 'N5',
    label: '重算方案A',
    type: 'impacted',
    description: '排除BH-05后重算平均风速',
  },
  {
    id: 'N6',
    label: '方案A修正结论',
    type: 'conclusion',
    description: '平均风速 7.31 m/s（-0.11），发电量预估值下调约2.8%',
  },
];

export const impactLinks: ImpactLink[] = [
  { from: 'N1', to: 'N2', label: '校验通过' },
  { from: 'N2', to: 'N3', label: '计入统计' },
  { from: 'N4', to: 'N5', label: '触发重算' },
  { from: 'N5', to: 'N6', label: '修正结论' },
];
