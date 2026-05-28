import type { PulleyRecord, ValidationWarning, WarningLevel } from '../types'
import { calculateRopeSegments, weightToNewtons } from './calculations'

export function validatePulleyRecord(record: PulleyRecord): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const now = new Date().toISOString()
  const uid = () => crypto.randomUUID()

  const n = calculateRopeSegments(record.movingPulleys)
  const expectedSegments = 2 * record.movingPulleys
  if (n !== expectedSegments || record.movingPulleys + record.fixedPulleys !== record.pulleyCount) {
    warnings.push({
      id: uid(),
      recordId: record.id,
      warningType: 'rope_segment_mismatch',
      level: 'error',
      message: `绳段数异常：${record.movingPulleys}个动滑轮应对应${expectedSegments}段绳，但当前配置不匹配`,
      physicsExplanation: '标准滑轮组中，绳段数 = 2 × 动滑轮数。如果绳从动滑轮开始绕，则绳段数 = 2×动滑轮数+1。请检查滑轮配置是否正确。',
      detectedAt: now,
    })
  }

  const weightN = weightToNewtons(record.objectWeight, record.weightUnit)
  const mu = record.frictionCoefficient

  if (record.weightUnit !== 'N') {
    warnings.push({
      id: uid(),
      recordId: record.id,
      warningType: 'unit_mismatch',
      level: 'warning',
      message: `单位混用：重量使用了"${record.weightUnit}"，默认受力单位为牛顿(N)`,
      physicsExplanation: `当前输入${record.objectWeight}${record.weightUnit}已自动转换为${weightN.toFixed(2)}N。建议统一使用N以避免计算混淆。`,
      detectedAt: now,
    })
  }

  if (!record.ropeLengthUnit) {
    warnings.push({
      id: uid(),
      recordId: record.id,
      warningType: 'missing_length_unit',
      level: 'warning',
      message: `绳长"${record.ropeLength}"缺少单位标注`,
      physicsExplanation: '没有单位的数值在物理计算中无意义，请补充单位（m或cm）。',
      detectedAt: now,
    })
  }

  if (mu < 0) {
    warnings.push({
      id: uid(),
      recordId: record.id,
      warningType: 'friction_out_of_range',
      level: 'error',
      message: `摩擦系数${mu}无效：不能为负数`,
      physicsExplanation: '摩擦系数μ表示摩擦力与正压力的比值，物理上0 ≤ μ < 1。负值无物理意义。',
      detectedAt: now,
    })
  }

  if (mu >= 1) {
    warnings.push({
      id: uid(),
      recordId: record.id,
      warningType: 'friction_out_of_range',
      level: 'error',
      message: `摩擦系数${mu}无效：不能大于等于1`,
      physicsExplanation: '当μ≥1时，摩擦力超过正压力，系统无法运动，机械效率计算无意义。',
      detectedAt: now,
    })
  }

  if (mu >= 0 && mu < 1 && weightN > 0 && n > 0) {
    const eta = (1 - mu) * 100
    if (eta > 100) {
      warnings.push({
        id: uid(),
        recordId: record.id,
        warningType: 'efficiency_over_100',
        level: 'error',
        message: `机械效率计算值${eta.toFixed(1)}%超过100%，违背能量守恒`,
        physicsExplanation: '机械效率η = 有用功/总功，永远不超过100%。超过100%意味着输出能量大于输入能量，违反能量守恒定律。',
        detectedAt: now,
      })
    } else if (eta > 95) {
      warnings.push({
        id: uid(),
        recordId: record.id,
        warningType: 'efficiency_near_limit',
        level: 'info',
        message: `机械效率${eta.toFixed(1)}%接近理论上限`,
        physicsExplanation: '实际滑轮组因摩擦损耗，效率通常在50%-90%之间。接近100%的结果需核实参数是否合理。',
        detectedAt: now,
      })
    }
  }

  if (record.ropeLength > 0 && n > 0) {
    const minLength = n * 0.3
    if (record.ropeLength < minLength) {
      warnings.push({
        id: uid(),
        recordId: record.id,
        warningType: 'rope_too_short',
        level: 'info',
        message: `绳长${record.ropeLength}${record.ropeLengthUnit || ''}可能不足以完成${n}段绕绳`,
        physicsExplanation: `每段绳至少需要约0.3m来绕过滑轮，${n}段绳建议最小长度约${minLength.toFixed(1)}m。`,
        detectedAt: now,
      })
    }
  }

  return warnings
}

export function getHighestLevel(warnings: ValidationWarning[]): WarningLevel | null {
  if (warnings.length === 0) return null
  const levels: WarningLevel[] = ['error', 'warning', 'info']
  for (const level of levels) {
    if (warnings.some((w) => w.level === level)) return level
  }
  return null
}
