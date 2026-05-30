import { Contestant, Score, Submission, RankingRule } from '../types';

export const sampleContestants: Contestant[] = [
  { id: 'c001', name: '张明远', team: '清华大学', category: '本科组' },
  { id: 'c002', name: '李思琪', team: '北京大学', category: '本科组' },
  { id: 'c003', name: '王浩然', team: '浙江大学', category: '本科组' },
  { id: 'c004', name: '刘雨萱', team: '上海交大', category: '本科组' },
  { id: 'c005', name: '陈子轩', team: '复旦大学', category: '本科组' },
  { id: 'c006', name: '杨雪婷', team: '南京大学', category: '本科组' },
  { id: 'c007', name: '赵文博', team: '中科大', category: '本科组' },
  { id: 'c008', name: '周佳怡', team: '武汉大学', category: '本科组' },
];

export const sampleScores: Score[] = [
  {
    id: 's001',
    contestantId: 'c001',
    totalScore: 380,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si001', category: '基础题', points: 100, weight: 1 },
      { id: 'si002', category: '算法题', points: 150, weight: 1.2 },
      { id: 'si003', category: '创新题', points: 130, weight: 1 },
    ],
  },
  {
    id: 's002',
    contestantId: 'c002',
    totalScore: 390,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si004', category: '基础题', points: 95, weight: 1 },
      { id: 'si005', category: '算法题', points: 160, weight: 1.2 },
      { id: 'si006', category: '创新题', points: 135, weight: 1 },
    ],
  },
  {
    id: 's003',
    contestantId: 'c003',
    totalScore: 380,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si007', category: '基础题', points: 100, weight: 1 },
      { id: 'si008', category: '算法题', points: 150, weight: 1.2 },
      { id: 'si009', category: '创新题', points: 130, weight: 1 },
    ],
  },
  {
    id: 's004',
    contestantId: 'c004',
    totalScore: 370,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si010', category: '基础题', points: 90, weight: 1 },
      { id: 'si011', category: '算法题', points: 155, weight: 1.2 },
      { id: 'si012', category: '创新题', points: 125, weight: 1 },
    ],
  },
  {
    id: 's005',
    contestantId: 'c005',
    totalScore: 365,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si013', category: '基础题', points: 85, weight: 1 },
      { id: 'si014', category: '算法题', points: 160, weight: 1.2 },
      { id: 'si015', category: '创新题', points: 120, weight: 1 },
    ],
  },
  {
    id: 's006',
    contestantId: 'c006',
    totalScore: 365,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si016', category: '基础题', points: 95, weight: 1 },
      { id: 'si017', category: '算法题', points: 145, weight: 1.2 },
      { id: 'si018', category: '创新题', points: 125, weight: 1 },
    ],
  },
  {
    id: 's007',
    contestantId: 'c007',
    totalScore: 355,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si019', category: '基础题', points: 88, weight: 1 },
      { id: 'si020', category: '算法题', points: 152, weight: 1.2 },
      { id: 'si021', category: '创新题', points: 115, weight: 1 },
    ],
  },
  {
    id: 's008',
    contestantId: 'c008',
    totalScore: 350,
    calculatedAt: '2024-05-31T10:30:00',
    items: [
      { id: 'si022', category: '基础题', points: 92, weight: 1 },
      { id: 'si023', category: '算法题', points: 140, weight: 1.2 },
      { id: 'si024', category: '创新题', points: 118, weight: 1 },
    ],
  },
];

export const sampleSubmissions: Submission[] = [
  { id: 'sub001', contestantId: 'c001', submitTime: '2024-05-31T09:45:23', fileHash: 'a1b2c3d4' },
  { id: 'sub002', contestantId: 'c002', submitTime: '2024-05-31T09:58:12', fileHash: 'e5f6g7h8' },
  { id: 'sub003', contestantId: 'c003', submitTime: '2024-05-31T09:52:45', fileHash: 'i9j0k1l2' },
  { id: 'sub004', contestantId: 'c004', submitTime: '2024-05-31T09:55:33', fileHash: 'm3n4o5p6' },
  { id: 'sub005', contestantId: 'c005', submitTime: '2024-05-31T09:48:56', fileHash: 'q7r8s9t0' },
  { id: 'sub006', contestantId: 'c006', submitTime: '2024-05-31T10:01:22', fileHash: 'u1v2w3x4' },
  { id: 'sub007', contestantId: 'c007', submitTime: '2024-05-31T09:59:08', fileHash: 'y5z6a7b8' },
  { id: 'sub008', contestantId: 'c008', submitTime: '2024-05-31T09:51:17', fileHash: 'c9d0e1f2' },
];

export const defaultRankingRule: RankingRule = {
  id: 'rule_default',
  name: '标准竞赛规则',
  description: '加权总分优先，同分按提交时间排序',
  scoreWeights: [
    { category: '基础题', weight: 1 },
    { category: '算法题', weight: 1.2 },
    { category: '创新题', weight: 1 },
  ],
  tieBreakRules: [
    { order: 1, rule: 'submissionTime', ascending: true },
    { order: 2, rule: 'specificCategory', category: '算法题', ascending: false },
    { order: 3, rule: 'manual', ascending: true },
  ],
};

export const alternativeRankingRule: RankingRule = {
  id: 'rule_alt',
  name: '算法优先规则',
  description: '算法题权重更高，同分按算法题得分排序',
  scoreWeights: [
    { category: '基础题', weight: 0.8 },
    { category: '算法题', weight: 1.5 },
    { category: '创新题', weight: 1 },
  ],
  tieBreakRules: [
    { order: 1, rule: 'specificCategory', category: '算法题', ascending: false },
    { order: 2, rule: 'submissionTime', ascending: true },
  ],
};

export const sampleRules: RankingRule[] = [defaultRankingRule, alternativeRankingRule];
