import { getUnitDefinition } from '@/data/unitConfigs'
import type { UnitDefinition, UnitCategory } from '@/types'

export function convertToBase(value: number, fromUnit: string): number {
  const unitInfo = getUnitDefinition(fromUnit)
  if (!unitInfo) return value

  const { unit } = unitInfo
  if (typeof unit.toBase === 'number') {
    return value * unit.toBase
  }
  return unit.toBase(value)
}

export function convertFromBase(value: number, toUnit: string): number {
  const unitInfo = getUnitDefinition(toUnit)
  if (!unitInfo) return value

  const { unit } = unitInfo
  if (typeof unit.fromBase === 'number') {
    return value * unit.fromBase
  }
  return unit.fromBase(value)
}

export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value
  const baseValue = convertToBase(value, fromUnit)
  return convertFromBase(baseValue, toUnit)
}

export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const cat1 = getUnitDefinition(unit1)?.category.category
  const cat2 = getUnitDefinition(unit2)?.category.category
  return cat1 !== undefined && cat1 === cat2
}

export function getCompatibleUnits(unit: string): UnitDefinition[] {
  const category = getUnitDefinition(unit)?.category
  if (!category) return []
  return category.units
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(decimals)
  }
  return value.toFixed(decimals)
}
