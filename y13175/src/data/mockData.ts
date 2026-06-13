import { SensorLog, LogBatch, SensorPoint, ParamVersion, CalculationResult, ManualJudgment, Report, TimeSeriesPoint } from '@/types';

const now = new Date();
const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

export const mockSensorLogs: SensorLog[] = [
  {
    id: 'log-001',
    name: '2026-06-13 上午实验批次A',
    startTime: new Date(dayStart + 8 * 3600 * 1000).toISOString(),
    endTime: new Date(dayStart + 11 * 3600 * 1000 + 30 * 60 * 1000).toISOString(),
    pointCount: 12840,
    status: 'complete',
    batchIds: ['batch-001', 'batch-002'],
  },
  {
    id: 'log-002',
    name: '2026-06-13 下午实验批次B',
    startTime: new Date(dayStart + 13 * 3600 * 1000).toISOString(),
    endTime: new Date(dayStart + 15 * 3600 * 1000).toISOString(),
    pointCount: 6520,
    status: 'incomplete',
    batchIds: ['batch-003'],
  },
  {
    id: 'log-003',
    name: '2026-06-12 验证实验',
    startTime: new Date(dayStart - 86400000 + 9 * 3600 * 1000).toISOString(),
    endTime: new Date(dayStart - 86400000 + 16 * 3600 * 1000).toISOString(),
    pointCount: 25680,
    status: 'pending_review',
    batchIds: ['batch-004', 'batch-005'],
  },
];

export const mockLogBatches: LogBatch[] = [
  {
    id: 'batch-001',
    logId: 'log-001',
    fileName: 'sensor_A_20260613_0800.json',
    importTime: new Date(dayStart + 8 * 3600 * 1000 + 5 * 60 * 1000).toISOString(),
    importedBy: '张工',
    dataPointCount: 7200,
    dataStartTime: new Date(dayStart + 8 * 3600 * 1000).toISOString(),
    dataEndTime: new Date(dayStart + 10 * 3600 * 1000).toISOString(),
  },
  {
    id: 'batch-002',
    logId: 'log-001',
    fileName: 'sensor_A_20260613_1000.json',
    importTime: new Date(dayStart + 10 * 3600 * 1000 + 3 * 60 * 1000).toISOString(),
    importedBy: '张工',
    dataPointCount: 5640,
    dataStartTime: new Date(dayStart + 10 * 3600 * 1000).toISOString(),
    dataEndTime: new Date(dayStart + 11 * 3600 * 1000 + 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-003',
    logId: 'log-002',
    fileName: 'sensor_B_20260613_1300.json',
    importTime: new Date(dayStart + 13 * 3600 * 1000 + 10 * 60 * 1000).toISOString(),
    importedBy: '李工',
    dataPointCount: 6520,
    dataStartTime: new Date(dayStart + 13 * 3600 * 1000).toISOString(),
    dataEndTime: new Date(dayStart + 14 * 3600 * 1000 + 48 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-004',
    logId: 'log-003',
    fileName: 'sensor_C_20260612_0900.json',
    importTime: new Date(dayStart - 86400000 + 9 * 3600 * 1000 + 8 * 60 * 1000).toISOString(),
    importedBy: '王工',
    dataPointCount: 14400,
    dataStartTime: new Date(dayStart - 86400000 + 9 * 3600 * 1000).toISOString(),
    dataEndTime: new Date(dayStart - 86400000 + 13 * 3600 * 1000).toISOString(),
  },
  {
    id: 'batch-005',
    logId: 'log-003',
    fileName: 'sensor_C_20260612_1300.json',
    importTime: new Date(dayStart - 86400000 + 13 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
    importedBy: '王工',
    dataPointCount: 11280,
    dataStartTime: new Date(dayStart - 86400000 + 13 * 3600 * 1000).toISOString(),
    dataEndTime: new Date(dayStart - 86400000 + 16 * 3600 * 1000).toISOString(),
  },
];

export const mockSensorPoints: SensorPoint[] = [
  { id: 's-01', logId: 'log-001', name: '激光源-1', x: -3, y: 0, z: -2, type: 'laser' },
  { id: 's-02', logId: 'log-001', name: '激光源-2', x: -3, y: 1, z: -2, type: 'laser' },
  { id: 's-03', logId: 'log-001', name: '探测器-A', x: 2, y: 0, z: -1, type: 'detector' },
  { id: 's-04', logId: 'log-001', name: '探测器-B', x: 2, y: 0.5, z: 0, type: 'detector' },
  { id: 's-05', logId: 'log-001', name: '探测器-C', x: 2, y: -0.5, z: 1, type: 'detector' },
  { id: 's-06', logId: 'log-001', name: '参考点-1', x: 0, y: -1.5, z: -2, type: 'reference' },
  { id: 's-07', logId: 'log-001', name: '参考点-2', x: 0, y: -1.5, z: 2, type: 'reference' },
  { id: 's-08', logId: 'log-001', name: '探测器-D', x: 1.5, y: 1, z: 1.5, type: 'detector' },
  { id: 's-09', logId: 'log-001', name: '探测器-E', x: 1.5, y: -1, z: -1.5, type: 'detector' },
  { id: 's-10', logId: 'log-001', name: '激光源-3', x: -2.5, y: -0.5, z: 1.5, type: 'laser' },
  { id: 's-11', logId: 'log-002', name: '激光源-1', x: -3, y: 0, z: -2, type: 'laser' },
  { id: 's-12', logId: 'log-002', name: '探测器-A', x: 2, y: 0, z: -1, type: 'detector' },
  { id: 's-13', logId: 'log-002', name: '探测器-B', x: 2, y: 0.5, z: 0, type: 'detector' },
  { id: 's-14', logId: 'log-002', name: '参考点-1', x: 0, y: -1.5, z: 0, type: 'reference' },
];

export const mockParamVersions: ParamVersion[] = [
  {
    id: 'param-v1',
    versionName: 'v1.0.0 - 初始参数',
    description: '第一次正式实验使用的参数配置',
    parameters: {
      laserWavelength: 632.8,
      exposureTime: 0.5,
      threshold: 0.65,
      smoothingKernel: 5,
      useAdaptiveThreshold: true,
      calibrationFactor: 1.02,
    },
    createdAt: new Date(dayStart - 7 * 86400000 + 10 * 3600 * 1000).toISOString(),
    createdBy: '陈博士',
    isCurrent: false,
  },
  {
    id: 'param-v2',
    versionName: 'v1.1.0 - 优化阈值',
    description: '根据上周实验数据优化了阈值和校准系数',
    parameters: {
      laserWavelength: 632.8,
      exposureTime: 0.5,
      threshold: 0.72,
      smoothingKernel: 7,
      useAdaptiveThreshold: true,
      calibrationFactor: 1.05,
    },
    createdAt: new Date(dayStart - 86400000 + 14 * 3600 * 1000).toISOString(),
    createdBy: '陈博士',
    isCurrent: true,
  },
];

export const mockCalculationResults: CalculationResult[] = [
  {
    id: 'result-001',
    logId: 'log-001',
    paramVersionId: 'param-v2',
    calculatedAt: new Date(dayStart + 11 * 3600 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'done',
    judgment: 'pass',
    confidence: 0.92,
    resultData: {
      averageIntensity: 0.78,
      contrastRatio: 0.54,
      speckleSize: 12.5,
      stability: 0.88,
    },
    samplingGaps: [
      {
        id: 'gap-001',
        startTime: new Date(dayStart + 9 * 3600 * 1000 + 32 * 60 * 1000).toISOString(),
        endTime: new Date(dayStart + 9 * 3600 * 1000 + 32 * 60 * 1000 + 15 * 1000).toISOString(),
        duration: 15,
        severity: 'low',
        sensorIds: ['s-03'],
      },
    ],
    needsManualReview: false,
  },
  {
    id: 'result-002',
    logId: 'log-003',
    paramVersionId: 'param-v1',
    calculatedAt: new Date(dayStart - 86400000 + 16 * 3600 * 1000 + 30 * 60 * 1000).toISOString(),
    status: 'done',
    judgment: 'pending',
    confidence: 0.58,
    resultData: {
      averageIntensity: 0.65,
      contrastRatio: 0.38,
      speckleSize: 15.2,
      stability: 0.62,
    },
    samplingGaps: [
      {
        id: 'gap-002',
        startTime: new Date(dayStart - 86400000 + 11 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
        endTime: new Date(dayStart - 86400000 + 11 * 3600 * 1000 + 15 * 60 * 1000 + 120 * 1000).toISOString(),
        duration: 120,
        severity: 'high',
        sensorIds: ['s-03', 's-04', 's-05'],
      },
      {
        id: 'gap-003',
        startTime: new Date(dayStart - 86400000 + 14 * 3600 * 1000 + 5 * 60 * 1000).toISOString(),
        endTime: new Date(dayStart - 86400000 + 14 * 3600 * 1000 + 5 * 60 * 1000 + 45 * 1000).toISOString(),
        duration: 45,
        severity: 'medium',
        sensorIds: ['s-06'],
      },
    ],
    needsManualReview: true,
    reviewReason: '存在高严重度采样缺口（2分钟），且对比度低于阈值，建议人工确认',
  },
];

export const mockManualJudgments: ManualJudgment[] = [
  {
    id: 'manual-001',
    resultId: 'result-002',
    judgment: 'fail',
    reason: '采样缺口出现在关键测量时段，且稳定性指标偏低，判为不合格',
    nextStep: '建议重新进行实验，确保数据完整性；或使用 v1.1.0 参数重新复算',
    judgedAt: new Date(dayStart - 86400000 + 17 * 3600 * 1000).toISOString(),
    judgedBy: '陈博士',
  },
];

export const mockReports: Report[] = [
  {
    id: 'report-001',
    resultId: 'result-001',
    category: 'processed',
    title: '2026-06-13 上午实验批次A 复算报告',
    content: `# 激光散斑实验复算报告

## 基本信息
- **实验名称**: 2026-06-13 上午实验批次A
- **复算时间**: ${new Date(dayStart + 11 * 3600 * 1000 + 45 * 60 * 1000).toLocaleString('zh-CN')}
- **使用参数版本**: v1.1.0 - 优化阈值
- **判断结果**: ✅ 通过

## 数据来源
1. sensor_A_20260613_0800.json (导入人: 张工)
2. sensor_A_20260613_1000.json (导入人: 张工)

## 复算结果

| 指标 | 数值 | 阈值 | 状态 |
|------|------|------|------|
| 平均光强 | 0.78 | ≥0.7 | ✅ 正常 |
| 对比度 | 0.54 | ≥0.5 | ✅ 正常 |
| 散斑尺寸 | 12.5μm | 10-15μm | ✅ 正常 |
| 稳定性 | 0.88 | ≥0.8 | ✅ 正常 |

## 采样缺口检测
共检测到 1 处采样缺口，均为低严重度：
- 09:32:00 - 09:32:15 (15秒) - 探测器-A 数据缺失

## 置信度
92%

## 备注
无
`,
    generatedAt: new Date(dayStart + 11 * 3600 * 1000 + 50 * 60 * 1000).toISOString(),
    dataSources: ['batch-001', 'batch-002', 'param-v2'],
  },
  {
    id: 'report-002',
    resultId: 'result-002',
    category: 'manual_override',
    title: '2026-06-12 验证实验 复算报告【人工改判】',
    content: `# 激光散斑实验复算报告

## 基本信息
- **实验名称**: 2026-06-12 验证实验
- **复算时间**: ${new Date(dayStart - 86400000 + 16 * 3600 * 1000 + 30 * 60 * 1000).toLocaleString('zh-CN')}
- **使用参数版本**: v1.0.0 - 初始参数
- **系统初判**: ⏳ 待人工确认
- **最终判断**: ❌ 不合格【人工改判】

## 数据来源
1. sensor_C_20260612_0900.json (导入人: 王工)
2. sensor_C_20260612_1300.json (导入人: 王工)

## 复算结果

| 指标 | 数值 | 阈值 | 状态 |
|------|------|------|------|
| 平均光强 | 0.65 | ≥0.7 | ⚠️ 偏低 |
| 对比度 | 0.38 | ≥0.5 | ❌ 不达标 |
| 散斑尺寸 | 15.2μm | 10-15μm | ⚠️ 偏大 |
| 稳定性 | 0.62 | ≥0.8 | ❌ 不达标 |

## 采样缺口检测
共检测到 2 处采样缺口：
- 高严重度: 11:15:00 - 11:17:00 (2分钟) - 探测器A/B/C 数据缺失
- 中严重度: 14:05:00 - 14:05:45 (45秒) - 参考点-1 数据缺失

## 置信度
58%

## 人工改判记录

**改判人**: 陈博士
**改判时间**: ${new Date(dayStart - 86400000 + 17 * 3600 * 1000).toLocaleString('zh-CN')}
**改判原因**: 采样缺口出现在关键测量时段，且稳定性指标偏低，判为不合格
**下一步建议**: 建议重新进行实验，确保数据完整性；或使用 v1.1.0 参数重新复算
`,
    generatedAt: new Date(dayStart - 86400000 + 17 * 3600 * 1000 + 5 * 60 * 1000).toISOString(),
    dataSources: ['batch-004', 'batch-005', 'param-v1', 'manual-001'],
  },
  {
    id: 'report-003',
    resultId: '',
    category: 'pending_material',
    title: '2026-06-13 下午实验批次B 复算报告【待补材料】',
    content: `# 激光散斑实验复算报告

## 基本信息
- **实验名称**: 2026-06-13 下午实验批次B
- **状态**: ⏳ 待补材料
- **使用参数版本**: v1.1.0 - 优化阈值

## 数据来源
1. sensor_B_20260613_1300.json (导入人: 李工)

## 当前情况
数据不完整，预计还有 1 批数据未导入。
实验预计结束时间: 15:00

## 采样缺口检测
当前数据存在尾部截断，不建议进行完整复算。

## 下一步
请等待后续数据导入后再进行完整复算。
`,
    generatedAt: new Date(dayStart + 14 * 3600 * 1000 + 50 * 60 * 1000).toISOString(),
    dataSources: ['batch-003'],
  },
];

function generateTimeSeries(logId: string, points: SensorPoint[], startTime: number, endTime: number, intervalMs: number): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];
  const pointMap = new Map(points.filter(p => p.logId === logId).map(p => [p.id, p]));
  const sensorIds = Array.from(pointMap.keys());

  for (let t = startTime; t <= endTime; t += intervalMs) {
    const values: Record<string, number> = {};
    sensorIds.forEach(id => {
      const point = pointMap.get(id)!;
      const baseValue = point.type === 'laser' ? 0.9 : 0.7;
      const noise = (Math.sin(t / 10000 + point.x * 2) * 0.1 + Math.cos(t / 7000 + point.z) * 0.08);
      values[id] = Math.max(0.1, Math.min(1, baseValue + noise));
    });
    result.push({
      timestamp: new Date(t).toISOString(),
      values,
    });
  }
  return result;
}

export function getTimeSeriesData(logId: string): TimeSeriesPoint[] {
  const log = mockSensorLogs.find(l => l.id === logId);
  if (!log) return [];
  const startTime = new Date(log.startTime).getTime();
  const endTime = new Date(log.endTime).getTime();
  return generateTimeSeries(logId, mockSensorPoints, startTime, endTime, 60000);
}
