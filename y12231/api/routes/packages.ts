import { Router, type Request, type Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status, memberId, name, startDate, endDate, page = '1', pageSize = '20' } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (status) { where += ' AND pk.status = ?'; params.push(status) }
  if (memberId) { where += ' AND pk.member_id = ?'; params.push(memberId) }
  if (name) { where += ' AND pk.name LIKE ?'; params.push(`%${name}%`) }
  if (startDate) { where += ' AND pk.created_at >= ?'; params.push(startDate) }
  if (endDate) { where += ' AND pk.created_at <= ?'; params.push(endDate) }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM packages pk ${where}`).get(...params) as any
  const packages = db.prepare(
    `SELECT pk.*, m.name as member_name FROM packages pk LEFT JOIN member_accounts m ON pk.member_id = m.id ${where} ORDER BY pk.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset)

  res.json({
    success: true,
    data: { list: packages, total: total.cnt, page: Number(page), pageSize: Number(pageSize) },
  })
})

router.get('/stats', (req: Request, res: Response): void => {
  const { startDate, endDate, memberStatus, packageStatus } = req.query

  let memberFilter = ''
  const memberParams: any[] = []
  if (memberStatus) {
    memberFilter = ' AND m.status = ?'
    memberParams.push(memberStatus)
  }

  const memberIds = db.prepare(`SELECT id FROM member_accounts m WHERE 1=1${memberFilter}`).all(...memberParams).map((m: any) => m.id)
  const memberIdList = memberIds.length > 0 ? memberIds.map(() => '?').join(',') : "'__none__'"

  let dateFilter = ''
  const dateParams: any[] = []
  if (startDate) { dateFilter += ' AND pk.created_at >= ?'; dateParams.push(startDate) }
  if (endDate) { dateFilter += ' AND pk.created_at <= ?'; dateParams.push(endDate) }

  let pkgFilter = ''
  const pkgParams: any[] = []
  if (packageStatus) { pkgFilter += ' AND pk.status = ?'; pkgParams.push(packageStatus) }

  const byStatus = db.prepare(
    `SELECT pk.status, COUNT(*) as count, COALESCE(SUM(pk.price), 0) as total_price, COALESCE(SUM(pk.used_deductions), 0) as total_used, COALESCE(SUM(pk.remaining_deductions), 0) as total_remaining FROM packages pk WHERE pk.member_id IN (${memberIdList})${pkgFilter}${dateFilter} GROUP BY pk.status`
  ).all(...memberIds, ...pkgParams, ...dateParams)

  const byName = db.prepare(
    `SELECT pk.name, COUNT(*) as count, COALESCE(SUM(pk.price), 0) as total_price FROM packages pk WHERE pk.member_id IN (${memberIdList})${pkgFilter}${dateFilter} GROUP BY pk.name`
  ).all(...memberIds, ...pkgParams, ...dateParams)

  const byMonth = db.prepare(
    `SELECT substr(pk.created_at, 1, 7) as month, COUNT(*) as count, COALESCE(SUM(pk.price), 0) as total_price FROM packages pk WHERE pk.member_id IN (${memberIdList})${pkgFilter}${dateFilter} GROUP BY substr(pk.created_at, 1, 7) ORDER BY month`
  ).all(...memberIds, ...pkgParams, ...dateParams)

  const utilizationRate = db.prepare(
    `SELECT pk.name, pk.total_deductions, pk.used_deductions, CASE WHEN pk.total_deductions > 0 THEN ROUND(CAST(pk.used_deductions AS REAL) / pk.total_deductions * 100, 2) ELSE 0 END as rate FROM packages pk WHERE pk.member_id IN (${memberIdList})${pkgFilter}${dateFilter}`
  ).all(...memberIds, ...pkgParams, ...dateParams)

  res.json({
    success: true,
    data: { byStatus, byName, byMonth, utilizationRate },
  })
})

export default router
