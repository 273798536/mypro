import type { LengthUnit, FlowUnit, PressureUnit, UnitSpec } from '@/types'

const KPA_PER_MH2O = 9.80665
const MM_PER_M = 1000
const CM_PER_M = 100
const L_PER_M3 = 1000
const S_PER_H = 3600

export function normalizeLength(spec: UnitSpec<LengthUnit>): number {
  switch (spec.unit) {
    case 'm': return spec.value
    case 'mm': return spec.value / MM_PER_M
    case 'cm': return spec.value / CM_PER_M
  }
}

export function normalizeFlow(spec: UnitSpec<FlowUnit>): number {
  switch (spec.unit) {
    case 'm3/s': return spec.value
    case 'L/s': return spec.value / L_PER_M3
    case 'm3/h': return spec.value / S_PER_H
  }
}

export function normalizePressure(spec: UnitSpec<PressureUnit>): number {
  switch (spec.unit) {
    case 'mH2O': return spec.value
    case 'kPa': return spec.value / KPA_PER_MH2O
    case 'MPa': return (spec.value * 1000) / KPA_PER_MH2O
  }
}

export function formatLength(meters: number, targetUnit: LengthUnit = 'm'): string {
  switch (targetUnit) {
    case 'm': return `${meters.toFixed(2)} m`
    case 'mm': return `${(meters * MM_PER_M).toFixed(0)} mm`
    case 'cm': return `${(meters * CM_PER_M).toFixed(1)} cm`
  }
}

export function formatFlow(m3s: number, targetUnit: FlowUnit = 'L/s'): string {
  switch (targetUnit) {
    case 'm3/s': return `${m3s.toFixed(6)} m³/s`
    case 'L/s': return `${(m3s * L_PER_M3).toFixed(2)} L/s`
    case 'm3/h': return `${(m3s * S_PER_H).toFixed(2)} m³/h`
  }
}

export function detectFlowUnit(value: number, unitStr: string): FlowUnit {
  const lower = unitStr.toLowerCase().replace(/[³3]/g, '3').trim()
  if (lower === 'l/s' || lower === '升/秒') return 'L/s'
  if (lower === 'm3/h' || lower === 'm³/h' || lower === '立方米/时') return 'm3/h'
  if (lower === 'm3/s' || lower === 'm³/s' || lower === '立方米/秒') return 'm3/s'
  if (value > 0.1) return 'L/s'
  return 'm3/s'
}

export function detectLengthUnit(value: number, unitStr: string): LengthUnit {
  const lower = unitStr.toLowerCase().trim()
  if (lower === 'mm' || lower === '毫米') return 'mm'
  if (lower === 'cm' || lower === '厘米') return 'cm'
  if (lower === 'm' || lower === '米') return 'm'
  if (value > 100) return 'mm'
  if (value > 10) return 'cm'
  return 'm'
}

export function detectPressureUnit(value: number, unitStr: string): PressureUnit {
  const lower = unitStr.toLowerCase().trim()
  if (lower === 'kpa' || lower === '千帕') return 'kPa'
  if (lower === 'mpa' || lower === '兆帕') return 'MPa'
  if (lower === 'mh2o' || lower === '米水柱') return 'mH2O'
  if (value > 50) return 'kPa'
  return 'mH2O'
}
