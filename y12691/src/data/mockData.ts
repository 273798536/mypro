import type { Operator, Measurement, PointCloudSlice, IceModel3D, Conclusion, AuditEntry, ParameterSet, SyncIssue, ScenarioConfig } from '../types';

export const operators: Operator[] = [
  { id: 'op-001', name: '张明远', department: '北极科考队' },
  { id: 'op-002', name: '李雪琴', department: '数据处理中心' },
  { id: 'op-003', name: '王海涛', department: '运维主管' },
  { id: 'op-004', name: '陈冰心', department: '质量审核组' },
];

const baseDate = new Date('2026-06-01T08:00:00');

function generateMeasurements(): Measurement[] {
  const measurements: Measurement[] = [];
  const gridSize = 7;
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const idx = i * gridSize + j;
      const id = `measurement-${String(idx + 1).padStart(3, '0')}`;
      
      let thickness = 0.85 + Math.random() * 0.35;
      let isOutlier = false;
      let confidence = 0.85 + Math.random() * 0.15;
      
      if (idx === 23) {
        thickness = 15.2;
        isOutlier = true;
        confidence = 0.92;
      } else if (idx === 11) {
        thickness = 0.12;
        isOutlier = true;
        confidence = 0.88;
      } else if (idx === 38) {
        thickness = 3.85;
        isOutlier = true;
        confidence = 0.76;
      }
      
      measurements.push({
        id,
        timestamp: new Date(baseDate.getTime() + idx * 15 * 60 * 1000 + Math.random() * 5 * 60 * 1000),
        x: (i - gridSize / 2) * 15 + Math.random() * 3,
        y: (j - gridSize / 2) * 15 + Math.random() * 3,
        thickness: Math.round(thickness * 1000) / 1000,
        temperature: -1.8 + Math.random() * 0.5,
        salinity: 32.5 + Math.random() * 1.5,
        sensorId: `SNS-${String(100 + (idx % 5)).padStart(3, '0')}`,
        confidence: Math.round(confidence * 1000) / 1000,
        isOutlier,
        outlierReviewStatus: isOutlier ? (idx === 23 ? 'approved' : idx === 11 ? 'pending' : 'pending') : undefined,
        outlierReview: idx === 23 ? {
          reviewedBy: operators[3],
          reviewedAt: new Date('2026-06-03T09:15:00'),
          decision: 'remove',
          reason: '传感器故障，单次测量值异常偏高，同一时间段相邻测点数据正常',
          impactScope: ['conclusion-001', 'slice-003'],
        } : undefined,
        notes: idx === 38 ? '数据可疑，需人工复核' : undefined,
      });
    }
  }
  return measurements;
}

export const measurements = generateMeasurements();

export const models: IceModel3D[] = [
  {
    id: 'model-001',
    version: 'v1.2',
    createdAt: new Date('2026-06-01T14:23:15'),
    source: '机载LiDAR扫描数据',
    hasOldAnnotations: true,
    pointCount: 248563,
    boundingBox: {
      xMin: -60, xMax: 60,
      yMin: -60, yMax: 60,
      zMin: 0, zMax: 5,
    },
  },
];

export const slices: PointCloudSlice[] = [
  {
    id: 'slice-001',
    name: 'A区横断面 - 基准切片',
    timestamp: new Date('2026-06-01T10:30:00'),
    measurementIds: measurements.filter((_, i) => i < 17).map(m => m.id),
    thicknessRange: { min: 0.82, max: 1.21 },
    slicePosition: 0.33,
    hasOldAnnotations: false,
    status: 'finalized',
  },
  {
    id: 'slice-002',
    name: 'B区纵断面 - 中间切片',
    timestamp: new Date('2026-06-02T08:45:00'),
    measurementIds: measurements.filter((_, i) => i >= 16 && i < 34).map(m => m.id),
    thicknessRange: { min: 0.78, max: 1.35 },
    slicePosition: 0.5,
    hasOldAnnotations: true,
    oldAnnotations: ['旧版标记：此处疑似存在冰脊', '2026-05-28 初版备注：数据不完整'],
    status: 'reviewed',
  },
  {
    id: 'slice-003',
    name: 'C区横断面 - 问题切片',
    timestamp: new Date('2026-06-02T16:20:00'),
    measurementIds: measurements.filter((_, i) => i >= 32).map(m => m.id),
    thicknessRange: { min: 0.12, max: 15.2 },
    slicePosition: 0.67,
    hasOldAnnotations: true,
    oldAnnotations: ['风险备注：本切片含2个离群点待复核', '临时补充：2026-06-03 发现传感器数据漂移'],
    status: 'draft',
  },
];

export const parameters: ParameterSet = {
  id: 'param-001',
  name: '标准复核参数集',
  sigmaThreshold: 3,
  minConfidence: 0.8,
  thicknessTolerance: 0.1,
  outlierAction: 'review',
  version: 2,
  updatedAt: new Date('2026-06-02T11:30:00'),
  updatedBy: operators[1],
};

export const oldParameters: ParameterSet = {
  ...parameters,
  version: 1,
  sigmaThreshold: 2.5,
  minConfidence: 0.7,
  outlierAction: 'flag',
  updatedAt: new Date('2026-05-28T09:00:00'),
  updatedBy: operators[0],
};

export const conclusions: Conclusion[] = [
  {
    id: 'conclusion-001',
    version: 1,
    timestamp: new Date('2026-06-02T16:30:00'),
    author: operators[0],
    sliceId: 'slice-003',
    content: '初步分析：C区平均厚度1.05m，存在1个显著异常值（15.2m），需复核确认是否为测量误差。最大厚度3.85m，疑似冰脊结构。整体风险等级中等。',
    averageThickness: 1.05,
    maxThickness: 15.2,
    minThickness: 0.12,
    outlierCount: 3,
    riskLevel: 'medium',
    superseded: true,
    affectedPoints: ['measurement-012', 'measurement-024', 'measurement-039'],
  },
  {
    id: 'conclusion-002',
    version: 2,
    timestamp: new Date('2026-06-03T10:00:00'),
    author: operators[3],
    sliceId: 'slice-003',
    content: '修正分析：已剔除确认离群点（measurement-024，传感器故障），C区修正后平均厚度0.95m。剩余2个待复核点建议现场验证。最大厚度3.85m需进一步确认是否为真实冰脊。风险等级调整为低。',
    averageThickness: 0.95,
    maxThickness: 3.85,
    minThickness: 0.78,
    outlierCount: 2,
    riskLevel: 'low',
    superseded: false,
    supersededById: undefined,
    affectedPoints: ['measurement-012', 'measurement-039'],
  },
];

export const auditRecords: AuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date('2026-06-01T14:23:15'),
    operator: operators[0],
    operation: {
      type: 'create',
      target: { type: 'model', id: 'model-001', name: '三维海冰模型 v1.2' },
    },
    changes: [{ field: 'status', before: null, after: 'created' }],
    reason: '机载扫描完成，导入三维模型',
    impactScope: ['slice-001', 'slice-002', 'slice-003'],
  },
  {
    id: 'audit-002',
    timestamp: new Date('2026-06-02T11:30:00'),
    operator: operators[1],
    operation: {
      type: 'update',
      target: { type: 'parameter', id: 'param-001', name: '复核参数集' },
    },
    changes: [
      { field: 'sigmaThreshold', before: 2.5, after: 3 },
      { field: 'minConfidence', before: 0.7, after: 0.8 },
      { field: 'outlierAction', before: 'flag', after: 'review' },
    ],
    reason: '根据5月数据质量报告，放宽sigma阈值但提高置信度要求，改为人工复核离群点',
    impactScope: ['slice-001', 'slice-002', 'slice-003', 'conclusion-001'],
  },
  {
    id: 'audit-003',
    timestamp: new Date('2026-06-02T16:30:00'),
    operator: operators[0],
    operation: {
      type: 'create',
      target: { type: 'conclusion', id: 'conclusion-001', name: 'C区初步分析报告' },
    },
    changes: [{ field: 'status', before: null, after: 'created' }],
    reason: '完成C区切片初步分析',
    impactScope: ['slice-003'],
  },
  {
    id: 'audit-004',
    timestamp: new Date('2026-06-03T09:15:00'),
    operator: operators[3],
    operation: {
      type: 'review',
      target: { type: 'measurement', id: 'measurement-024', name: '测量点 #024' },
    },
    changes: [
      { field: 'outlierReviewStatus', before: 'pending', after: 'approved' },
      { field: 'outlierReview.decision', before: null, after: 'remove' },
    ],
    reason: '复核通过：确认该点为传感器故障导致的离群值，同一时间段相邻5个测点数据均在正常范围，传感器SNS-103当天有多条异常记录',
    impactScope: ['conclusion-001', 'conclusion-002', 'slice-003'],
  },
  {
    id: 'audit-005',
    timestamp: new Date('2026-06-03T10:00:00'),
    operator: operators[3],
    operation: {
      type: 'update',
      target: { type: 'conclusion', id: 'conclusion-002', name: 'C区修正分析报告' },
    },
    changes: [
      { field: 'averageThickness', before: 1.05, after: 0.95 },
      { field: 'maxThickness', before: 15.2, after: 3.85 },
      { field: 'riskLevel', before: 'medium', after: 'low' },
      { field: 'outlierCount', before: 3, after: 2 },
    ],
    reason: '剔除确认离群点后重新计算，结论已更新',
    impactScope: ['slice-003'],
  },
];

export const syncIssues: SyncIssue[] = [
  {
    id: 'sync-001',
    type: 'timestamp_drift',
    severity: 'warning',
    description: '三维模型生成时间晚于部分测量记录',
    affectedMaterials: [
      { type: 'model', id: 'model-001', name: '三维海冰模型 v1.2', timestamp: new Date('2026-06-01T14:23:15') },
      { type: 'measurement', id: 'measurement-012', name: '测量点 #012', timestamp: new Date('2026-06-01T10:45:22') },
    ],
    recommendation: '检查模型生成时间戳是否正确，或确认是否使用了后续批次的扫描数据重建模型',
  },
  {
    id: 'sync-002',
    type: 'missing_dependency',
    severity: 'error',
    description: '切片 slice-003 引用的测量记录 measurement-039 存在时间戳冲突',
    affectedMaterials: [
      { type: 'slice', id: 'slice-003', name: 'C区横断面', timestamp: new Date('2026-06-02T16:20:00') },
      { type: 'measurement', id: 'measurement-039', name: '测量点 #039', timestamp: new Date('2026-06-03T08:12:45') },
    ],
    recommendation: '核实测量记录的真实采集时间，可能是设备时钟漂移导致记录时间晚于切片生成时间',
  },
];

export const scenarioConfig: ScenarioConfig = {
  id: 'sea-ice-thickness-demo-001',
  name: '北极圈海冰厚度测量分析 - 2026年6月第1周',
  description: '北极科考站A3区域海冰厚度立体切片复核演示，包含真实场景中常见的数据质量问题：传感器故障导致的离群点、时间戳不同步、旧版本备注残留等。',
  timeRange: {
    start: new Date('2026-06-01T08:00:00'),
    end: new Date('2026-06-03T18:00:00'),
  },
  materials: {
    models,
    measurements,
    slices,
  },
  parameters,
  syncIssues,
  auditRecords,
  conclusions,
  operators,
};
