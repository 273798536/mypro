import type { UnitCategory, UnitDef } from '@/types'

const UNITS: Record<string, UnitDef> = {
  degC: { category: 'temperature', label: '°C', toBase: (v) => v, fromBase: (v) => v },
  degF: { category: 'temperature', label: '°F', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
  degK: { category: 'temperature', label: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  MPa: { category: 'pressure', label: 'MPa', toBase: (v) => v, fromBase: (v) => v },
  bar: { category: 'pressure', label: 'bar', toBase: (v) => v * 0.1, fromBase: (v) => v / 0.1 },
  psi: { category: 'pressure', label: 'psi', toBase: (v) => v * 0.00689476, fromBase: (v) => v / 0.00689476 },
  kPa: { category: 'pressure', label: 'kPa', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
  mm_s: { category: 'vibration', label: 'mm/s', toBase: (v) => v, fromBase: (v) => v },
  in_s: { category: 'vibration', label: 'in/s', toBase: (v) => v * 25.4, fromBase: (v) => v / 25.4 },
  g_rms: { category: 'vibration', label: 'g(rms)', toBase: (v) => v * 9.81 * 1000, fromBase: (v) => v / 9.81 / 1000 },
  m3_h: { category: 'flow', label: 'm³/h', toBase: (v) => v, fromBase: (v) => v },
  L_min: { category: 'flow', label: 'L/min', toBase: (v) => v * 0.06, fromBase: (v) => v / 0.06 },
  gal_min: { category: 'flow', label: 'gal/min', toBase: (v) => v * 0.227125, fromBase: (v) => v / 0.227125 },
  V: { category: 'voltage', label: 'V', toBase: (v) => v, fromBase: (v) => v },
  mV: { category: 'voltage', label: 'mV', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
  kV: { category: 'voltage', label: 'kV', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  A: { category: 'current', label: 'A', toBase: (v) => v, fromBase: (v) => v },
  mA: { category: 'current', label: 'mA', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
}

export function getUnitDef(unitKey: string): UnitDef | undefined {
  return UNITS[unitKey]
}

export function getUnitsByCategory(category: UnitCategory): { key: string; label: string }[] {
  return Object.entries(UNITS)
    .filter(([, def]) => def.category === category)
    .map(([key, def]) => ({ key, label: def.label }))
}

export function convertToBase(value: number, fromUnit: string): { converted: number; baseUnit: string; category: UnitCategory } | null {
  const def = UNITS[fromUnit]
  if (!def) return null
  return {
    converted: def.toBase(value),
    baseUnit: getBaseUnitKey(def.category),
    category: def.category,
  }
}

export function convertFromBase(value: number, toUnit: string): number | null {
  const def = UNITS[toUnit]
  if (!def) return null
  return def.fromBase(value)
}

export function getBaseUnitKey(category: UnitCategory): string {
  const bases: Record<UnitCategory, string> = {
    temperature: 'degC',
    pressure: 'MPa',
    vibration: 'mm_s',
    flow: 'm3_h',
    voltage: 'V',
    current: 'A',
  }
  return bases[category]
}

export function getAllUnitCategories(): UnitCategory[] {
  return ['temperature', 'pressure', 'vibration', 'flow', 'voltage', 'current']
}

export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const d1 = UNITS[unit1]
  const d2 = UNITS[unit2]
  if (!d1 || !d2) return false
  return d1.category === d2.category
}

export function formatConvertedValue(value: number, fromUnit: string, toUnit: string): string {
  const base = convertToBase(value, fromUnit)
  if (!base) return `${value} ${fromUnit}`
  const result = convertFromBase(base.converted, toUnit)
  if (result === null) return `${value} ${fromUnit}`
  return `${result.toFixed(4)} ${UNITS[toUnit]?.label ?? toUnit}`
}

export { UNITS }
