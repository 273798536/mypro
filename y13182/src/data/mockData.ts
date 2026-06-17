import type { ParameterSnapshot, Note, SafetyThreshold, AnomalyRecord, TimelineNode } from '@/types'

const BASE_TIME = new Date('2024-03-15T08:00:00').getTime()
const TEN_MIN = 10 * 60 * 1000

export const mockSnapshots: ParameterSnapshot[] = Array.from({ length: 12 }, (_, i) => ({
  id: `snap-${i + 1}`,
  timestamp: BASE_TIME + i * TEN_MIN,
  dropletDiameter: +(1.2 + Math.sin(i * 0.5) * 0.3 + i * 0.02).toFixed(2),
  dropletDiameterUnit: 'mm',
  flowRate: +(3.5 + Math.cos(i * 0.4) * 0.8).toFixed(2),
  flowRateUnit: 'm³/h',
  temperature: +(28 + i * 0.5 + Math.sin(i * 0.3) * 2).toFixed(1),
  temperatureUnit: '°C',
  humidity: +(65 + Math.sin(i * 0.6) * 8).toFixed(1),
  humidityUnit: '%',
}))

export const mockThresholds: SafetyThreshold[] = [
  {
    id: 'thr-1',
    parameterName: 'dropletDiameter',
    oldValue: 2.0,
    newValue: 1.8,
    unit: 'mm',
    changedAt: BASE_TIME + 3 * TEN_MIN,
    changedBy: '老何',
    reason: '现场实测修正：原阈值偏大，多次采样均值1.75mm，预留0.05mm安全余量',
  },
  {
    id: 'thr-2',
    parameterName: 'temperature',
    oldValue: 35,
    newValue: 32,
    unit: '°C',
    changedAt: BASE_TIME + 7 * TEN_MIN,
    changedBy: '老何',
    reason: '夏季运行工况下调：环境温度升高导致冷却效率下降，需提前预警',
  },
]

export const mockNotes: Note[] = [
  {
    id: 'note-1',
    snapshotId: 'snap-3',
    content: '8:20采样时3号喷嘴有间歇性堵塞，水滴直径偏大可能是局部现象',
    isRetrospective: false,
    originalTimestamp: BASE_TIME + 2 * TEN_MIN,
    addedTimestamp: BASE_TIME + 2 * TEN_MIN,
    affectedParameters: [],
    conclusionChange: '',
  },
  {
    id: 'note-2',
    snapshotId: 'snap-5',
    content: '循环泵转速从1450rpm调至1380rpm，流量下降0.3m³/h属预期范围',
    isRetrospective: false,
    originalTimestamp: BASE_TIME + 4 * TEN_MIN,
    addedTimestamp: BASE_TIME + 4 * TEN_MIN,
    affectedParameters: [],
    conclusionChange: '',
  },
  {
    id: 'note-3',
    snapshotId: 'snap-4',
    content: '后补：经实验室复核，8:30的水滴直径采样存在镜头污染，实际值应下调0.15mm',
    isRetrospective: true,
    originalTimestamp: BASE_TIME + 3 * TEN_MIN,
    addedTimestamp: BASE_TIME + 8 * TEN_MIN,
    affectedParameters: ['dropletDiameter'],
    conclusionChange: '水滴直径从1.55mm修正为1.40mm，结论由"接近阈值"变更为"正常范围"',
  },
  {
    id: 'note-4',
    snapshotId: 'snap-8',
    content: '后补：9:10温度传感器校准偏差+1.2°C，已根据校准证书修正读数',
    isRetrospective: true,
    originalTimestamp: BASE_TIME + 7 * TEN_MIN,
    addedTimestamp: BASE_TIME + 10 * TEN_MIN,
    affectedParameters: ['temperature'],
    conclusionChange: '温度从32.5°C修正为31.3°C，结论由"超过调整后阈值"变更为"低于阈值0.7°C"',
  },
  {
    id: 'note-5',
    snapshotId: 'snap-11',
    content: '9:40补水阀开启，湿度预计在15分钟后恢复正常',
    isRetrospective: false,
    originalTimestamp: BASE_TIME + 10 * TEN_MIN,
    addedTimestamp: BASE_TIME + 10 * TEN_MIN,
    affectedParameters: [],
    conclusionChange: '',
  },
]

export const mockAnomalies: AnomalyRecord[] = [
  {
    id: 'anom-1',
    timestamp: BASE_TIME + 3 * TEN_MIN,
    type: 'threshold_change',
    description: '水滴直径安全阈值从2.0mm下调至1.8mm',
    relatedSnapshotId: 'snap-4',
    relatedThresholdId: 'thr-1',
    processingResult: '阈值变更',
    calculationSteps: [
      {
        step: 1,
        description: '现场多次采样均值计算',
        formula: 'μ = (1.72 + 1.78 + 1.74 + 1.76 + 1.75) / 5',
        input: '5次采样值: 1.72, 1.78, 1.74, 1.76, 1.75 mm',
        output: 'μ = 1.75 mm',
      },
      {
        step: 2,
        description: '安全余量叠加',
        formula: '新阈值 = μ + 0.05mm',
        input: 'μ = 1.75 mm, 余量 = 0.05 mm',
        output: '新阈值 = 1.80 mm',
      },
      {
        step: 3,
        description: '单位换算验证',
        formula: '1.80 mm = 1.80 × 10⁻³ m = 1800 μm',
        input: '1.80 mm',
        output: '1800 μm (1.80 × 10⁻³ m)',
        unitConversion: 'mm → μm: ×1000; mm → m: ×10⁻³',
      },
    ],
  },
  {
    id: 'anom-2',
    timestamp: BASE_TIME + 5 * TEN_MIN,
    type: 'parameter_exceeded',
    description: '水滴直径1.61mm超过旧阈值但未超过新阈值',
    relatedSnapshotId: 'snap-6',
    processingResult: '参数超限',
    calculationSteps: [
      {
        step: 1,
        description: '当前值与阈值对比',
        formula: 'd_current vs d_threshold',
        input: 'd_current = 1.61 mm, d_threshold_old = 2.0 mm, d_threshold_new = 1.8 mm',
        output: '旧阈值: 未超限; 新阈值: 未超限',
      },
      {
        step: 2,
        description: '安全裕度计算',
        formula: 'margin = d_threshold_new - d_current = 1.80 - 1.61',
        input: 'd_threshold_new = 1.80 mm, d_current = 1.61 mm',
        output: '裕度 = 0.19 mm (10.6%)',
      },
    ],
  },
  {
    id: 'anom-3',
    timestamp: BASE_TIME + 8 * TEN_MIN,
    type: 'note_correction',
    description: '后补备注修正：水滴直径因镜头污染下调0.15mm',
    relatedSnapshotId: 'snap-4',
    relatedNoteId: 'note-3',
    processingResult: '备注修正',
    calculationSteps: [
      {
        step: 1,
        description: '原始采样值',
        formula: 'd_raw = 1.55 mm',
        input: '传感器原始读数: 1.55 mm',
        output: '原始值: 1.55 mm',
      },
      {
        step: 2,
        description: '镜头污染修正量',
        formula: 'Δd = 0.15 mm (实验室标定)',
        input: '镜头污染导致偏差: +0.15 mm',
        output: '修正量: -0.15 mm',
      },
      {
        step: 3,
        description: '修正后值',
        formula: 'd_corrected = d_raw - Δd = 1.55 - 0.15',
        input: 'd_raw = 1.55 mm, Δd = 0.15 mm',
        output: 'd_corrected = 1.40 mm',
      },
      {
        step: 4,
        description: '结论变化',
        formula: '1.40 < 1.80 → 正常; (原: 1.55 < 1.80但接近阈值)',
        input: '修正前: 1.55mm (接近阈值), 修正后: 1.40mm',
        output: '结论由"接近阈值"变更为"正常范围"',
        unitConversion: '1.40 mm = 1400 μm',
      },
    ],
  },
  {
    id: 'anom-4',
    timestamp: BASE_TIME + 7 * TEN_MIN,
    type: 'threshold_change',
    description: '温度安全阈值从35°C下调至32°C',
    relatedSnapshotId: 'snap-8',
    relatedThresholdId: 'thr-2',
    processingResult: '阈值变更',
    calculationSteps: [
      {
        step: 1,
        description: '夏季工况温度修正系数计算',
        formula: 'K_summer = T_design / T_ambient = 30 / 34',
        input: '设计温度: 30°C, 当前环境温度: 34°C',
        output: 'K_summer = 0.882',
      },
      {
        step: 2,
        description: '调整后阈值',
        formula: 'T_threshold_new = T_threshold_old × K_summer = 35 × 0.882',
        input: 'T_threshold_old = 35°C, K_summer = 0.882',
        output: 'T_threshold_new ≈ 32°C (取整)',
        unitConversion: '32°C = 305.15 K = 89.6°F',
      },
      {
        step: 3,
        description: '温度传感器校准修正',
        formula: 'T_corrected = T_reading - ΔT_cal = 32.5 - 1.2',
        input: '传感器读数: 32.5°C, 校准偏差: +1.2°C',
        output: 'T_corrected = 31.3°C (低于阈值0.7°C)',
      },
    ],
  },
  {
    id: 'anom-5',
    timestamp: BASE_TIME + 10 * TEN_MIN,
    type: 'note_correction',
    description: '后补备注修正：温度传感器校准偏差+1.2°C，修正后低于阈值',
    relatedSnapshotId: 'snap-8',
    relatedNoteId: 'note-4',
    processingResult: '备注修正',
    calculationSteps: [
      {
        step: 1,
        description: '原始传感器读数',
        formula: 'T_raw = 32.5 °C',
        input: '传感器未校准读数: 32.5 °C',
        output: '原始值: 32.5 °C',
      },
      {
        step: 2,
        description: '校准证书修正量',
        formula: 'ΔT_cal = +1.2 °C (传感器偏高)',
        input: '校准证书编号: CERT-2024-T0387, 偏差: +1.2°C',
        output: '修正量: -1.2 °C',
      },
      {
        step: 3,
        description: '校准后温度',
        formula: 'T_corrected = T_raw - ΔT_cal = 32.5 - 1.2',
        input: 'T_raw = 32.5 °C, ΔT_cal = 1.2 °C',
        output: 'T_corrected = 31.3 °C',
      },
      {
        step: 4,
        description: '结论变化对比',
        formula: '31.3 < 32 → 正常; (原: 32.5 > 32 超限)',
        input: '修正前: 32.5°C (超限), 修正后: 31.3°C',
        output: '结论由"超过调整后阈值"变更为"低于阈值0.7°C"',
        unitConversion: '31.3°C = 304.45 K = 88.34°F',
      },
    ],
  },
]

export function buildTimelineNodes(
  snapshots: ParameterSnapshot[],
  notes: Note[],
  thresholds: SafetyThreshold[]
): TimelineNode[] {
  const nodes: TimelineNode[] = []

  snapshots.forEach((s) => {
    nodes.push({
      timestamp: s.timestamp,
      type: 'snapshot',
      label: '参数快照',
      id: s.id,
    })
  })

  notes.forEach((n) => {
    if (n.isRetrospective) {
      nodes.push({
        timestamp: n.originalTimestamp,
        type: 'retrospective_note',
        label: '后补备注',
        id: n.id,
      })
    } else {
      nodes.push({
        timestamp: n.originalTimestamp,
        type: 'note',
        label: '备注',
        id: n.id,
      })
    }
  })

  thresholds.forEach((t) => {
    nodes.push({
      timestamp: t.changedAt,
      type: 'threshold_change',
      label: '阈值变更',
      id: t.id,
    })
  })

  return nodes.sort((a, b) => a.timestamp - b.timestamp)
}

export function getCurrentThreshold(
  parameterName: string,
  timestamp: number,
  thresholds: SafetyThreshold[]
): number | null {
  let result: number | null = null
  const sorted = [...thresholds]
    .filter((t) => t.parameterName === parameterName)
    .sort((a, b) => a.changedAt - b.changedAt)

  for (const t of sorted) {
    if (t.changedAt <= timestamp) {
      result = t.newValue
    }
  }

  return result
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function formatTimeFull(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
