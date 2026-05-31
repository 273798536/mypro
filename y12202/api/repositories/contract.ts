import db from '../db.js'
import crypto from 'crypto'

export interface Contract {
  id: string
  contract_no: string
  borrower_name: string
  borrower_id: string
  amount: number
  term: string
  start_date: string
  end_date: string
  rate: number
  status: string
  created_at: string
  created_by: string
}

export interface Guarantee {
  id: string
  contract_id: string
  guarantor_name: string
  guarantor_id: string
  guarantee_type: string
  guarantee_amount: number
  start_date: string
  end_date: string
  is_expired: number
  source_person: string
  created_at: string
}

export interface RepaymentRecord {
  id: string
  contract_id: string
  period: number
  due_date: string
  actual_date: string | null
  amount: number
  principal: number
  interest: number
  status: string
  is_extension_node: number
}

export function getContracts(): Contract[] {
  return db.prepare('SELECT * FROM contracts ORDER BY created_at DESC').all() as Contract[]
}

export function getContractById(id: string): Contract | undefined {
  return db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Contract | undefined
}

export function createContract(data: Omit<Contract, 'id' | 'created_at'>): Contract {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO contracts (id, contract_no, borrower_name, borrower_id, amount, term, start_date, end_date, rate, status, created_by)
    VALUES (@id, @contract_no, @borrower_name, @borrower_id, @amount, @term, @start_date, @end_date, @rate, @status, @created_by)
  `).run({ id, ...data })
  return getContractById(id)!
}

export function getGuaranteesByContractId(contractId: string): Guarantee[] {
  return db.prepare('SELECT * FROM guarantees WHERE contract_id = ?').all(contractId) as Guarantee[]
}

export function createGuarantee(data: Omit<Guarantee, 'id' | 'created_at'>): Guarantee {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO guarantees (id, contract_id, guarantor_name, guarantor_id, guarantee_type, guarantee_amount, start_date, end_date, is_expired, source_person)
    VALUES (@id, @contract_id, @guarantor_name, @guarantor_id, @guarantee_type, @guarantee_amount, @start_date, @end_date, @is_expired, @source_person)
  `).run({ id, ...data })
  return db.prepare('SELECT * FROM guarantees WHERE id = ?').get(id) as Guarantee
}

export function getRepaymentRecordsByContractId(contractId: string): RepaymentRecord[] {
  return db.prepare('SELECT * FROM repayment_records WHERE contract_id = ? ORDER BY period').all(contractId) as RepaymentRecord[]
}

export function createRepaymentRecord(data: Omit<RepaymentRecord, 'id'>): RepaymentRecord {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO repayment_records (id, contract_id, period, due_date, actual_date, amount, principal, interest, status, is_extension_node)
    VALUES (@id, @contract_id, @period, @due_date, @actual_date, @amount, @principal, @interest, @status, @is_extension_node)
  `).run({ id, ...data })
  return db.prepare('SELECT * FROM repayment_records WHERE id = ?').get(id) as RepaymentRecord
}
