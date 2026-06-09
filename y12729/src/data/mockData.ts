import type { AnalysisSample, DraftData } from '@/types';
import { analyzeSample } from '@/utils/analysisPipeline';

const sample001 = analyzeSample(
  'sample-001',
  '测试用例 #A1 - 物流配送网络',
  [
    { id: 'S', label: '仓库S', capacity: 0, flow: 0, x: 60, y: 180 },
    { id: 'A', label: '分拣中心A', capacity: 0, flow: 0, x: 200, y: 80 },
    { id: 'B', label: '分拣中心B', capacity: 0, flow: 0, x: 200, y: 280 },
    { id: 'C', label: '中转节点C', capacity: 0, flow: 0, x: 360, y: 180 },
    { id: 'D', label: '配送站D', capacity: 0, flow: 0, x: 520, y: 80 },
    { id: 'E', label: '配送站E', capacity: 0, flow: 0, x: 520, y: 280 },
    { id: 'T', label: '终端T', capacity: 0, flow: 0, x: 660, y: 180 },
  ],
  [
    { id: 'e1', from: 'S', to: 'A', capacity: 10, flow: 0 },
    { id: 'e2', from: 'S', to: 'B', capacity: 8, flow: 0 },
    { id: 'e3', from: 'A', to: 'C', capacity: 5, flow: 0 },
    { id: 'e4', from: 'B', to: 'C', capacity: 7, flow: 0 },
    { id: 'e5', from: 'A', to: 'D', capacity: 4, flow: 0 },
    { id: 'e6', from: 'C', to: 'D', capacity: 3, flow: 0 },
    { id: 'e7', from: 'C', to: 'E', capacity: 6, flow: 0 },
    { id: 'e8', from: 'B', to: 'E', capacity: 2, flow: 0 },
    { id: 'e9', from: 'D', to: 'T', capacity: 9, flow: 0 },
    { id: 'e10', from: 'E', to: 'T', capacity: 8, flow: 0 },
  ],
  'S',
  'T'
);

const sample002 = analyzeSample(
  'sample-002',
  '测试用例 #B2 - 通信骨干网（待确认）',
  [
    { id: 'S', label: '核心节点S', capacity: 0, flow: 0, x: 60, y: 180 },
    { id: 'X', label: '骨干路由X', capacity: 0, flow: 0, x: 240, y: 100 },
    { id: 'Y', label: '骨干路由Y', capacity: 0, flow: 0, x: 240, y: 260 },
    { id: 'Z', label: '区域汇聚Z', capacity: 0, flow: 0, x: 420, y: 180 },
    { id: 'T', label: '边缘节点T', capacity: 0, flow: 0, x: 600, y: 180 },
  ],
  [
    { id: 'e1', from: 'S', to: 'X', capacity: 9999, flow: 0 },
    { id: 'e2', from: 'S', to: 'Y', capacity: 15, flow: 0 },
    { id: 'e3', from: 'X', to: 'Z', capacity: 12, flow: 0 },
    { id: 'e4', from: 'Y', to: 'Z', capacity: 0, flow: 0 },
    { id: 'e5', from: 'Z', to: 'T', capacity: 20, flow: 0 },
  ],
  'S',
  'T',
  [sample001]
);

const sample003 = analyzeSample(
  'sample-003',
  '测试用例 #C3 - 异常数据样本',
  [
    { id: 'S', label: '源点', capacity: 0, flow: 0, x: 80, y: 140 },
    { id: 'M', label: '中间节点', capacity: 0, flow: 0, x: 300, y: 140 },
    { id: 'T', label: '汇点', capacity: 0, flow: 0, x: 520, y: 140 },
    { id: 'U', label: '孤立节点U', capacity: 0, flow: 0, x: 300, y: 300 },
  ],
  [
    { id: 'e1', from: 'S', to: 'M', capacity: -5, flow: 0 },
    { id: 'e2', from: 'M', to: 'M', capacity: 10, flow: 0 },
    { id: 'e3', from: 'U', to: 'U', capacity: 8, flow: 0 },
  ],
  'S',
  'T',
  [sample001, sample002]
);

const sample004 = analyzeSample(
  'sample-004',
  '测试用例 #A1-dup - 物流配送网络副本',
  [
    { id: 'S', label: '仓库S', capacity: 0, flow: 0, x: 60, y: 180 },
    { id: 'A', label: '分拣中心A', capacity: 0, flow: 0, x: 200, y: 80 },
    { id: 'B', label: '分拣中心B', capacity: 0, flow: 0, x: 200, y: 280 },
    { id: 'C', label: '中转节点C', capacity: 0, flow: 0, x: 360, y: 180 },
    { id: 'D', label: '配送站D', capacity: 0, flow: 0, x: 520, y: 80 },
    { id: 'E', label: '配送站E', capacity: 0, flow: 0, x: 520, y: 280 },
    { id: 'T', label: '终端T', capacity: 0, flow: 0, x: 660, y: 180 },
  ],
  [
    { id: 'e1', from: 'S', to: 'A', capacity: 10, flow: 0 },
    { id: 'e2', from: 'S', to: 'B', capacity: 8, flow: 0 },
    { id: 'e3', from: 'A', to: 'C', capacity: 5, flow: 0 },
    { id: 'e4', from: 'B', to: 'C', capacity: 7, flow: 0 },
    { id: 'e5', from: 'A', to: 'D', capacity: 4, flow: 0 },
    { id: 'e6', from: 'C', to: 'D', capacity: 3, flow: 0 },
    { id: 'e7', from: 'C', to: 'E', capacity: 6, flow: 0 },
    { id: 'e8', from: 'B', to: 'E', capacity: 2, flow: 0 },
    { id: 'e9', from: 'D', to: 'T', capacity: 9, flow: 0 },
    { id: 'e10', from: 'E', to: 'T', capacity: 8, flow: 0 },
  ],
  'S',
  'T',
  [sample001, sample002, sample003]
);

sample001.reviewed = true;
sample001.reviewStatus = 'approved';
sample001.reviewComment = '数据完整，瓶颈分析合理，已通过';

export const initialSamples: AnalysisSample[] = [sample001, sample002, sample003, sample004];

export const initialDrafts: DraftData[] = [
  {
    id: 'draft-001',
    sampleId: 'sample-002',
    sampleName: '测试用例 #B2 - 通信骨干网（待确认）',
    nodes: [
      { id: 'S', label: '核心节点S', capacity: 0, flow: 0, x: 60, y: 180 },
      { id: 'X', label: '骨干路由X', capacity: 0, flow: 0, x: 240, y: 100 },
      { id: 'Y', label: '骨干路由Y', capacity: 0, flow: 0, x: 240, y: 260 },
      { id: 'Z', label: '区域汇聚Z', capacity: 0, flow: 0, x: 420, y: 180 },
      { id: 'W', label: '备份链路W', capacity: 0, flow: 0, x: 420, y: 320 },
      { id: 'T', label: '边缘节点T', capacity: 0, flow: 0, x: 600, y: 180 },
    ],
    edges: [
      { id: 'e1', from: 'S', to: 'X', capacity: 25, flow: 0 },
      { id: 'e2', from: 'S', to: 'Y', capacity: 15, flow: 0 },
      { id: 'e3', from: 'X', to: 'Z', capacity: 12, flow: 0 },
      { id: 'e4', from: 'Y', to: 'Z', capacity: 18, flow: 0 },
      { id: 'e5', from: 'Y', to: 'W', capacity: 6, flow: 0 },
      { id: 'e6', from: 'Z', to: 'T', capacity: 20, flow: 0 },
      { id: 'e7', from: 'W', to: 'T', capacity: 10, flow: 0 },
    ],
    arrivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    impacts: ['瓶颈位置可能偏移', '最大流数值可能变化'],
    diffSummary: '新增 1 个节点（备份链路W）；3 条边的容量或拓扑变化（S→X容量修正为25、Y→Z容量修正为18、新增Y→W→T路径）',
  },
  {
    id: 'draft-002',
    sampleId: 'sample-001',
    sampleName: '测试用例 #A1 - 物流配送网络',
    nodes: [
      { id: 'S', label: '仓库S', capacity: 0, flow: 0, x: 60, y: 180 },
      { id: 'A', label: '分拣中心A', capacity: 0, flow: 0, x: 200, y: 80 },
      { id: 'B', label: '分拣中心B', capacity: 0, flow: 0, x: 200, y: 280 },
      { id: 'C', label: '中转节点C', capacity: 0, flow: 0, x: 360, y: 180 },
      { id: 'D', label: '配送站D', capacity: 0, flow: 0, x: 520, y: 80 },
      { id: 'E', label: '配送站E', capacity: 0, flow: 0, x: 520, y: 280 },
      { id: 'T', label: '终端T', capacity: 0, flow: 0, x: 660, y: 180 },
    ],
    edges: [
      { id: 'e1', from: 'S', to: 'A', capacity: 10, flow: 0 },
      { id: 'e2', from: 'S', to: 'B', capacity: 8, flow: 0 },
      { id: 'e3', from: 'A', to: 'C', capacity: 12, flow: 0 },
      { id: 'e4', from: 'B', to: 'C', capacity: 7, flow: 0 },
      { id: 'e5', from: 'A', to: 'D', capacity: 4, flow: 0 },
      { id: 'e6', from: 'C', to: 'D', capacity: 8, flow: 0 },
      { id: 'e7', from: 'C', to: 'E', capacity: 6, flow: 0 },
      { id: 'e8', from: 'B', to: 'E', capacity: 2, flow: 0 },
      { id: 'e9', from: 'D', to: 'T', capacity: 9, flow: 0 },
      { id: 'e10', from: 'E', to: 'T', capacity: 8, flow: 0 },
    ],
    arrivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    impacts: ['瓶颈节点可能变化', '最大流结论需要重新验证'],
    diffSummary: '2 条边的容量变化（A→C容量从5提升至12、C→D容量从3提升至8，可能消除原瓶颈）',
  },
];
