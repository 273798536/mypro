import type { BuoyRecord, MetricDef, MetricKey, MetricResult, RiskAssessment, RiskLevel } from '../types'

function checkDissolvedOxygen(value: number | null): { isAbnormal: boolean; degree: number; fail: boolean } {
  if (value === null) return { isAbnormal: false, degree: 0, fail: false }
  if (value <= 0 || value > 20) return { isAbnormal: true, degree: 100, fail: true }
  const isAbnormal = value < 5.0
  const degree = isAbnormal ? Math.min(((5.0 - value) / 5.0) * 100, 100) : 0
  return { isAbnormal, degree, fail: false }
}

function checkPh(value: number | null): { isAbnormal: boolean; degree: number; fail: boolean } {
  if (value === null) return { isAbnormal: false, degree: 0, fail: false }
  if (value < 0 || value > 14) return { isAbnormal: true, degree: 100, fail: true }
  const isAbnormal = value < 6.5 || value > 8.5
  const degree = isAbnormal
    ? Math.min(Math.max((6.5 - value) / 6.5, (value - 8.5) / 8.5) * 100, 100)
    : 0
  return { isAbnormal, degree, fail: false }
}

function checkTurbidity(value: number | null): { isAbnormal: boolean; degree: number; fail: boolean } {
  if (value === null) return { isAbnormal: false, degree: 0, fail: false }
  if (value < 0 || value > 1000) return { isAbnormal: true, degree: 100, fail: true }
  const isAbnormal = value > 25
  const degree = isAbnormal ? Math.min(((value - 25) / 25) * 100, 100) : 0
  return { isAbnormal, degree, fail: false }
}

function checkConductivity(value: number | null): { isAbnormal: boolean; degree: number; fail: boolean } {
  if (value === null) return { isAbnormal: false, degree: 0, fail: false }
  if (value < 0) return { isAbnormal: true, degree: 100, fail: true }
  const isAbnormal = value > 2500
  const degree = isAbnormal ? Math.min(((value - 2500) / 2500) * 100, 100) : 0
  return { isAbnormal, degree, fail: false }
}

function checkWaterTemp(value: number | null): { isAbnormal: boolean; degree: number; fail: boolean } {
  if (value === null) return { isAbnormal: false, degree: 0, fail: false }
  if (value < -5 || value > 45) return { isAbnormal: true, degree: 100, fail: true }
  const referenceTemp = 25
  const delta = Math.abs(value - referenceTemp)
  const isAbnormal = delta > 3
  const degree = isAbnormal ? Math.min((delta / 3) * 100, 100) : 0
  return { isAbnormal, degree, fail: false }
}

function checkChlorophyllA(value: number | null): { isAbnormal: boolean; degree: number; fail: boolean } {
  if (value === null) return { isAbnormal: false, degree: 0, fail: false }
  if (value < 0) return { isAbnormal: true, degree: 100, fail: true }
  const isAbnormal = value > 10
  const degree = isAbnormal ? Math.min(((value - 10) / 10) * 100, 100) : 0
  return { isAbnormal, degree, fail: false }
}

export const METRIC_DEFS: MetricDef[] = [
  {
    key: 'dissolved_oxygen',
    label: '溶解氧',
    unit: 'mg/L',
    formula: '(5.0 - DO) / 5.0 × 100%',
    range: '0~20 mg/L',
    failReason: '溶解氧超出传感器有效范围（≤0 或 >20 mg/L）',
    checkAbnormal: checkDissolvedOxygen,
  },
  {
    key: 'ph',
    label: 'pH值',
    unit: '',
    formula: 'max((6.5-pH)/6.5, (pH-8.5)/8.5) × 100%',
    range: '0~14',
    failReason: 'pH值超出传感器有效范围（<0 或 >14）',
    checkAbnormal: checkPh,
  },
  {
    key: 'turbidity',
    label: '浊度',
    unit: 'NTU',
    formula: '(浊度 - 25) / 25 × 100%',
    range: '0~1000 NTU',
    failReason: '浊度超出传感器有效范围（<0 或 >1000 NTU）',
    checkAbnormal: checkTurbidity,
  },
  {
    key: 'conductivity',
    label: '电导率',
    unit: 'μS/cm',
    formula: '(电导率 - 2500) / 2500 × 100%',
    range: '0~5000 μS/cm',
    failReason: '电导率超出传感器有效范围（<0 μS/cm）',
    checkAbnormal: checkConductivity,
  },
  {
    key: 'water_temp',
    label: '水温',
    unit: '°C',
    formula: '|Δ温度| / 3 × 100%',
    range: '0~40°C',
    failReason: '水温超出传感器有效范围（<-5 或 >45°C）',
    checkAbnormal: checkWaterTemp,
  },
  {
    key: 'chlorophyll_a',
    label: '叶绿素a',
    unit: 'μg/L',
    formula: '(叶绿素a - 10) / 10 × 100%',
    range: '0~100 μg/L',
    failReason: '叶绿素a超出传感器有效范围（<0 μg/L）',
    checkAbnormal: checkChlorophyllA,
  },
]

const METRIC_KEY_INDEX: Record<MetricKey, number> = {
  dissolved_oxygen: 0,
  ph: 1,
  turbidity: 2,
  conductivity: 3,
  water_temp: 4,
  chlorophyll_a: 5,
}

function computeMetrics(record: BuoyRecord): MetricResult[] {
  const keys: MetricKey[] = ['dissolved_oxygen', 'ph', 'turbidity', 'conductivity', 'water_temp', 'chlorophyll_a']
  return keys.map((key) => {
    const def = METRIC_DEFS[METRIC_KEY_INDEX[key]]
    const value = record[key] as number | null
    const { isAbnormal, degree, fail } = def.checkAbnormal(value)
    return {
      key,
      label: def.label,
      value,
      unit: def.unit,
      isAbnormal,
      degree,
      fail,
    }
  })
}

export function assessRiskLevel(metrics: MetricResult[]): RiskLevel {
  const abnormalMetrics = metrics.filter((m) => m.isAbnormal && !m.fail)
  const doAbnormal = metrics.find((m) => m.key === 'dissolved_oxygen')?.isAbnormal ?? false
  const phAbnormal = metrics.find((m) => m.key === 'ph')?.isAbnormal ?? false

  if (abnormalMetrics.length >= 3 || (doAbnormal && phAbnormal)) return 'high_risk'
  if (abnormalMetrics.length >= 2) return 'abnormal'
  if (abnormalMetrics.length === 1 && abnormalMetrics[0].degree >= 50) return 'abnormal'
  if (abnormalMetrics.length === 1) return 'watch'
  return 'normal'
}

function adjustLevelByPhoto(level: RiskLevel, hasPhoto: boolean): RiskLevel {
  if (hasPhoto) return level
  switch (level) {
    case 'high_risk': return 'abnormal'
    case 'abnormal': return 'watch'
    default: return level
  }
}

export function assessRecord(record: BuoyRecord): RiskAssessment {
  const metrics = computeMetrics(record)
  const level = assessRiskLevel(metrics)
  const adjustedLevel = adjustLevelByPhoto(level, record.hasPhoto)

  return {
    id: `assess-${record.id}`,
    stationId: record.stationId,
    stationName: record.stationName,
    timestamp: record.timestamp,
    level,
    metrics,
    version: 1,
    hasPhoto: record.hasPhoto,
    adjustedLevel,
    photoMissing: !record.hasPhoto,
  }
}

export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'normal': return '正常'
    case 'watch': return '关注'
    case 'abnormal': return '异常'
    case 'high_risk': return '高风险'
  }
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'normal': return 'teal'
    case 'watch': return 'watch'
    case 'abnormal': return 'warn'
    case 'high_risk': return 'danger'
  }
}
