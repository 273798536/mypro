import { v4 as uuidv4 } from 'uuid'
import * as XLSX from 'xlsx'
import { getDb } from '../database/init.js'
import type { ImportType, UserType, UserCategory } from '../../shared/types.js'

interface ImportResult {
  task_id: string
  total_records: number
  success_count: number
  error_count: number
  error_details: string[]
}

interface ProfileRow {
  user_no: string
  name: string
  user_type: string
  user_category: string
  combined_group_id?: string
  population?: number | null
  area?: number | null
  address: string
  contact?: string | null
  discount_rate?: number | null
  discount_expire_date?: string | null
}

interface PaymentRow {
  user_no: string
  billing_month: string
  last_reading: number
  current_reading: number
  usage: number
  paid_amount: number
  payment_date?: string | null
}

const VALID_USER_TYPES: UserType[] = ['resident', 'commercial', 'industrial', 'temporary']
const VALID_USER_CATEGORIES: UserCategory[] = ['single', 'combined']
const VALID_IMPORT_TYPES: ImportType[] = ['profile', 'price', 'payment']

function validateProfileRow(row: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!row.user_no) errors.push('用户编号不能为空')
  if (!row.name) errors.push('用户姓名不能为空')
  if (!row.user_type || !VALID_USER_TYPES.includes(row.user_type as UserType)) errors.push(`用户类型无效: ${row.user_type}`)
  if (!row.user_category || !VALID_USER_CATEGORIES.includes(row.user_category as UserCategory)) errors.push(`用户类别无效: ${row.user_category}`)
  if (!row.address) errors.push('地址不能为空')
  return { valid: errors.length === 0, errors }
}

function validatePaymentRow(row: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!row.user_no) errors.push('用户编号不能为空')
  if (!row.billing_month) errors.push('账单月份不能为空')
  if (typeof row.last_reading !== 'number') errors.push('上期读数必须为数字')
  if (typeof row.current_reading !== 'number') errors.push('本期读数必须为数字')
  if (typeof row.usage !== 'number') errors.push('用水量必须为数字')
  if (typeof row.paid_amount !== 'number') errors.push('实缴金额必须为数字')
  return { valid: errors.length === 0, errors }
}

export function processImport(
  filePath: string,
  type: ImportType,
  createdBy: string
): ImportResult {
  const db = getDb()
  const now = new Date().toISOString()
  const taskId = uuidv4()

  if (!VALID_IMPORT_TYPES.includes(type)) {
    throw new Error(`不支持的导入类型: ${type}`)
  }

  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

  let successCount = 0
  let errorCount = 0
  const errorDetails: string[] = []

  const fileName = filePath.split('/').pop() || filePath

  db.prepare(
    `INSERT INTO import_task (id, type, file_name, original_file_path, total_records, success_count, error_count, error_details, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(taskId, type, fileName, filePath, rows.length, 0, 0, null, 'processing', createdBy, now)

  try {
    const transaction = db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        try {
          if (type === 'profile') {
            const validation = validateProfileRow(row)
            if (!validation.valid) {
              errorCount++
              errorDetails.push(`第${rowNum}行: ${validation.errors.join(', ')}`)
              continue
            }
            const p = row as unknown as ProfileRow
            db.prepare(
              `INSERT INTO user_profile (id, user_no, name, user_type, user_category, combined_group_id, population, area, address, contact, discount_rate, discount_expire_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), p.user_no, p.name, p.user_type, p.user_category, p.combined_group_id || null, p.population || null, p.area || null, p.address, p.contact || null, p.discount_rate || null, p.discount_expire_date || null, now)
            successCount++

          } else if (type === 'payment') {
            const validation = validatePaymentRow(row)
            if (!validation.valid) {
              errorCount++
              errorDetails.push(`第${rowNum}行: ${validation.errors.join(', ')}`)
              continue
            }
            const p = row as unknown as PaymentRow
            db.prepare(
              `INSERT INTO payment_record (id, user_no, billing_month, last_reading, current_reading, usage, paid_amount, payment_date, source_file, import_task_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), p.user_no, p.billing_month, p.last_reading, p.current_reading, p.usage, p.paid_amount, p.payment_date || null, fileName, taskId, now)
            successCount++

          } else if (type === 'price') {
            if (!row.user_type || !VALID_USER_TYPES.includes(row.user_type as UserType)) {
              errorCount++
              errorDetails.push(`第${rowNum}行: 用户类型无效`)
              continue
            }
            db.prepare(
              `INSERT INTO tier_price (id, user_type, tier, min_usage, max_usage, price_per_ton, effective_date)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), row.user_type as string, row.tier as number, row.min_usage as number, row.max_usage as number, row.price_per_ton as number, row.effective_date as string || now)
            successCount++
          }
        } catch (err) {
          errorCount++
          errorDetails.push(`第${rowNum}行: ${(err as Error).message}`)
        }
      }
    })

    transaction()

    db.prepare(
      'UPDATE import_task SET success_count = ?, error_count = ?, error_details = ?, status = ? WHERE id = ?'
    ).run(successCount, errorCount, errorDetails.length > 0 ? JSON.stringify(errorDetails) : null, 'completed', taskId)

  } catch (err) {
    db.prepare(
      'UPDATE import_task SET error_count = ?, error_details = ?, status = ? WHERE id = ?'
    ).run(rows.length, (err as Error).message, 'failed', taskId)
  }

  return {
    task_id: taskId,
    total_records: rows.length,
    success_count: successCount,
    error_count: errorCount,
    error_details: errorDetails,
  }
}
