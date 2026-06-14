import type { ConflictRecord, ExportConfig, FilterCriteria } from '@/types'
import { COLUMN_LABELS, STATUS_LABELS } from '@/types'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatRecordForCsv(
  record: ConflictRecord,
  columns: string[],
  includeSupplementaryRemarks: boolean,
): string[] {
  return columns.map((col) => {
    switch (col) {
      case 'songAlias':
        return record.songAlias.join('、')
      case 'status':
        return STATUS_LABELS[record.status]
      case 'remarks':
        return record.remarks.map((r) => r.content).join('；')
      case 'supplementaryRemarks':
        if (!includeSupplementaryRemarks) return ''
        return record.supplementaryRemarks
          .map((sr) => {
            const parts = [sr.content]
            if (sr.changeDescription) parts.push(`变化说明：${sr.changeDescription}`)
            parts.push(`${sr.operator} 于 ${sr.createdAt}`)
            return parts.join('｜')
          })
          .join('；')
      default:
        return String((record as unknown as Record<string, unknown>)[col] ?? '')
    }
  })
}

function formatFilterCriteriaRow(filter: FilterCriteria): string {
  const parts: string[] = ['筛选口径']
  if (filter.status.length > 0) {
    parts.push(`状态：${filter.status.map((s) => STATUS_LABELS[s]).join('、')}`)
  }
  if (filter.timecodeRangeStart || filter.timecodeRangeEnd) {
    parts.push(`时码范围：${filter.timecodeRangeStart || '*'} ~ ${filter.timecodeRangeEnd || '*'}`)
  }
  if (filter.keyword) {
    parts.push(`关键词：${filter.keyword}`)
  }
  if (filter.hasSupplementaryRemark !== null) {
    parts.push(`有后补备注：${filter.hasSupplementaryRemark ? '是' : '否'}`)
  }
  if (parts.length === 1) parts.push('无筛选条件（全部记录）')
  return parts.join('｜')
}

export function exportToCsv(
  records: ConflictRecord[],
  config: ExportConfig,
  filter: FilterCriteria,
): void {
  const headerLabels = config.selectedColumns.map((col) => COLUMN_LABELS[col] || col)
  const rows: string[][] = []

  if (config.includeFilterCriteria) {
    const filterRow = new Array(config.selectedColumns.length).fill('')
    filterRow[0] = formatFilterCriteriaRow(filter)
    rows.push(filterRow)
    rows.push(new Array(config.selectedColumns.length).fill(''))
  }

  rows.push(headerLabels)

  for (const record of records) {
    rows.push(formatRecordForCsv(record, config.selectedColumns, config.includeSupplementaryRemarks))
  }

  const bom = '\uFEFF'
  const csvContent = bom + rows.map((row) => row.map(escapeCsvField).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `录音棚时码排期冲突_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateCsvPreview(
  records: ConflictRecord[],
  config: ExportConfig,
  filter: FilterCriteria,
): string[][] {
  void filter
  const headerLabels = config.selectedColumns.map((col) => COLUMN_LABELS[col] || col)
  const rows: string[][] = [headerLabels]
  for (const record of records) {
    rows.push(formatRecordForCsv(record, config.selectedColumns, config.includeSupplementaryRemarks))
  }
  return rows
}
