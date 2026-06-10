import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import type { WeighingRow, WeighingValidation } from '../types/index.js'

function parseCSV(content: Buffer): WeighingRow[] {
  const records = parse(content.toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  return records.map((row, index) => ({
    rowIndex: index,
    reagentName: row.reagentName || row['试剂名称'] || row.reagent || '',
    batchNo: row.batchNo || row['批号'] || row.batch || '',
    concentration: parseFloat(row.concentration || row['浓度'] || row.conc || '0'),
    weight: parseFloat(row.weight || row['重量'] || row.mass || '0'),
    purity: parseFloat(row.purity || row['纯度'] || '0'),
  }))
}

function parseExcel(content: Buffer): WeighingRow[] {
  const workbook = XLSX.read(content, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const records = XLSX.utils.sheet_to_json(worksheet) as Record<string, string | number>[]

  return records.map((row, index) => ({
    rowIndex: index,
    reagentName: String(row.reagentName || row['试剂名称'] || row.reagent || ''),
    batchNo: String(row.batchNo || row['批号'] || row.batch || ''),
    concentration: Number(row.concentration || row['浓度'] || row.conc || 0),
    weight: Number(row.weight || row['重量'] || row.mass || 0),
    purity: Number(row.purity || row['纯度'] || 0),
  }))
}

export function parseWeighingFile(file: Express.Multer.File): WeighingRow[] {
  const ext = file.originalname.split('.').pop()?.toLowerCase()
  if (ext === 'csv') {
    return parseCSV(file.buffer)
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file.buffer)
  }
  throw new Error('不支持的文件格式，仅支持 CSV 和 Excel')
}

export function validateWeighingData(rows: WeighingRow[]): WeighingValidation {
  const missingFields: string[] = []
  const suspiciousRows: number[] = []

  if (rows.length === 0) {
    missingFields.push('数据行')
  }

  rows.forEach((row, idx) => {
    const hasIssue: string[] = []
    if (!row.reagentName) hasIssue.push('试剂名称')
    if (!row.batchNo) hasIssue.push('批号')
    if (isNaN(row.concentration) || row.concentration <= 0) hasIssue.push('浓度')
    if (isNaN(row.weight) || row.weight <= 0) hasIssue.push('重量')
    if (isNaN(row.purity) || row.purity <= 0 || row.purity > 100) hasIssue.push('纯度')

    if (hasIssue.length > 0) {
      suspiciousRows.push(idx)
      missingFields.push(`第${idx + 1}行缺少: ${hasIssue.join('、')}`)
    }

    if (row.purity > 99.9) {
      suspiciousRows.push(idx)
    }
  })

  return {
    isValid: missingFields.length === 0,
    missingFields: [...new Set(missingFields)],
    suspiciousRows: [...new Set(suspiciousRows)],
  }
}
