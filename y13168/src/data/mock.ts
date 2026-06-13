import type {
  Equipment,
  MotorComponent,
  NameplateRecord,
  NameplateChange,
  TorqueRecord,
  AnomalyEvent,
  ThresholdBreach,
  ParameterSet,
  RecalcResult,
} from '@/types'

export const equipments: Equipment[] = [
  { id: 'EQ-001', name: '1号主电机', model: 'YX3-250M-4', manufacturer: '中达电通' },
  { id: 'EQ-002', name: '2号辅助电机', model: 'YX3-200L-4', manufacturer: 'ABB中国' },
]

export const motorComponents: MotorComponent[] = [
  { id: 'CMP-STATOR', equipmentId: 'EQ-001', name: '定子', type: 'stator', position: [0, 0, 0], scale: [1.2, 1.2, 2.4], color: '#4A6FA5' },
  { id: 'CMP-ROTOR', equipmentId: 'EQ-001', name: '转子', type: 'rotor', position: [0, 0, 0], scale: [0.8, 0.8, 2.2], color: '#7B8D9E' },
  { id: 'CMP-BEARING-F', equipmentId: 'EQ-001', name: '前轴承', type: 'bearing', position: [0, 0, 1.4], scale: [0.9, 0.9, 0.3], color: '#C0C0C0' },
  { id: 'CMP-BEARING-R', equipmentId: 'EQ-001', name: '后轴承', type: 'bearing', position: [0, 0, -1.4], scale: [0.9, 0.9, 0.3], color: '#C0C0C0' },
  { id: 'CMP-SHAFT', equipmentId: 'EQ-001', name: '主轴', type: 'shaft', position: [0, 0, 0], scale: [0.3, 0.3, 3.0], color: '#8B8682' },
  { id: 'CMP-HOUSING', equipmentId: 'EQ-001', name: '机壳', type: 'housing', position: [0, 0, 0], scale: [1.4, 1.4, 2.6], color: '#5C6670' },
  { id: 'CMP-WINDING', equipmentId: 'EQ-001', name: '绕组', type: 'winding', position: [0, 0, 0.4], scale: [1.0, 1.0, 0.8], color: '#D4A76A' },
  { id: 'CMP-SENSOR', equipmentId: 'EQ-001', name: '扭矩传感器', type: 'sensor', position: [1.0, 0, 1.6], scale: [0.2, 0.2, 0.2], color: '#FF6B35' },
]

export const nameplateRecords: NameplateRecord[] = [
  { id: 'NP-001', equipmentId: 'EQ-001', fieldName: '额定扭矩', originalValue: '955', currentValue: '955', unit: 'N·m', changed: false },
  { id: 'NP-002', equipmentId: 'EQ-001', fieldName: '额定转速', originalValue: '1500', currentValue: '1500', unit: 'r/min', changed: false },
  { id: 'NP-003', equipmentId: 'EQ-001', fieldName: '额定功率', originalValue: '150', currentValue: '155', unit: 'kW', changed: true },
  { id: 'NP-004', equipmentId: 'EQ-001', fieldName: '额定电压', originalValue: '380', currentValue: '380', unit: 'V', changed: false },
  { id: 'NP-005', equipmentId: 'EQ-001', fieldName: '绝缘等级', originalValue: 'F', currentValue: 'H', unit: '', changed: true },
  { id: 'NP-006', equipmentId: 'EQ-001', fieldName: '安全阈值', originalValue: '5', currentValue: '8', unit: '%', changed: true },
]

export const nameplateChanges: NameplateChange[] = [
  { id: 'NC-001', recordId: 'NP-003', oldValue: '150', newValue: '155', changedAt: '2025-03-12 14:30', changedBy: '张工', source: '口头说明' },
  { id: 'NC-002', recordId: 'NP-005', oldValue: 'F', newValue: 'H', changedAt: '2025-03-15 09:15', changedBy: '李工', source: '铭牌' },
  { id: 'NC-003', recordId: 'NP-006', oldValue: '5', newValue: '8', changedAt: '2025-03-18 16:45', changedBy: '王工', source: '口头说明' },
]

const generateTimePoints = (count: number, startStr: string): string[] => {
  const start = new Date(startStr).getTime()
  const interval = 3600 * 1000
  return Array.from({ length: count }, (_, i) => new Date(start + i * interval).toISOString())
}

const timePoints = generateTimePoints(72, '2025-03-10T08:00:00')

export const torqueRecords: TorqueRecord[] = timePoints.flatMap((ts, i) => {
  const baseError = Math.sin(i / 12) * 2 + (i > 40 ? (i - 40) * 0.3 : 0)
  const severity: 'normal' | 'warning' | 'critical' = Math.abs(baseError) > 6 ? 'critical' : Math.abs(baseError) > 4 ? 'warning' : 'normal'
  return motorComponents.map((cmp) => ({
    id: `TR-${i}-${cmp.id}`,
    equipmentId: 'EQ-001',
    componentId: cmp.id,
    measuredTorque: 955 + baseError * (cmp.type === 'rotor' ? 3 : cmp.type === 'bearing' ? 5 : 2) + (Math.random() - 0.5) * 2,
    ratedTorque: 955,
    errorPercent: parseFloat((baseError * (cmp.type === 'rotor' ? 1.5 : cmp.type === 'bearing' ? 2 : 0.8) + (Math.random() - 0.5) * 0.5).toFixed(2)),
    timestamp: ts,
    severity,
  }))
})

export const anomalyEvents: AnomalyEvent[] = [
  { id: 'AE-001', componentId: 'CMP-ROTOR', type: '扭矩超限', severity: 'high', timestamp: '2025-03-12 14:00', description: '转子扭矩偏差达7.2%，超过安全阈值5%' },
  { id: 'AE-002', componentId: 'CMP-BEARING-F', type: '扭矩超限', severity: 'medium', timestamp: '2025-03-15 10:30', description: '前轴承扭矩偏差4.8%，接近安全阈值' },
  { id: 'AE-003', componentId: 'CMP-SENSOR', type: '数据异常', severity: 'high', timestamp: '2025-03-18 16:00', description: '扭矩传感器读数跳变，疑似校准偏移' },
  { id: 'AE-004', componentId: 'CMP-ROTOR', type: '阈值变更', severity: 'high', timestamp: '2025-03-18 16:45', description: '安全阈值从5%调整为8%，需复核归因结论' },
]

export const thresholdBreaches: ThresholdBreach[] = [
  { id: 'TB-001', recordId: 'TR-50-CMP-ROTOR', parameterName: '安全阈值', oldValue: 5, newValue: 8, changedAt: '2025-03-18 16:45' },
]

export const defaultParameterSet: ParameterSet = {
  id: 'PS-001',
  safetyThreshold: 8,
  calculationCoeff: 1.0,
  formula: '误差% = (实测扭矩 - 额定扭矩) / 额定扭矩 × 100%',
  unit: '%',
}

export function recalculate(
  params: ParameterSet,
  componentId: string,
  componentName: string,
  currentError: number,
  previousThreshold: number
): RecalcResult {
  const adjustedError = currentError * params.calculationCoeff
  const wasBreached = Math.abs(currentError) > previousThreshold
  const isBreached = Math.abs(adjustedError) > params.safetyThreshold
  const boundaryValue = params.safetyThreshold
  const boundarySample = `边界样本：当误差 = ${boundaryValue}${params.unit}时，恰好触及阈值线，实测扭矩 = ${(955 * (1 + boundaryValue / 100)).toFixed(1)} N·m`

  let explanation = ''
  if (wasBreached && !isBreached) {
    explanation = `阈值从${previousThreshold}${params.unit}调整为${params.safetyThreshold}${params.unit}后，${componentName}的误差${adjustedError.toFixed(2)}${params.unit}不再越限。此前触发的异常告警可能不再成立，建议复核归因结论。`
  } else if (!wasBreached && isBreached) {
    explanation = `阈值从${previousThreshold}${params.unit}调整为${params.safetyThreshold}${params.unit}后，${componentName}的误差${adjustedError.toFixed(2)}${params.unit}变为越限。需要关注是否遗漏了异常。`
  } else {
    explanation = `参数调整后，${componentName}的误差由${currentError.toFixed(2)}${params.unit}变为${adjustedError.toFixed(2)}${params.unit}，${isBreached ? '仍为越限状态' : '仍在安全范围内'}。计算系数${params.calculationCoeff}对结果产生${params.calculationCoeff > 1 ? '放大' : params.calculationCoeff < 1 ? '缩小' : '无'}影响。`
  }

  return {
    id: `RR-${params.id}-${componentId}`,
    parameterSetId: params.id,
    componentId,
    componentName,
    oldValue: currentError,
    newValue: parseFloat(adjustedError.toFixed(2)),
    delta: parseFloat((adjustedError - currentError).toFixed(2)),
    boundarySample,
    explanation,
  }
}

export function checkConsistency(
  displayedRecords: TorqueRecord[],
  csvRecords: TorqueRecord[]
): { passed: boolean; pageStatus: string; csvStatus: string; mismatches: string[] } {
  const mismatches: string[] = []
  if (displayedRecords.length !== csvRecords.length) {
    mismatches.push(`记录数量不一致：页面${displayedRecords.length}条 vs CSV ${csvRecords.length}条`)
  }
  for (let i = 0; i < Math.min(displayedRecords.length, csvRecords.length); i++) {
    const d = displayedRecords[i]
    const c = csvRecords[i]
    if (d.severity !== c.severity) {
      mismatches.push(`记录${d.id}严重等级不一致：页面${d.severity} vs CSV ${c.severity}`)
    }
    if (Math.abs(d.errorPercent - c.errorPercent) > 0.01) {
      mismatches.push(`记录${d.id}误差值不一致：页面${d.errorPercent} vs CSV ${c.errorPercent}`)
    }
  }
  return {
    passed: mismatches.length === 0,
    pageStatus: `${displayedRecords.length}条记录`,
    csvStatus: `${csvRecords.length}条记录`,
    mismatches,
  }
}

export function detectCaliberInconsistency(): { field: string; issue: string; sources: string[] }[] {
  return [
    {
      field: '额定功率',
      issue: '铭牌记录150kW vs 口头说明155kW，口径不一致',
      sources: ['铭牌', '口头说明'],
    },
    {
      field: '绝缘等级',
      issue: '原始记录F级 vs 当前铭牌H级，变更来源标注为铭牌本身',
      sources: ['铭牌', '正常记录'],
    },
    {
      field: '安全阈值',
      issue: '原始5%被改为8%，口头说明中无此变更依据',
      sources: ['口头说明', '铭牌'],
    },
  ]
}
