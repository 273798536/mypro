import type { UnitCategory, UnitDefinition } from '@/types'

export const unitConfigs: UnitCategory[] = [
  {
    category: 'length',
    baseUnit: 'm',
    units: [
      { name: '毫米', symbol: 'mm', toBase: 0.001, fromBase: 1000 },
      { name: '厘米', symbol: 'cm', toBase: 0.01, fromBase: 100 },
      { name: '分米', symbol: 'dm', toBase: 0.1, fromBase: 10 },
      { name: '米', symbol: 'm', toBase: 1, fromBase: 1 },
      { name: '千米', symbol: 'km', toBase: 1000, fromBase: 0.001 },
    ],
  },
  {
    category: 'mass',
    baseUnit: 'kg',
    units: [
      { name: '毫克', symbol: 'mg', toBase: 0.000001, fromBase: 1000000 },
      { name: '克', symbol: 'g', toBase: 0.001, fromBase: 1000 },
      { name: '千克', symbol: 'kg', toBase: 1, fromBase: 1 },
      { name: '吨', symbol: 't', toBase: 1000, fromBase: 0.001 },
    ],
  },
  {
    category: 'time',
    baseUnit: 's',
    units: [
      { name: '毫秒', symbol: 'ms', toBase: 0.001, fromBase: 1000 },
      { name: '秒', symbol: 's', toBase: 1, fromBase: 1 },
      { name: '分钟', symbol: 'min', toBase: 60, fromBase: 1 / 60 },
      { name: '小时', symbol: 'h', toBase: 3600, fromBase: 1 / 3600 },
    ],
  },
]

export function getUnitCategory(symbol: string): UnitCategory | undefined {
  return unitConfigs.find(cat => cat.units.some(u => u.symbol === symbol))
}

export function getUnitDefinition(symbol: string): { category: UnitCategory; unit: UnitDefinition } | undefined {
  for (const cat of unitConfigs) {
    const unit = cat.units.find(u => u.symbol === symbol)
    if (unit) {
      return { category: cat, unit }
    }
  }
  return undefined
}

export const sourceLabels: Record<string, string> = {
  normal: '正常记录',
  draft: '计算草稿',
  verbal: '口头备注',
}

export const sourceColors: Record<string, string> = {
  normal: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  verbal: 'bg-purple-100 text-purple-700 border-purple-200',
}

export const statusLabels: Record<string, string> = {
  processed: '已处理',
  pending: '处理中',
  evidence_needed: '待补证据',
}

export const statusColors: Record<string, string> = {
  processed: 'bg-green-100 text-green-700',
  pending: 'bg-blue-100 text-blue-700',
  evidence_needed: 'bg-amber-100 text-amber-700',
}
