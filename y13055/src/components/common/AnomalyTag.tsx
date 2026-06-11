import type { AnomalyType } from '@/types'

interface AnomalyTagProps {
  type: AnomalyType
}

const anomalyConfig = {
  name_mismatch: {
    label: '名称不一致',
    className: 'bg-red-100 text-red-800'
  },
  floor_unit_mix: {
    label: '楼层单位混写',
    className: 'bg-orange-100 text-orange-800'
  },
  coordinate_offset: {
    label: '坐标偏移',
    className: 'bg-indigo-100 text-indigo-800'
  },
  none: {
    label: '正常',
    className: 'bg-slate-100 text-slate-800'
  }
}

export function AnomalyTag({ type }: AnomalyTagProps) {
  const config = anomalyConfig[type]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
