import Papa from 'papaparse'
import type { AccelerationRecord, DisplacementRecord } from '@/types'

export interface ParseResult<T> {
  success: boolean
  data: T[]
  errors: string[]
  warnings: string[]
}

function parseTimestamp(row: Record<string, unknown>, rowIndex: number, baseTime: number): number {
  const tsRaw = row['timestamp'] ?? row['time'] ?? row['Time'] ?? row['时间'] ?? row['t']
  if (tsRaw === undefined || tsRaw === null || tsRaw === '') {
    return baseTime + rowIndex * 20
  }
  const tsNum = Number(tsRaw)
  if (!Number.isFinite(tsNum)) {
    return baseTime + rowIndex * 20
  }
  if (tsNum < 1000000000) {
    return baseTime + tsNum * 1000
  }
  return tsNum
}

function parseValue(row: Record<string, unknown>, possibleKeys: string[]): number {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      const val = Number(row[key])
      if (Number.isFinite(val)) {
        return val
      }
    }
  }
  return 0
}

function parseSaturated(row: Record<string, unknown>): boolean {
  const satRaw = row['saturated'] ?? row['饱和'] ?? row['sat'] ?? row['overflow']
  if (satRaw === undefined || satRaw === null) return false
  if (typeof satRaw === 'boolean') return satRaw
  if (typeof satRaw === 'number') return satRaw !== 0
  const strVal = String(satRaw).toLowerCase()
  return strVal === 'true' || strVal === '1' || strVal === 'yes' || strVal === '是'
}

function detectHeaders(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return []
  return Object.keys(rows[0])
}

export function parseAccelerationCSV(file: File): Promise<ParseResult<AccelerationRecord>> {
  return new Promise((resolve) => {
    const warnings: string[] = []
    const errors: string[] = []

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawRows = results.data as Record<string, unknown>[]

          if (rawRows.length === 0) {
            errors.push('CSV 文件为空或没有有效数据行')
            resolve({ success: false, data: [], errors, warnings })
            return
          }

          const headers = detectHeaders(rawRows)
          const hasTimestamp = headers.some(h =>
            h.toLowerCase() === 'timestamp' ||
            h.toLowerCase() === 'time' ||
            h === '时间' ||
            h.toLowerCase() === 't'
          )
          if (!hasTimestamp) {
            warnings.push('未检测到时间戳列，将使用采样间隔自动生成')
          }

          const baseTime = Date.now()
          const records: AccelerationRecord[] = []

          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i]
            try {
              const ts = parseTimestamp(row, i, baseTime)
              const val = parseValue(row, ['value', 'acceleration', '加速度', 'pga', 'accel', 'a'])
              const sat = parseSaturated(row)

              if (!Number.isFinite(val)) {
                warnings.push(`第 ${i + 1} 行加速度值无效，已设为 0`)
              }

              records.push({
                timestamp: ts,
                value: Number.isFinite(val) ? val : 0,
                saturated: sat,
              })
            } catch (rowErr) {
              errors.push(`第 ${i + 1} 行解析失败: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`)
            }
          }

          const hasAllZeroValues = records.every(r => r.value === 0)
          if (hasAllZeroValues) {
            warnings.push('所有加速度值均为 0，请检查 CSV 列名是否正确。检测到的列: ' + headers.join(', '))
          }

          resolve({
            success: records.length > 0,
            data: records,
            errors,
            warnings,
          })
        } catch (e) {
          errors.push(`解析失败: ${e instanceof Error ? e.message : String(e)}`)
          resolve({ success: false, data: [], errors, warnings })
        }
      },
      error: (error: Error) => {
        errors.push(`文件读取失败: ${error.message}`)
        resolve({ success: false, data: [], errors, warnings })
      },
    })
  })
}

export function parseDisplacementCSV(file: File): Promise<ParseResult<DisplacementRecord>> {
  return new Promise((resolve) => {
    const warnings: string[] = []
    const errors: string[] = []

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawRows = results.data as Record<string, unknown>[]

          if (rawRows.length === 0) {
            errors.push('CSV 文件为空或没有有效数据行')
            resolve({ success: false, data: [], errors, warnings })
            return
          }

          const headers = detectHeaders(rawRows)
          const hasTimestamp = headers.some(h =>
            h.toLowerCase() === 'timestamp' ||
            h.toLowerCase() === 'time' ||
            h === '时间' ||
            h.toLowerCase() === 't'
          )
          if (!hasTimestamp) {
            warnings.push('未检测到时间戳列，将使用采样间隔自动生成')
          }

          const baseTime = Date.now()
          const records: DisplacementRecord[] = []

          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i]
            try {
              const ts = parseTimestamp(row, i, baseTime)
              const val = parseValue(row, ['value', 'displacement', '位移', 'disp', 'd'])

              if (!Number.isFinite(val)) {
                warnings.push(`第 ${i + 1} 行位移值无效，已设为 0`)
              }

              records.push({
                timestamp: ts,
                value: Number.isFinite(val) ? val : 0,
              })
            } catch (rowErr) {
              errors.push(`第 ${i + 1} 行解析失败: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`)
            }
          }

          const hasAllZeroValues = records.every(r => r.value === 0)
          if (hasAllZeroValues) {
            warnings.push('所有位移值均为 0，请检查 CSV 列名是否正确。检测到的列: ' + headers.join(', '))
          }

          resolve({
            success: records.length > 0,
            data: records,
            errors,
            warnings,
          })
        } catch (e) {
          errors.push(`解析失败: ${e instanceof Error ? e.message : String(e)}`)
          resolve({ success: false, data: [], errors, warnings })
        }
      },
      error: (error: Error) => {
        errors.push(`文件读取失败: ${error.message}`)
        resolve({ success: false, data: [], errors, warnings })
      },
    })
  })
}
