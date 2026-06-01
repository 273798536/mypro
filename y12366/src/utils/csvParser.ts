import Papa from 'papaparse'
import type { AccelerationRecord, DisplacementRecord } from '@/types'

export function parseAccelerationCSV(file: File): Promise<AccelerationRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const records: AccelerationRecord[] = results.data.map((row: Record<string, unknown>) => {
            const ts = Number(row['timestamp'] ?? row['time'] ?? row['时间'] ?? 0)
            const val = Number(row['value'] ?? row['acceleration'] ?? row['加速度'] ?? row['pga'] ?? 0)
            const sat = Boolean(row['saturated'] ?? row['饱和'] ?? false)
            return { timestamp: ts || Date.now() + records.length * 20, value: val, saturated: sat }
          })
          resolve(records)
        } catch (e) {
          reject(e)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}

export function parseDisplacementCSV(file: File): Promise<DisplacementRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const records: DisplacementRecord[] = results.data.map((row: Record<string, unknown>) => {
            const ts = Number(row['timestamp'] ?? row['time'] ?? row['时间'] ?? 0)
            const val = Number(row['value'] ?? row['displacement'] ?? row['位移'] ?? 0)
            return { timestamp: ts || Date.now() + records.length * 20, value: val }
          })
          resolve(records)
        } catch (e) {
          reject(e)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}
