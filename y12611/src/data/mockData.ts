import type { DataSource, CoastlineRecord, Anomaly, CanvasState, ProcessOpinion } from '../types';

const generateId = () => Math.random().toString(36).substring(7);

export const mockDataSources: DataSource[] = [
  {
    id: 'src-001',
    name: '2024年第一季度颜色规则表.xlsx',
    type: 'color_rule',
    uploadTime: new Date('2024-03-15'),
    fileName: '2024年第一季度颜色规则表.xlsx',
  },
  {
    id: 'src-002',
    name: '海岸线质量评分汇总表_旧版.xls',
    type: 'score_table',
    uploadTime: new Date('2024-03-10'),
    fileName: '海岸线质量评分汇总表_旧版.xls',
  },
  {
    id: 'src-003',
    name: '卫星影像底图坐标.csv',
    type: 'basemap_coords',
    uploadTime: new Date('2024-03-12'),
    fileName: '卫星影像底图坐标.csv',
  },
];

const createAnomaly = (recordId: string, type: any, severity: any, description: string, humanReadableReason: string, sourceMaterial: string): Anomaly => ({
  id: `anom-${generateId()}`,
  recordId,
  type,
  severity,
  description,
  humanReadableReason,
  resolved: false,
  sourceMaterial,
});

export const mockRecords: CoastlineRecord[] = [
  {
    id: 'rec-001',
    sourceId: 'src-001',
    segmentName: '渤海湾A段',
    colorRule: '#FF5722',
    score: 85,
    coordinates: [[117.2, 39.1], [117.3, 39.15], [117.4, 39.2]],
    unit: '米',
    remark: '数据正常',
    hasAnomaly: false,
    anomalies: [],
  },
  {
    id: 'rec-002',
    sourceId: 'src-001',
    segmentName: '胶州湾北段',
    colorRule: '#4CAF50',
    score: 92,
    coordinates: [[120.3, 36.1], [120.4, 36.15]],
    unit: undefined,
    remark: '补录：2024年2月现场核查数据',
    hasAnomaly: true,
    anomalies: [
      createAnomaly(
        'rec-002',
        'missing_unit',
        'medium',
        'unit字段缺失',
        '这份材料里没有填写测量单位，看其他记录都是"米"，请确认是否也是米',
        '2024年第一季度颜色规则表.xlsx - 第8行'
      ),
    ],
  },
  {
    id: 'rec-003',
    sourceId: 'src-002',
    segmentName: '杭州湾南岸',
    colorRule: '#FF5722',
    score: 45,
    coordinates: [[121.3, 30.2], [121.4, 30.25]],
    unit: '公里',
    remark: '旧表数据',
    hasAnomaly: true,
    anomalies: [
      createAnomaly(
        'rec-003',
        'score_abnormal',
        'high',
        '分数异常偏低',
        '评分只有45分，远低于正常范围(60-100)，需要核实是否录入错误',
        '海岸线质量评分汇总表_旧版.xls - Sheet2 第15行'
      ),
      createAnomaly(
        'rec-003',
        'color_mismatch',
        'medium',
        '颜色规则不匹配',
        '颜色标记为橙色(严重侵蚀)但分数对应应为红色，两者不一致',
        '2024年第一季度颜色规则表.xlsx vs 海岸线质量评分汇总表_旧版.xls'
      ),
    ],
  },
  {
    id: 'rec-004',
    sourceId: 'src-003',
    segmentName: '珠江口东侧',
    colorRule: '#2196F3',
    score: 78,
    coordinates: [[113.5, 22.3], [113.6, 22.35]],
    unit: '米',
    remark: '',
    hasAnomaly: true,
    anomalies: [
      createAnomaly(
        'rec-004',
        'coordinate_outlier',
        'high',
        '坐标超出预期范围',
        '坐标点与卫星底图不重合，可能是坐标系不同导致偏移了约500米',
        '卫星影像底图坐标.csv - 第23行'
      ),
    ],
  },
  {
    id: 'rec-005',
    sourceId: 'src-002',
    segmentName: '长江口北支',
    colorRule: '#9C27B0',
    score: 88,
    coordinates: [[121.8, 31.8], [121.9, 31.85]],
    unit: '米',
    remark: '图层：2023年数据叠加',
    hasAnomaly: true,
    anomalies: [
      createAnomaly(
        'rec-005',
        'layer_occlusion',
        'high',
        '图层遮挡',
        '2023年数据图层遮挡了2024年的新数据，看不到最新的海岸线描边被盖住了',
        '海岸线质量评分汇总表_旧版.xls - 图层顺序问题'
      ),
    ],
  },
  {
    id: 'rec-006',
    sourceId: 'src-001',
    segmentName: '辽东湾西岸',
    colorRule: '#FFC107',
    score: 0,
    coordinates: [[121.0, 40.5], [121.1, 40.55]],
    unit: '',
    remark: '漏填',
    hasAnomaly: true,
    anomalies: [
      createAnomaly(
        'rec-006',
        'missing_unit',
        'low',
        '单位为空字符串',
        '单位这栏是空的，需要补充填写',
        '2024年第一季度颜色规则表.xlsx - 第12行'
      ),
      createAnomaly(
        'rec-006',
        'score_abnormal',
        'medium',
        '分数为0',
        '评分为0，明显是忘记填了，正常应该在60分以上',
        '海岸线质量评分汇总表_旧版.xls - 第8行'
      ),
    ],
  },
];

export const mockCanvasStates: CanvasState[] = [
  {
    id: 'canvas-v1',
    recordId: 'rec-003',
    version: 1,
    snapshot: JSON.stringify({ color: '#FF5722', strokeWidth: 2, opacity: 0.8 }),
    timestamp: new Date('2024-03-16T10:00:00'),
    operation: 'create',
    description: '初始导入描边',
  },
  {
    id: 'canvas-v2',
    recordId: 'rec-003',
    version: 2,
    snapshot: JSON.stringify({ color: '#F44336', strokeWidth: 3, opacity: 0.9 }),
    timestamp: new Date('2024-03-16T10:15:00'),
    operation: 'modify',
    description: '调整颜色为红色（匹配分数',
  },
  {
    id: 'canvas-v3',
    recordId: 'rec-003',
    version: 3,
    snapshot: JSON.stringify({ color: '#FF5722', strokeWidth: 2, opacity: 0.8 }),
    timestamp: new Date('2024-03-16T10:20:00'),
    operation: 'undo',
    description: '撤销颜色调整',
  },
  {
    id: 'canvas-v4',
    recordId: 'rec-003',
    version: 4,
    snapshot: JSON.stringify({ color: '#F44336', strokeWidth: 3, opacity: 0.9 }),
    timestamp: new Date('2024-03-16T10:25:00'),
    operation: 'redo',
    description: '重做颜色调整',
  },
];

export const mockProcessOpinions: ProcessOpinion[] = [
  {
    id: 'op-001',
    anomalyId: 'anom-001',
    content: '已确认单位为米，与其他记录一致',
    createTime: new Date('2024-03-16T11:00:00'),
    author: '张编辑',
  },
  {
    id: 'op-002',
    anomalyId: 'anom-002',
    content: '分数确实偏低，已联系数据提供方确认',
    createTime: new Date('2024-03-16T14:30:00'),
    author: '李审核',
  },
];

export const anomalyTypeLabels: Record<string, string> = {
  missing_unit: '缺失单位',
  color_mismatch: '颜色不匹配',
  coordinate_outlier: '坐标异常',
  score_abnormal: '评分异常',
  layer_occlusion: '图层遮挡',
};

export const severityLabels: Record<string, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
};

export const dataSourceTypeLabels: Record<string, string> = {
  color_rule: '颜色规则表',
  score_table: '评分表',
  basemap_coords: '底图坐标',
};
