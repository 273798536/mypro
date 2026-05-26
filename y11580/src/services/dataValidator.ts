import { CONFIG, DirtyType, RecordType } from '../config'

export interface ValidationResult {
  isValid: boolean
  dirtyType?: DirtyType
  dirtyRemark?: string
  missingFields?: string[]
}

export interface RecordData {
  recordType: RecordType
  storeId: string
  memberId?: string
  memberName?: string
  phone?: string
  amount: number
  quantity?: number
  transactionDate?: Date
  operator?: string
  [key: string]: any
}

const REQUIRED_FIELDS: Record<RecordType, string[]> = {
  [CONFIG.RECORD_TYPES.RECHARGE]: ['storeId', 'memberId', 'amount', 'transactionDate'],
  [CONFIG.RECORD_TYPES.REFUND]: ['storeId', 'memberId', 'amount', 'transactionDate'],
  [CONFIG.RECORD_TYPES.HANDOVER]: ['storeId', 'amount', 'operator'],
  [CONFIG.RECORD_TYPES.SCAN]: ['storeId', 'memberId', 'transactionDate']
}

export function checkMissingFields(data: RecordData): string[] {
  const required = REQUIRED_FIELDS[data.recordType] || []
  const missing: string[] = []
  
  for (const field of required) {
    const value = data[field as keyof RecordData]
    if (value === undefined || value === null || value === '') {
      missing.push(field)
    }
  }
  
  return missing
}

export function checkCrossDate(transactionDate: Date, batchDate: Date): boolean {
  const txnDate = new Date(transactionDate).toDateString()
  const batchDt = new Date(batchDate).toDateString()
  return txnDate !== batchDt
}

export function checkNameChange(existingName?: string, newName?: string): boolean {
  if (!existingName || !newName) return false
  return existingName !== newName
}

export function checkAmountConflict(existingAmount: number, newAmount: number): boolean {
  return Math.abs(existingAmount - newAmount) > 0.01
}

export function checkQuantityConflict(existingQty?: number | null, newQty?: number | null): boolean {
  if (existingQty === undefined || existingQty === null) return false
  if (newQty === undefined || newQty === null) return false
  return existingQty !== newQty
}

export interface ValidationContext {
  existingRecord?: {
    memberName?: string
    amount?: number
    quantity?: number
  }
  batchDate?: Date
}

export function validateRecord(
  data: RecordData,
  context: ValidationContext = {}
): ValidationResult {
  const missingFields = checkMissingFields(data)
  if (missingFields.length > 0) {
    return {
      isValid: false,
      dirtyType: CONFIG.DIRTY_TYPES.MISSING_FIELDS,
      dirtyRemark: `缺少必填字段: ${missingFields.join(', ')}`,
      missingFields
    }
  }

  if (context.batchDate && data.transactionDate) {
    if (checkCrossDate(data.transactionDate, context.batchDate)) {
      return {
        isValid: false,
        dirtyType: CONFIG.DIRTY_TYPES.CROSS_DATE,
        dirtyRemark: `交易日期 ${data.transactionDate.toISOString().split('T')[0]} 与批次日期 ${context.batchDate.toISOString().split('T')[0]} 不一致`
      }
    }
  }

  if (context.existingRecord) {
    const existing = context.existingRecord
    
    if (checkNameChange(existing.memberName, data.memberName)) {
      return {
        isValid: false,
        dirtyType: CONFIG.DIRTY_TYPES.NAME_CHANGED,
        dirtyRemark: `会员名称变更: ${existing.memberName} -> ${data.memberName}`
      }
    }

    if (existing.amount !== undefined && checkAmountConflict(existing.amount, data.amount)) {
      return {
        isValid: false,
        dirtyType: CONFIG.DIRTY_TYPES.AMOUNT_CONFLICT,
        dirtyRemark: `金额冲突: ${existing.amount} -> ${data.amount}`
      }
    }

    if (checkQuantityConflict(existing.quantity, data.quantity)) {
      return {
        isValid: false,
        dirtyType: CONFIG.DIRTY_TYPES.QUANTITY_CONFLICT,
        dirtyRemark: `数量冲突: ${existing.quantity} -> ${data.quantity}`
      }
    }
  }

  return { isValid: true }
}

export function serializeJson(data: any): string {
  return JSON.stringify(data)
}

export function deserializeJson<T = any>(str: string | null | undefined): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}
