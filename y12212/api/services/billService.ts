import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database/init.js'
import type { Bill, BillDetail, BillException, UserProfile, BillStatus, AllocationMethod } from '../../shared/types.js'
import { calculateTierAmount } from './tierPricing.js'
import { allocate, validateAllocation } from './combinedAllocation.js'
import { detectAllExceptions } from './exceptionDetection.js'

interface BillFilters {
  billing_month?: string
  user_no?: string
  status?: BillStatus
  user_type?: string
  combined_group_id?: string
}

export function generateBills(billingMonth: string, importTaskId: string | null = null): Bill[] {
  const db = getDb()
  const now = new Date().toISOString()
  const generatedBills: Bill[] = []

  const paymentRecords = db.prepare(
    'SELECT * FROM payment_record WHERE billing_month = ?'
  ).all(billingMonth) as Array<{
    id: string; user_no: string; billing_month: string;
    last_reading: number; current_reading: number; usage: number; paid_amount: number;
  }>

  const processedGroups = new Set<string>()

  const transaction = db.transaction(() => {
    for (const record of paymentRecords) {
      const userProfile = db.prepare(
        'SELECT * FROM user_profile WHERE user_no = ?'
      ).get(record.user_no) as UserProfile | undefined

      if (!userProfile) continue

      if (userProfile.user_category === 'combined' && userProfile.combined_group_id) {
        if (processedGroups.has(userProfile.combined_group_id)) continue
        processedGroups.add(userProfile.combined_group_id)

        const groupMembers = db.prepare(
          'SELECT * FROM user_profile WHERE combined_group_id = ?'
        ).all(userProfile.combined_group_id) as UserProfile[]

        const method: AllocationMethod = 'population'
        const allocations = allocate(userProfile.combined_group_id, record.usage, method)

        const groupBills: Bill[] = []

        for (const alloc of allocations) {
          const member = groupMembers.find(m => m.user_no === alloc.user_no)
          if (!member) continue

          const tierResult = calculateTierAmount(member.user_type, alloc.allocated_usage)
          let calculatedAmount = tierResult.total_amount

          if (member.discount_rate && member.discount_expire_date && member.discount_expire_date >= billingMonth + '-01') {
            calculatedAmount = Math.round(calculatedAmount * (1 - member.discount_rate) * 100) / 100
          }

          const billId = uuidv4()
          const bill: Bill = {
            id: billId,
            user_no: member.user_no,
            billing_month: billingMonth,
            user_type: member.user_type,
            user_category: member.user_category,
            total_usage: alloc.allocated_usage,
            calculated_amount: calculatedAmount,
            status: 'pending',
            combined_group_id: userProfile.combined_group_id,
            allocation_method: method,
            review_comments: null,
            reviewed_by: null,
            reviewed_at: null,
            import_task_id: importTaskId,
            created_at: now,
            updated_at: now,
          }

          db.prepare(
            `INSERT INTO bill (id, user_no, billing_month, user_type, user_category, total_usage, calculated_amount, status, combined_group_id, allocation_method, review_comments, reviewed_by, reviewed_at, import_task_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(billId, bill.user_no, bill.billing_month, bill.user_type, bill.user_category, bill.total_usage, bill.calculated_amount, bill.status, bill.combined_group_id, bill.allocation_method, bill.review_comments, bill.reviewed_by, bill.reviewed_at, bill.import_task_id, bill.created_at, bill.updated_at)

          for (const bd of tierResult.breakdown) {
            db.prepare(
              'INSERT INTO bill_detail (id, bill_id, tier, usage, price_per_ton, amount) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(uuidv4(), billId, bd.tier, bd.usage, bd.price_per_ton, bd.amount)
          }

          groupBills.push(bill)
          generatedBills.push(bill)
        }

        for (const bill of groupBills) {
          const member = db.prepare('SELECT * FROM user_profile WHERE user_no = ?').get(bill.user_no) as UserProfile
          const exceptions = detectAllExceptions(bill, member, groupBills)
          for (const ex of exceptions) {
            db.prepare(
              `INSERT INTO bill_exception (id, bill_id, type, severity, description, human_readable, resolved, resolution, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), bill.id, ex.type, ex.severity, ex.description, ex.human_readable, 0, null, now)

            db.prepare('UPDATE bill SET status = ? WHERE id = ?').run('exception', bill.id)
            bill.status = 'exception'
          }
        }

      } else {
        const tierResult = calculateTierAmount(userProfile.user_type, record.usage)
        let calculatedAmount = tierResult.total_amount

        if (userProfile.discount_rate && userProfile.discount_expire_date && userProfile.discount_expire_date >= billingMonth + '-01') {
          calculatedAmount = Math.round(calculatedAmount * (1 - userProfile.discount_rate) * 100) / 100
        }

        const billId = uuidv4()
        const bill: Bill = {
          id: billId,
          user_no: userProfile.user_no,
          billing_month: billingMonth,
          user_type: userProfile.user_type,
          user_category: userProfile.user_category,
          total_usage: record.usage,
          calculated_amount: calculatedAmount,
          status: 'pending',
          combined_group_id: null,
          allocation_method: null,
          review_comments: null,
          reviewed_by: null,
          reviewed_at: null,
          import_task_id: importTaskId,
          created_at: now,
          updated_at: now,
        }

        db.prepare(
          `INSERT INTO bill (id, user_no, billing_month, user_type, user_category, total_usage, calculated_amount, status, combined_group_id, allocation_method, review_comments, reviewed_by, reviewed_at, import_task_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(billId, bill.user_no, bill.billing_month, bill.user_type, bill.user_category, bill.total_usage, bill.calculated_amount, bill.status, bill.combined_group_id, bill.allocation_method, bill.review_comments, bill.reviewed_by, bill.reviewed_at, bill.import_task_id, bill.created_at, bill.updated_at)

        for (const bd of tierResult.breakdown) {
          db.prepare(
            'INSERT INTO bill_detail (id, bill_id, tier, usage, price_per_ton, amount) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(uuidv4(), billId, bd.tier, bd.usage, bd.price_per_ton, bd.amount)
        }

        const exceptions = detectAllExceptions(bill, userProfile)
        for (const ex of exceptions) {
          db.prepare(
            `INSERT INTO bill_exception (id, bill_id, type, severity, description, human_readable, resolved, resolution, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(uuidv4(), billId, ex.type, ex.severity, ex.description, ex.human_readable, 0, null, now)

          db.prepare('UPDATE bill SET status = ? WHERE id = ?').run('exception', billId)
          bill.status = 'exception'
        }

        generatedBills.push(bill)
      }
    }
  })

  transaction()
  return generatedBills
}

export function getBills(filters: BillFilters = {}): Bill[] {
  const db = getDb()
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.billing_month) {
    conditions.push('billing_month = ?')
    params.push(filters.billing_month)
  }
  if (filters.user_no) {
    conditions.push('user_no = ?')
    params.push(filters.user_no)
  }
  if (filters.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.user_type) {
    conditions.push('user_type = ?')
    params.push(filters.user_type)
  }
  if (filters.combined_group_id) {
    conditions.push('combined_group_id = ?')
    params.push(filters.combined_group_id)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return db.prepare(`SELECT * FROM bill ${where} ORDER BY created_at DESC`).all(...params) as Bill[]
}

export function getBillById(id: string): (Bill & { details: BillDetail[]; exceptions: BillException[] }) | null {
  const db = getDb()
  const bill = db.prepare('SELECT * FROM bill WHERE id = ?').get(id) as Bill | undefined
  if (!bill) return null

  const details = db.prepare('SELECT * FROM bill_detail WHERE bill_id = ?').all(id) as BillDetail[]
  const exceptions = db.prepare('SELECT * FROM bill_exception WHERE bill_id = ?').all(id) as BillException[]

  return { ...bill, details, exceptions }
}

export function updateBillStatus(
  id: string,
  status: BillStatus,
  reviewedBy: string,
  comments: string | null = null
): Bill | null {
  const db = getDb()
  const now = new Date().toISOString()

  const result = db.prepare(
    'UPDATE bill SET status = ?, reviewed_by = ?, reviewed_at = ?, review_comments = ?, updated_at = ? WHERE id = ?'
  ).run(status, reviewedBy, now, comments, now, id)

  if (result.changes === 0) return null

  return db.prepare('SELECT * FROM bill WHERE id = ?').get(id) as Bill
}

export function recalculateBill(id: string): Bill | null {
  const db = getDb()
  const bill = db.prepare('SELECT * FROM bill WHERE id = ?').get(id) as Bill | undefined
  if (!bill) return null

  const userProfile = db.prepare('SELECT * FROM user_profile WHERE user_no = ?').get(bill.user_no) as UserProfile
  if (!userProfile) return null

  const tierResult = calculateTierAmount(userProfile.user_type, bill.total_usage)
  let calculatedAmount = tierResult.total_amount

  if (userProfile.discount_rate && userProfile.discount_expire_date && userProfile.discount_expire_date >= bill.billing_month + '-01') {
    calculatedAmount = Math.round(calculatedAmount * (1 - userProfile.discount_rate) * 100) / 100
  }

  const now = new Date().toISOString()

  const transaction = db.transaction(() => {
    db.prepare(
      'UPDATE bill SET calculated_amount = ?, updated_at = ? WHERE id = ?'
    ).run(calculatedAmount, now, id)

    db.prepare('DELETE FROM bill_detail WHERE bill_id = ?').run(id)

    for (const bd of tierResult.breakdown) {
      db.prepare(
        'INSERT INTO bill_detail (id, bill_id, tier, usage, price_per_ton, amount) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(uuidv4(), id, bd.tier, bd.usage, bd.price_per_ton, bd.amount)
    }

    db.prepare('DELETE FROM bill_exception WHERE bill_id = ?').run(id)

    const exceptions = detectAllExceptions(bill, userProfile)
    for (const ex of exceptions) {
      db.prepare(
        `INSERT INTO bill_exception (id, bill_id, type, severity, description, human_readable, resolved, resolution, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), id, ex.type, ex.severity, ex.description, ex.human_readable, 0, null, now)
    }
  })

  transaction()
  return db.prepare('SELECT * FROM bill WHERE id = ?').get(id) as Bill
}
