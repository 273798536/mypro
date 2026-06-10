import type { ExperimentRecord, AnomalyEntry, ConclusionGrade, SpectralPeak } from '@/types'

const REQUIRED_FIELDS: (keyof Pick<ExperimentRecord, 'sampleCode' | 'extractionMethod' | 'temperature' | 'ph' | 'duration' | 'operator'>)[] = [
  'sampleCode', 'extractionMethod', 'temperature', 'ph', 'duration', 'operator',
]

export function calculateCompleteness(record: ExperimentRecord): number {
  const filled = REQUIRED_FIELDS.filter((f) => record[f] !== null && record[f] !== '').length
  return Math.round((filled / REQUIRED_FIELDS.length) * 100)
}

export function detectEmptyFields(record: ExperimentRecord): string[] {
  return REQUIRED_FIELDS.filter((f) => record[f] === null || record[f] === '').map(String)
}

export function detectDuplicates(records: ExperimentRecord[]): Map<string, string[]> {
  const codeMap = new Map<string, string[]>()
  records.forEach((r) => {
    const existing = codeMap.get(r.sampleCode) || []
    existing.push(r.id)
    codeMap.set(r.sampleCode, existing)
  })
  const result = new Map<string, string[]>()
  codeMap.forEach((ids, code) => {
    if (ids.length > 1) result.set(code, ids)
  })
  return result
}

export function detectMixedNotes(notes: string | null): string[] {
  if (!notes) return []
  const issues: string[] = []
  const parts = notes.split(/[;；,，\n]/)
  const dataPatterns = /[\d.]+\s*(mg|ml|g|ppm|pH|℃|°C)/i
  const remarkPatterns = /(故障|异常|不准|待查|疑问|确认|备注|可能)/
  parts.forEach((part) => {
    if (dataPatterns.test(part) && remarkPatterns.test(part)) {
      issues.push(part.trim())
    }
  })
  return issues
}

export function calculateBalanceDeviation(
  extractVolume: number | null,
  sampleMass: number | null,
  dilutionFactor: number | null,
  nominalConcentration: number | null,
): { calculated: number | null; deviation: number | null; isAcceptable: boolean | null } {
  if (!extractVolume || !sampleMass || !dilutionFactor || !nominalConcentration) {
    return { calculated: null, deviation: null, isAcceptable: null }
  }
  const calculated = (sampleMass * dilutionFactor) / extractVolume
  const deviation = Math.abs(calculated - nominalConcentration) / nominalConcentration * 100
  return { calculated: Math.round(calculated * 1000) / 1000, deviation: Math.round(deviation * 10) / 10, isAcceptable: deviation < 5 }
}

export function detectPeakOverlaps(peaks: SpectralPeak[]): SpectralPeak[] {
  if (peaks.length < 2) return peaks.map((p) => ({ ...p, isOverlapping: false, overlapWith: null }))
  const sorted = [...peaks].sort((a, b) => a.position - b.position)
  const result = sorted.map((p) => ({ ...p, isOverlapping: false, overlapWith: null as string | null }))
  for (let i = 0; i < result.length - 1; i++) {
    const gap = result[i + 1].position - result[i].position
    const threshold = (result[i].halfWidth + result[i + 1].halfWidth) * 0.5
    if (gap < threshold) {
      result[i].isOverlapping = true
      result[i].overlapWith = result[i + 1].id
      result[i + 1].isOverlapping = true
      result[i + 1].overlapWith = result[i].id
    }
  }
  return result
}

export function detectTemperatureExceeds(
  curve: { timePoint: number; temperature: number }[],
  upperLimit: number,
  lowerLimit: number,
): { timePoint: number; temperature: number; isExceeding: boolean }[] {
  return curve.map((point) => ({
    ...point,
    isExceeding: point.temperature > upperLimit || point.temperature < lowerLimit,
  }))
}

export function detectPHExceeds(
  curve: { timePoint: number; ph: number }[],
  upperLimit: number,
  lowerLimit: number,
): { timePoint: number; ph: number; isExceeding: boolean }[] {
  return curve.map((point) => ({
    ...point,
    isExceeding: point.ph > upperLimit || point.ph < lowerLimit,
  }))
}

export function generateAnomalies(record: ExperimentRecord): AnomalyEntry[] {
  const anomalies: AnomalyEntry[] = []
  let counter = 0
  const makeId = () => `anomaly-${record.id}-${counter++}`

  detectEmptyFields(record).forEach((field) => {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'empty_field',
      description: `字段「${field}」为空`,
      sourceField: field,
      severity: 'medium',
    })
  })

  if (record.balanceCalculation.balanceDeviation !== null && record.balanceCalculation.balanceDeviation > 15) {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'balance_deviation',
      description: `配平偏差 ${record.balanceCalculation.balanceDeviation}% 超出15%阈值`,
      sourceField: 'balanceCalculation.balanceDeviation',
      severity: 'high',
    })
  } else if (record.balanceCalculation.balanceDeviation !== null && record.balanceCalculation.balanceDeviation > 5) {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'balance_deviation',
      description: `配平偏差 ${record.balanceCalculation.balanceDeviation}% 超出5%阈值`,
      sourceField: 'balanceCalculation.balanceDeviation',
      severity: 'medium',
    })
  }

  record.spectralPeaks.filter((p) => p.isOverlapping).forEach((peak) => {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'peak_overlap',
      description: `元素 ${peak.element} 在位置 ${peak.position} 处存在谱峰重叠`,
      sourceField: `spectralPeaks.${peak.id}`,
      severity: 'medium',
    })
  })

  const tempExceeds = record.temperatureCurve.filter((p) => p.isExceeding)
  if (tempExceeds.length > 0) {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'temp_exceed',
      description: `温度曲线有 ${tempExceeds.length} 个点越界`,
      sourceField: 'temperatureCurve',
      severity: tempExceeds.length > 3 ? 'high' : 'medium',
    })
  }

  const phExceeds = record.phCurve.filter((p) => p.isExceeding)
  if (phExceeds.length > 0) {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'ph_exceed',
      description: `pH曲线有 ${phExceeds.length} 个点越界`,
      sourceField: 'phCurve',
      severity: phExceeds.length > 2 ? 'high' : 'medium',
    })
  }

  const mixedNotes = detectMixedNotes(record.notes)
  mixedNotes.forEach((note) => {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'mixed_notes',
      description: `备注中混写数据与异常描述：「${note}」`,
      sourceField: 'notes',
      severity: 'low',
    })
  })

  if (record.temperatureCurve.length < 5 && record.temperatureCurve.length > 0) {
    anomalies.push({
      id: makeId(),
      recordId: record.id,
      anomalyType: 'curve_break',
      description: '温度曲线数据点不足，疑似断裂',
      sourceField: 'temperatureCurve',
      severity: 'high',
    })
  }

  return anomalies
}

export function gradeConclusion(record: ExperimentRecord): ConclusionGrade {
  const completeness = calculateCompleteness(record)
  if (completeness < 60) return 'bad'
  const highSeverityCount = record.anomalies.filter((a) => a.severity === 'high').length
  if (highSeverityCount >= 2) return 'bad'
  if (record.balanceCalculation.balanceDeviation !== null && record.balanceCalculation.balanceDeviation > 15) return 'bad'
  const mediumSeverityCount = record.anomalies.filter((a) => a.severity === 'medium').length
  if (highSeverityCount >= 1 || mediumSeverityCount >= 2) return 'review'
  if (record.balanceCalculation.balanceDeviation !== null && record.balanceCalculation.balanceDeviation > 5) return 'review'
  if (completeness < 100) return 'review'
  return 'usable'
}

export const GRADE_LABELS: Record<ConclusionGrade, { label: string; icon: string; color: string }> = {
  usable: { label: '可直接用', icon: '✅', color: 'emerald' },
  review: { label: '需复核', icon: '⚠️', color: 'amber' },
  bad: { label: '数据坏', icon: '❌', color: 'red' },
}

export function StatusBadge(grade: ConclusionGrade): { label: string; icon: string; bgClass: string; textClass: string } {
  const info = GRADE_LABELS[grade]
  const bgMap: Record<ConclusionGrade, string> = { usable: 'bg-emerald-100', review: 'bg-amber-100', bad: 'bg-red-100' }
  const textMap: Record<ConclusionGrade, string> = { usable: 'text-emerald-800', review: 'text-amber-800', bad: 'text-red-800' }
  return { label: info.label, icon: info.icon, bgClass: bgMap[grade], textClass: textMap[grade] }
}
