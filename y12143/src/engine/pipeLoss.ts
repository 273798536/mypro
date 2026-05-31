import type { PipeParamsNormalized, LocalResistanceItem, CalculationSnapshot, CalculationWarning, PumpMatchResult, PumpModel } from '@/types'
import { pumpModels } from '@/data/pumpModels'

const G = 9.80665
const WATER_VISCOSITY = 1.004e-6

export function calcVelocity(flowM3s: number, diameterM: number): number {
  if (diameterM <= 0) return 0
  const area = (Math.PI / 4) * diameterM * diameterM
  if (area <= 0) return 0
  return flowM3s / area
}

export function calcReynolds(velocity: number, diameterM: number): number {
  if (diameterM <= 0) return 0
  return (velocity * diameterM) / WATER_VISCOSITY
}

export function calcFrictionLossHazenWilliams(
  flowM3s: number,
  diameterM: number,
  lengthM: number,
  c: number
): number {
  if (diameterM <= 0 || c <= 0 || lengthM <= 0 || flowM3s <= 0) return 0
  const hf = 10.67 * lengthM * Math.pow(flowM3s, 1.852) / (Math.pow(c, 1.852) * Math.pow(diameterM, 4.87))
  return hf
}

export function calcLocalLoss(
  velocity: number,
  items: LocalResistanceItem[]
): number {
  if (velocity <= 0) return 0
  const sumXi = items.reduce((sum, item) => sum + item.coefficient * item.quantity, 0)
  return sumXi * (velocity * velocity) / (2 * G)
}

export function calcRequiredHead(
  frictionLoss: number,
  localLoss: number,
  staticHead: number,
  marginFactor: number
): number {
  const headLoss = frictionLoss + localLoss + staticHead
  return headLoss * (1 + marginFactor)
}

export function calcMarginPercent(ratedHead: number, requiredHead: number): number {
  if (requiredHead <= 0) return 0
  return ((ratedHead - requiredHead) / requiredHead) * 100
}

export function getMarginStatus(marginPercent: number): 'green' | 'yellow' | 'red' {
  if (marginPercent >= 10) return 'green'
  if (marginPercent >= 5) return 'yellow'
  return 'red'
}

export function matchPumps(requiredHead: number, requiredFlow: number, pumps: PumpModel[] = pumpModels): PumpMatchResult[] {
  return pumps
    .map(pump => {
      const marginPercent = calcMarginPercent(pump.ratedHead, requiredHead)
      return {
        pumpId: pump.id,
        pumpName: pump.name,
        ratedFlow: pump.ratedFlow,
        ratedHead: pump.ratedHead,
        efficiency: pump.efficiency,
        marginPercent,
        marginStatus: getMarginStatus(marginPercent),
        isExpired: pump.isExpired,
      }
    })
    .filter(p => p.ratedFlow >= requiredFlow * 0.8 && p.ratedHead >= requiredHead * 0.9)
    .sort((a, b) => {
      if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1
      return Math.abs(a.marginPercent - 15) - Math.abs(b.marginPercent - 15)
    })
}

export function validateParams(params: Partial<PipeParamsNormalized>): CalculationWarning[] {
  const warnings: CalculationWarning[] = []

  if (params.designFlow === undefined || params.designFlow <= 0) {
    warnings.push({ severity: 'error', code: 'MISSING_FLOW', message: '设计流量缺失或为零', field: 'designFlow' })
  }
  if (params.pipeDiameter === undefined || params.pipeDiameter <= 0) {
    warnings.push({ severity: 'error', code: 'MISSING_DIAMETER', message: '管径缺失或为零', field: 'pipeDiameter' })
  }
  if (params.pipeLength === undefined || params.pipeLength <= 0) {
    warnings.push({ severity: 'warning', code: 'MISSING_LENGTH', message: '管长缺失或为零', field: 'pipeLength' })
  }
  if (params.localResistanceCoeffs === undefined || params.localResistanceCoeffs.length === 0) {
    warnings.push({ severity: 'warning', code: 'MISSING_LOCAL_RESISTANCE', message: '局部阻力未填写，将按0计算', field: 'localResistanceCoeffs' })
  }
  if (params.hazenWilliamsC === undefined || params.hazenWilliamsC <= 0) {
    warnings.push({ severity: 'warning', code: 'MISSING_HAZEN_C', message: '海曾-威廉系数缺失，使用默认值130', field: 'hazenWilliamsC' })
  }

  if (params.designFlow && params.pipeDiameter) {
    const v = calcVelocity(params.designFlow, params.pipeDiameter)
    if (v > 3) {
      warnings.push({ severity: 'warning', code: 'HIGH_VELOCITY', message: `流速${v.toFixed(2)}m/s超过3m/s，建议增大管径`, field: 'pipeDiameter' })
    }
    if (v < 0.6 && v > 0) {
      warnings.push({ severity: 'info', code: 'LOW_VELOCITY', message: `流速${v.toFixed(2)}m/s低于0.6m/s，可能需减小管径`, field: 'pipeDiameter' })
    }
  }

  return warnings
}

export function computeFull(
  params: PipeParamsNormalized,
  triggerType: 'import' | 'correction' | 'initial' = 'initial'
): CalculationSnapshot {
  const warnings = validateParams(params)

  const velocity = calcVelocity(params.designFlow, params.pipeDiameter)
  const reynolds = calcReynolds(velocity, params.pipeDiameter)
  const frictionLoss = calcFrictionLossHazenWilliams(
    params.designFlow, params.pipeDiameter, params.pipeLength, params.hazenWilliamsC
  )
  const localLoss = calcLocalLoss(velocity, params.localResistanceCoeffs)
  const totalHeadLoss = frictionLoss + localLoss
  const requiredHead = calcRequiredHead(
    frictionLoss, localLoss, params.staticHead, params.marginFactor
  )
  const marginPercent = 0
  const matchedPumps = matchPumps(requiredHead, params.designFlow * 1000, pumpModels)

  const flowLs = params.designFlow * 1000

  return {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    triggerType,
    calculatedAt: new Date().toISOString(),
    frictionLoss,
    localLoss,
    totalHeadLoss,
    velocity,
    reynolds,
    requiredHead,
    marginPercent,
    matchedPumps: matchedPumps.map(p => ({
      ...p,
      marginPercent: calcMarginPercent(p.ratedHead, requiredHead),
      marginStatus: getMarginStatus(calcMarginPercent(p.ratedHead, requiredHead)),
    })),
    warnings,
  }
}
