function escapeCsv(value: string | number | boolean): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCsv(rows: (string | number | boolean)[][], filename: string): void {
  const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const reasonLabelMap: Record<string, string> = {
  unit: '单位换算',
  formula: '公式变更',
  boundary: '边界调整',
}

const statusLabelMap: Record<string, string> = {
  processed: '已处理',
  pending_material: '待补材料',
  manual_override: '人工改判',
}

const sourceLabelMap: Record<string, string> = {
  written: '书面',
  oral: '口头',
  temporary: '临时',
}

export { reasonLabelMap, statusLabelMap, sourceLabelMap }
