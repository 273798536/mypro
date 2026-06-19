import type { AppState, ReviewRecord, ThresholdConfig, RawDataRow, HistoryEntry, GrayBreakdown } from '../types'
import { genId } from '../storage'
import { buildGrayBreakdown } from '../services/analysis'

const now = () => new Date().toISOString()

function makeRawRows(seed: number, count = 3): RawDataRow[] {
  const arr: RawDataRow[] = []
  for (let i = 0; i < count; i++) {
    const rowNum = seed * 100 + i * 7 + 12
    arr.push({
      id: genId('row'),
      rowNumber: rowNum,
      objectId: `OBJ-${(seed * 1000 + i * 31).toString().padStart(6, '0')}`,
      objectName: `审查对象_${seed}_${i}`,
      rawScore: 0.5 + ((seed * 13 + i * 7) % 50) / 100,
      rawLabel: (seed + i) % 3 === 0 ? 'high_risk' : (seed + i) % 3 === 1 ? 'medium_risk' : 'low_risk',
      sampleHash: `hash_${seed}_${i}_${(seed * 17 + i).toString(16)}`,
      createdAt: now(),
    })
  }
  return arr
}

function makeThresholds(): ThresholdConfig[] {
  return [
    {
      id: genId('th'),
      metricName: '高风险召回率',
      currentValue: 0.88,
      baselineValue: 0.85,
      driftTolerance: 0.15,
      isDrifted: false,
      updatedAt: now(),
      updatedBy: '系统',
    },
    {
      id: genId('th'),
      metricName: '精确率',
      currentValue: 0.72,
      baselineValue: 0.80,
      driftTolerance: 0.15,
      isDrifted: true,
      updatedAt: now(),
      updatedBy: '小乔',
    },
  ]
}

function makeHistory(seed: number, type: 'normal' | 'supplemented' | 'anomaly'): HistoryEntry[] {
  const base: HistoryEntry[] = [
    {
      id: genId('h'),
      timestamp: new Date(Date.now() - 3600000 * (seed + 1)).toISOString(),
      operator: '系统',
      field: 'algorithmMetric',
      oldValue: null,
      newValue: 0.82 + seed * 0.03,
      note: '算法首次产出指标',
    },
    {
      id: genId('h'),
      timestamp: new Date(Date.now() - 1800000 * (seed + 1)).toISOString(),
      operator: '排班同事A',
      field: 'status',
      oldValue: 'pending',
      newValue: 'processing',
      note: '开始处理',
    },
  ]

  if (type === 'supplemented') {
    base.push({
      id: genId('h'),
      timestamp: new Date(Date.now() - 600000).toISOString(),
      operator: '排班同事B',
      field: 'currentNote',
      oldValue: '',
      newValue: '这是后补的备注：客户昨天投诉此case，需重点关注',
      note: '补录备注',
    })
    base.push({
      id: genId('h'),
      timestamp: new Date(Date.now() - 500000).toISOString(),
      operator: '排班同事B',
      field: 'currentScreenshotUrl',
      oldValue: null,
      newValue: 'screenshot://old-version-v1.png',
      note: '附上旧版本截图（v1）',
    })
  }

  if (type === 'anomaly') {
    base.push({
      id: genId('h'),
      timestamp: new Date(Date.now() - 400000).toISOString(),
      operator: '系统',
      field: 'status',
      oldValue: 'processing',
      newValue: 'suspended',
      note: '阈值漂移检测：精确率下降超过15%，自动挂起待确认',
    })
  }

  return base
}

function makeBreakdown(seed: number, type: 'normal' | 'supplemented' | 'anomaly'): GrayBreakdown {
  if (type === 'anomaly') {
    return buildGrayBreakdown({
      sampleChange: -0.01,
      thresholdChange: -0.08,
      manualOverride: 0,
      baselineMetric: 0.80,
    })
  }
  if (type === 'supplemented') {
    return buildGrayBreakdown({
      sampleChange: 0.02,
      thresholdChange: 0,
      manualOverride: 0.05,
      baselineMetric: 0.85,
    })
  }
  return buildGrayBreakdown({
    sampleChange: 0.01,
    thresholdChange: 0,
    manualOverride: 0.01,
    baselineMetric: 0.85,
  })
}

function makeRecord(seed: number, type: 'normal' | 'supplemented' | 'anomaly'): ReviewRecord {
  const baseMetric = 0.82 + seed * 0.03
  const status =
    type === 'normal' ? 'confirmed' : type === 'supplemented' ? 'supplemented' : 'suspended'
  return {
    id: genId('rec'),
    recordType: type,
    codeReviewId: `CR-${20240600 + seed}`,
    rawRows: makeRawRows(seed, type === 'anomaly' ? 5 : 3),
    algorithmMetric: baseMetric,
    baselineMetric: type === 'anomaly' ? 0.80 : 0.85,
    finalMetric: type === 'anomaly' ? baseMetric : baseMetric + (type === 'supplemented' ? 0.05 : 0.01),
    status,
    thresholdSnapshot: {
      id: genId('th'),
      metricName: '高风险召回率',
      currentValue: type === 'anomaly' ? 0.72 : 0.88,
      baselineValue: 0.85,
      driftTolerance: 0.15,
      isDrifted: type === 'anomaly',
      updatedAt: now(),
      updatedBy: type === 'anomaly' ? '小乔' : '系统',
    },
    grayBreakdown: makeBreakdown(seed, type),
    history: makeHistory(seed, type),
    currentNote:
      type === 'normal'
        ? '指标正常，已确认。样本与阈值均无明显波动。'
        : type === 'supplemented'
        ? '补录备注：客户投诉 case 已人工复核，改判为高风险。详见历史截图。'
        : '',
    currentScreenshotUrl: type === 'supplemented' ? 'screenshot://old-version-v2.png' : undefined,
    assignedTo: type === 'anomaly' ? '待排班同事确认' : '排班同事A',
    apiResponseSnapshot: {
      status: 200,
      data: { metric: baseMetric, version: 'v2.3.1', batch: seed },
    },
    createdAt: new Date(Date.now() - 7200000 * (seed + 1)).toISOString(),
    updatedAt: now(),
    suspendedReason:
      type === 'anomaly'
        ? '精确率相对基线下降 10.00%（超过阈值漂移容忍度 15%），已自动挂起，请人工确认。'
        : undefined,
  }
}

export function buildSeedState(): AppState {
  return {
    records: [
      makeRecord(1, 'normal'),
      makeRecord(2, 'supplemented'),
      makeRecord(3, 'anomaly'),
    ],
    thresholds: makeThresholds(),
    currentUser: '排班同事A',
    lastSavedAt: now(),
  }
}
