import type {
  Draft,
  Sample,
  BoundaryRecord,
  SourceMaterial,
  StatsCard,
  DetailRow,
  CalculationResult,
  ChartDataPoint,
  FilterConfig,
} from '@/types';
import { defaultFilters } from '@/types';

const sourceMaterials: SourceMaterial[] = [
  {
    id: 'src-001',
    name: '2026年6月拓扑路径原始数据.csv',
    type: 'csv',
    url: '#source-csv-001',
    uploadTime: new Date('2026-06-15T09:30:00'),
  },
  {
    id: 'src-002',
    name: '老叶现场说明备注.docx',
    type: 'note',
    url: '#source-note-002',
    uploadTime: new Date('2026-06-18T14:20:00'),
  },
  {
    id: 'src-003',
    name: '历史答案草稿截图.png',
    type: 'screenshot',
    url: '#source-screenshot-003',
    uploadTime: new Date('2026-06-17T11:45:00'),
  },
  {
    id: 'src-004',
    name: '别名映射表.xlsx',
    type: 'excel',
    url: '#source-excel-004',
    uploadTime: new Date('2026-06-16T16:00:00'),
  },
];

const samples: Sample[] = [
  {
    id: 'sample-missing-001',
    type: 'missing',
    name: '缺字段样例 #A23',
    data: {
      pathId: 'P-2026-06-A23',
      expectedFields: ['startNode', 'endNode', 'weight', 'timestamp'],
      missingFields: ['weight'],
      rawValue: null,
    },
    branchResult: 'error',
    description: '拓扑路径数据缺少weight字段，无法计算路径长度，触发空值分支逻辑。',
  },
  {
    id: 'sample-alias-002',
    type: 'alias',
    name: '别名样例 #B17',
    data: {
      pathId: 'P-2026-06-B17',
      originalName: 'Node-Gateway-01',
      aliasName: '主入口节点',
      mappingStatus: 'resolved',
    },
    branchResult: 'warning',
    description: '节点名称存在别名映射，已通过别名表解析，但需确认映射关系的时效性。',
  },
  {
    id: 'sample-late-003',
    type: 'late',
    name: '晚到备注样例 #C42',
    data: {
      pathId: 'P-2026-06-C42',
      scheduledTime: '2026-06-20T08:00:00',
      arrivalTime: '2026-06-20T10:30:00',
      delayMinutes: 150,
      remark: '上游数据延迟，临时补录',
    },
    branchResult: 'warning',
    description: '数据晚到150分钟，已标记为延迟数据，纳入计算但需关注后续数据完整性。',
  },
];

const draft: Draft = {
  id: 'draft-001',
  content: `2026年6月拓扑路径分析草稿

路径总数：156条
异常路径：23条
待复核路径：8条

主要发现：
1. 节点N-07存在多条孤立路径
2. 凌晨2:00-4:00数据稀疏
3. 新增节点与主网连接不稳定`,
  teacherNote: `老叶补充说明（2026-06-21 现场）：

关于路径#A23的缺字段问题：这是第二批采集设备的数据，当时传感器校准出了问题，weight字段确实没采到。我跟运维小张确认过了，这批数据可以用相邻节点插值补全，但要在报告里注明。

关于别名问题#B17："主入口节点"就是"Node-Gateway-01"，上个月系统更名时遗留的别名，我已经在别名映射表里更新了，后续应该不会再有这个问题。

关于晚到数据#C42：那天凌晨机房网络波动，上游数据晚到了两个半小时。数据本身是完整的，就是时间戳有偏差，计算时注意按实际到达时间排序。`,
  importTime: new Date('2026-06-20T15:30:00'),
  samples,
};

const boundaryRecords: BoundaryRecord[] = [
  {
    id: 'boundary-empty-001',
    type: 'empty',
    valueBefore: null,
    valueAfter: null,
    threshold: 1,
    explanation: '路径#A23的weight字段为空集合，共0条有效数据，无法进行拓扑排序计算。',
    sourceMaterial: sourceMaterials[0],
  },
  {
    id: 'boundary-zero-002',
    type: 'zero',
    valueBefore: 0,
    valueAfter: null,
    threshold: 10,
    explanation: '凌晨3:00-3:30时间段的路径计数为0，非预期零值，疑似数据采集中断。',
    sourceMaterial: sourceMaterials[2],
  },
  {
    id: 'boundary-extrapolate-003',
    type: 'extrapolate',
    valueBefore: 187.5,
    valueAfter: 150.0,
    threshold: 100,
    explanation: '路径#C42的外推延迟值187.5分钟超出阈值范围[50, 150]，已裁剪至150分钟。',
    sourceMaterial: sourceMaterials[1],
  },
];

const statsCards: StatsCard[] = [
  {
    id: 'stat-total',
    title: '总路径数',
    value: 156,
    change: 12,
    trend: 'up',
    icon: 'Route',
  },
  {
    id: 'stat-anomaly',
    title: '异常路径',
    value: 23,
    change: -5,
    trend: 'down',
    icon: 'AlertTriangle',
  },
  {
    id: 'stat-boundary',
    title: '边界异常',
    value: 8,
    change: 3,
    trend: 'up',
    icon: 'Zap',
  },
  {
    id: 'stat-review',
    title: '待复核',
    value: 3,
    change: 0,
    trend: 'neutral',
    icon: 'ClipboardCheck',
  },
];

const detailRows: DetailRow[] = [
  {
    id: 'row-001',
    sampleName: '缺字段样例 #A23',
    sampleType: 'missing',
    branchResult: 'error',
    boundaryType: 'empty',
    value: 0,
    operator: '老叶',
    time: new Date('2026-06-21T09:15:00'),
    note: '已标记为边界异常，待补全后重算',
  },
  {
    id: 'row-002',
    sampleName: '别名样例 #B17',
    sampleType: 'alias',
    branchResult: 'warning',
    boundaryType: 'zero',
    value: 0,
    operator: '老叶',
    time: new Date('2026-06-21T09:45:00'),
    note: '别名已解析，数据可正常使用',
  },
  {
    id: 'row-003',
    sampleName: '晚到备注样例 #C42',
    sampleType: 'late',
    branchResult: 'warning',
    boundaryType: 'extrapolate',
    value: 150,
    operator: '老叶',
    time: new Date('2026-06-21T10:30:00'),
    note: '外推值已裁剪，需关注后续数据',
  },
  {
    id: 'row-004',
    sampleName: '正常路径 #D08',
    sampleType: 'missing',
    branchResult: 'normal',
    value: 45.6,
    operator: '系统',
    time: new Date('2026-06-21T08:00:00'),
    note: '无异常',
  },
  {
    id: 'row-005',
    sampleName: '正常路径 #E12',
    sampleType: 'alias',
    branchResult: 'normal',
    value: 78.2,
    operator: '系统',
    time: new Date('2026-06-21T08:05:00'),
    note: '无异常',
  },
];

const chartData: ChartDataPoint[] = [
  { name: '00:00', value: 85, threshold: 100, isBoundary: false },
  { name: '02:00', value: 92, threshold: 100, isBoundary: false },
  { name: '03:00', value: 0, threshold: 100, isBoundary: true, boundaryType: 'zero' },
  { name: '04:00', value: 45, threshold: 100, isBoundary: true, boundaryType: 'empty' },
  { name: '06:00', value: 110, threshold: 100, isBoundary: false },
  { name: '08:00', value: 135, threshold: 100, isBoundary: false },
  { name: '10:00', value: 187.5, threshold: 100, isBoundary: true, boundaryType: 'extrapolate' },
  { name: '12:00', value: 145, threshold: 100, isBoundary: false },
  { name: '14:00', value: 128, threshold: 100, isBoundary: false },
  { name: '16:00', value: 95, threshold: 100, isBoundary: false },
];

export function getMockDraft(): Draft {
  return draft;
}

export function getMockSamples(): Sample[] {
  return samples;
}

export function getMockBoundaryRecords(): BoundaryRecord[] {
  return boundaryRecords;
}

export function getMockSourceMaterials(): SourceMaterial[] {
  return sourceMaterials;
}

export function generateCalculationResult(
  filters: FilterConfig = defaultFilters
): CalculationResult {
  const filteredDetails = detailRows.filter((row) => {
    if (!filters.sampleTypes.includes(row.sampleType)) return false;
    if (!filters.branchResults.includes(row.branchResult)) return false;
    if (row.boundaryType && !filters.boundaryTypes.includes(row.boundaryType)) return false;
    return true;
  });

  const anomalyCount = filteredDetails.filter(
    (r) => r.branchResult === 'warning' || r.branchResult === 'error'
  ).length;
  const boundaryCount = filteredDetails.filter((r) => r.boundaryType).length;
  const reviewCount = filteredDetails.filter((r) => r.branchResult === 'warning').length;

  const adjustedStats: StatsCard[] = [
    { ...statsCards[0], value: filteredDetails.length },
    { ...statsCards[1], value: anomalyCount },
    { ...statsCards[2], value: boundaryCount },
    { ...statsCards[3], value: reviewCount },
  ];

  return {
    id: `calc-${Date.now()}`,
    calcTime: new Date(),
    filters,
    stats: adjustedStats,
    details: filteredDetails,
    boundaryRecords,
    chartData,
  };
}

export function getSampleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    missing: '缺字段',
    alias: '别名',
    late: '晚到备注',
  };
  return labels[type] || type;
}

export function getBranchResultLabel(result: string): string {
  const labels: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    error: '错误',
  };
  return labels[result] || result;
}
