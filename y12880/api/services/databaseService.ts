import { getDatabase } from '../database/index.js'

export interface TableInfo {
  name: string
  count: number
}

export interface DatabaseStatus {
  tables: TableInfo[]
  latestBatch: string
  totalRecords: number
  databasePath: string
}

export function getDatabaseStatus(): DatabaseStatus {
  const db = getDatabase()

  const tableNames = [
    'platforms',
    'equipment',
    'check_batches',
    'tide_data',
    'buoy_data',
    'conflict_records',
    'risk_records',
    'reports',
  ]

  const tables: TableInfo[] = []
  let totalRecords = 0

  for (const tableName of tableNames) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }
      tables.push({ name: tableName, count: result.count })
      totalRecords += result.count
    } catch (e) {
      tables.push({ name: tableName, count: 0 })
    }
  }

  const latestBatchRow = db.prepare(
    'SELECT name FROM check_batches ORDER BY created_at DESC LIMIT 1'
  ).get() as { name?: string } | undefined

  return {
    tables,
    latestBatch: latestBatchRow?.name || '暂无数据',
    totalRecords,
    databasePath: 'data/inspection.db',
  }
}

export default {
  getDatabaseStatus,
}
