import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { startDate, endDate, memberStatus, packageStatus, exceptionStatus } = req.query

  let memberFilter = ''
  const memberParams: any[] = []
  if (memberStatus) {
    memberFilter = ' AND status = ?'
    memberParams.push(memberStatus)
  }

  const memberIds = db.prepare(`SELECT id FROM member_accounts WHERE 1=1${memberFilter}`).all(...memberParams).map((m: any) => m.id)
  const memberIdList = memberIds.length > 0 ? memberIds.map(() => '?').join(',') : "'__none__'"

  let dateFilter = ''
  const dateParams: any[] = []
  if (startDate) {
    dateFilter += ' AND created_at >= ?'
    dateParams.push(startDate)
  }
  if (endDate) {
    dateFilter += ' AND created_at <= ?'
    dateParams.push(endDate)
  }

  let pkgFilter = ''
  const pkgParams: any[] = []
  if (packageStatus) {
    pkgFilter += ' AND status = ?'
    pkgParams.push(packageStatus)
  }

  let excFilter = ''
  const excParams: any[] = []
  if (exceptionStatus) {
    excFilter += ' AND status = ?'
    excParams.push(exceptionStatus)
  }

  const totalBalance = db.prepare(
    `SELECT COALESCE(SUM(balance), 0) as total FROM member_accounts WHERE id IN (${memberIdList})${memberFilter}`
  ).get(...memberIds, ...memberParams) as any

  const monthlyConsumption = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'consumption' AND member_id IN (${memberIdList})${dateFilter}`
  ).get(...memberIds, ...dateParams) as any

  const pendingOwnership = db.prepare(
    `SELECT COUNT(*) as cnt FROM ownership_changes WHERE status = 'pending'`
  ).get() as any

  const pendingExceptions = db.prepare(
    `SELECT COUNT(*) as cnt FROM exception_items WHERE status = 'pending'${excFilter}`
  ).get(...excParams) as any

  const exceptionCount = db.prepare(
    `SELECT COUNT(*) as cnt FROM exception_items WHERE 1=1${excFilter}`
  ).get(...excParams) as any

  const packageStats = db.prepare(
    `SELECT status, COUNT(*) as count, COALESCE(SUM(price), 0) as total_price FROM packages WHERE member_id IN (${memberIdList})${pkgFilter}${dateFilter} GROUP BY status`
  ).all(...memberIds, ...pkgParams, ...dateParams)

  const packageByMonth = db.prepare(
    `SELECT substr(created_at, 1, 7) as month, COUNT(*) as count, COALESCE(SUM(price), 0) as total_price FROM packages WHERE member_id IN (${memberIdList})${pkgFilter}${dateFilter} GROUP BY substr(created_at, 1, 7) ORDER BY month`
  ).all(...memberIds, ...pkgParams, ...dateParams)

  const recentTransactions = db.prepare(
    `SELECT t.*, m.name as member_name, p.name as pet_name FROM transactions t LEFT JOIN member_accounts m ON t.member_id = m.id LEFT JOIN pet_profiles p ON t.pet_id = p.id WHERE t.member_id IN (${memberIdList})${dateFilter} ORDER BY t.created_at DESC LIMIT 10`
  ).all(...memberIds, ...dateParams)

  res.json({
    success: true,
    data: {
      totalBalance: totalBalance.total,
      monthlyConsumption: monthlyConsumption.total,
      pendingCount: pendingOwnership.cnt + pendingExceptions.cnt,
      exceptionCount: exceptionCount.cnt,
      packageStats: {
        byStatus: packageStats,
        byMonth: packageByMonth,
      },
      recentTransactions,
    },
  })
})

export default router
