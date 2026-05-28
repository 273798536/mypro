import type { PulleyRecord, CalculationResult, WeightUnit } from '../types'

export function weightToNewtons(value: number, unit: WeightUnit): number {
  if (unit === 'N') return value
  if (unit === 'kg') return value * 9.8
  if (unit === 'g') return (value / 1000) * 9.8
  return value
}

export function calculateRopeSegments(movingPulleys: number): number {
  return 2 * movingPulleys
}

export function calculatePulleySystem(record: PulleyRecord): CalculationResult {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const weightN = weightToNewtons(record.objectWeight, record.weightUnit)
  const n = calculateRopeSegments(record.movingPulleys)
  const mu = record.frictionCoefficient

  const hasInvalidInputs =
    mu < 0 || mu >= 1 || n <= 0 || weightN <= 0 || isNaN(weightN)

  if (hasInvalidInputs) {
    return {
      id,
      recordId: record.id,
      ropeSegments: n,
      pullingForce: null,
      mechanicalEfficiency: null,
      usefulWork: null,
      totalWork: null,
      isValid: false,
      calculatedAt: now,
    }
  }

  const denominator = n * (1 - mu)
  const pullingForce = denominator > 0 ? weightN / denominator : null
  const usefulWork = weightN
  const totalWork = pullingForce !== null ? pullingForce * n : null
  const mechanicalEfficiency =
    pullingForce !== null && pullingForce > 0
      ? (weightN / (n * pullingForce)) * 100
      : null

  const isValid =
    mechanicalEfficiency !== null &&
    mechanicalEfficiency > 0 &&
    mechanicalEfficiency <= 100 &&
    isFinite(mechanicalEfficiency)

  return {
    id,
    recordId: record.id,
    ropeSegments: n,
    pullingForce,
    mechanicalEfficiency,
    usefulWork,
    totalWork,
    isValid,
    calculatedAt: now,
  }
}
