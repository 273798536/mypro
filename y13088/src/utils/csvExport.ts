import type { LightPoint } from '@/types'

export function exportCsv(lights: LightPoint[], filename: string = '灯光明细') {
  const headers = ['编号', '标签', '类型', '色温(K)', '照度(lux)', '是否异常', '异常说明']
  const rows = lights.map(l => [
    l.id,
    l.label,
    typeLabel(l.type),
    String(l.colorTemp),
    String(l.illuminance),
    l.isAnomaly ? '是' : '否',
    l.anomalyNote ?? ''
  ])
  const bom = '\uFEFF'
  const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function typeLabel(t: string): string {
  const map: Record<string, string> = { top: '顶部', side: '侧面', bottom: '底部', accent: '重点' }
  return map[t] ?? t
}
