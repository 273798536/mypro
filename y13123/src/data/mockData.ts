import type {
  GraphNode,
  GraphEdge,
  Problem,
  ParamVersion,
  AbnormalPoint,
  HistoryRecord,
  WithdrawnItem,
  AddendumNote,
} from '@/types';

export const MOCK_NODES: GraphNode[] = [
  { id: 'A', label: '教学楼A', x: 80, y: 90, isAbnormal: false },
  { id: 'B', label: '实验楼B', x: 260, y: 55, isAbnormal: false },
  { id: 'C', label: '图书馆C', x: 450, y: 110, isAbnormal: true },
  { id: 'D', label: '食堂D', x: 180, y: 210, isAbnormal: false },
  { id: 'E', label: '宿舍E', x: 390, y: 230, isAbnormal: false },
  { id: 'F', label: '体育馆F', x: 560, y: 200, isAbnormal: true },
];

export const MOCK_EDGES: GraphEdge[] = [
  { from: 'A', to: 'B', weight: 4 },
  { from: 'A', to: 'D', weight: 2 },
  { from: 'B', to: 'C', weight: 3 },
  { from: 'B', to: 'D', weight: 5 },
  { from: 'C', to: 'E', weight: 2 },
  { from: 'C', to: 'F', weight: 6 },
  { from: 'D', to: 'E', weight: 3 },
  { from: 'E', to: 'F', weight: 4 },
];

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: 'P-20260601-01',
    start: 'A',
    end: 'C',
    distance: 9,
    unit: 'km',
    remark: '经教学楼-实验楼-图书馆，经典例题',
  },
  {
    id: 'P-20260601-02',
    start: 'A',
    end: 'F',
    distance: null,
    unit: '',
    remark: '单位待补：原草稿遗漏距离量纲',
  },
  {
    id: 'P-20260601-03',
    start: 'B',
    end: 'E',
    distance: 7,
    unit: 'km',
    remark: 'B-C-E 与 B-D-E 两条路径对比',
  },
  {
    id: 'P-20260601-04',
    start: 'D',
    end: 'F',
    distance: 7,
    unit: 'km',
    remark: 'D-E-F：最短路径经过异常节点 F',
  },
  {
    id: 'P-20260601-05',
    start: 'A',
    end: 'E',
    distance: 5,
    unit: 'km',
    remark: '课堂练习：A-D-E 验证',
  },
];

export const MOCK_PARAM_VERSION: ParamVersion = {
  version: 'v1.3',
  timestamp: '2026-06-12 09:24:18',
  algorithm: 'Dijkstra',
  nodeCount: 6,
  edgeCount: 8,
  weightRule: '无向图 / 正权边 / 对称权重 / 负权过滤',
  operator: '叶老师（老叶）',
};

export const MOCK_ABNORMAL_POINTS: AbnormalPoint[] = [
  {
    nodeId: 'C',
    problemId: 'P-20260601-01',
    description: '节点 C（图书馆）权重 3 与题目清单 P-01 距离 9 不一致，疑似跨路径叠加错误',
    severity: 'error',
  },
  {
    nodeId: 'F',
    problemId: 'P-20260601-04',
    description: '节点 F（体育馆）当日闭馆，原题路径不具备现实可达性，建议改道 E 侧',
    severity: 'warn',
  },
];

export const MOCK_HISTORY: HistoryRecord[] = [
  {
    id: 'H-001',
    timestamp: '2026-06-10 14:02',
    operator: '叶老师（老叶）',
    field: '算法类型',
    before: 'Floyd',
    after: 'Dijkstra',
    reason: '节点仅 6 个且全正权，改用 Dijkstra 更贴合教学节奏',
  },
  {
    id: 'H-002',
    timestamp: '2026-06-11 10:47',
    operator: '叶老师（老叶）',
    field: '节点 C 异常判定',
    before: '正常',
    after: '异常（误差）',
    reason: '复核时发现 P-01 与图上权重不一致，临时判定为误差点',
  },
];

export const MOCK_WITHDRAWN: WithdrawnItem[] = [
  {
    id: 'W-001',
    title: '题目 P-20260528-07「F 经 C 到 A 最短路」',
    withdrawnAt: '2026-06-09 16:30',
    operator: '叶老师（老叶）',
    reason: '权重数据沿用了上月版本，F-C 段应为 6 而非 5，整题撤回重做，避免误导学生。',
  },
];

export const MOCK_ADDENDUM: AddendumNote[] = [
  {
    id: 'N-001',
    content:
      '本次「最短路径图表解释」中节点 C（图书馆）权重 3 为临时施工道路绕行数据，与校园底图标注的 2.6km 有出入，已在异常点注明；下一班复核时请以 6 月 12 日后勤处最终测量值为准，如仍沿用此值请在解释中追加说明。——老叶 补',
    author: '叶老师（老叶）',
    addedAt: '2026-06-12 08:58',
  },
];

export const INITIAL_SHORTEST_PATH = ['A', 'D', 'E', 'F'];
export const INITIAL_EXPLANATION =
  '本次从 A（教学楼）到 F（体育馆）的最短路径为 A→D→E→F，总长度 9km（2+3+4）。选择 Dijkstra 算法，节点数 6、边数 8，所有权重为正且对称。异常点共 2 处：① 节点 C 与题目 P-01 距离存在口径差异；② 节点 F 当日闭馆，路径具备数学意义但不具备现实可达性，已在异常点单独标注。详细对照见左侧题目清单与右侧复核摘要卡。';
