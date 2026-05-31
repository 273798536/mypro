import express from 'express'
import db from '../db.js'
import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { calculateMonthlyDeferral } from '../services/deferralEngine.js'
import dayjs from 'dayjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const exportsDir = path.join(__dirname, '../exports')

if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true })
}

const router = express.Router()

router.get('/', (req, res) => {
  const { page = 1, pageSize = 20 } = req.query
  const offset = (page - 1) * pageSize

  const reports = db.prepare(`
    SELECT r.*, rv.version as rule_version
    FROM report_exports r
    LEFT JOIN rule_versions rv ON r.rule_version_id = rv.id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(parseInt(pageSize), offset)

  const total = db.prepare('SELECT COUNT(*) as count FROM report_exports').get()

  res.json({
    data: reports,
    total: total.count,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  })
})

router.post('/export', async (req, res) => {
  const { reportMonth, reportType = 'deferral', ruleVersionId = 1, exportedBy = 'admin' } = req.body

  const contracts = db.prepare('SELECT * FROM membership_contracts WHERE status = ?').all('active')
  
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(`递延报表-${reportMonth}`)

  worksheet.columns = [
    { header: '合同编号', key: 'contractNo', width: 15 },
    { header: '会员姓名', key: 'memberName', width: 12 },
    { header: '会员类型', key: 'membershipType', width: 12 },
    { header: '合同开始', key: 'startDate', width: 12 },
    { header: '合同结束', key: 'endDate', width: 12 },
    { header: '合同总额', key: 'totalAmount', width: 12 },
    { header: '月均费用', key: 'monthlyFee', width: 12 },
    { header: '本月确认收入', key: 'recognizedAmount', width: 15 },
    { header: '本月递延金额', key: 'deferredAmount', width: 15 },
    { header: '计算逻辑', key: 'calculationLogic', width: 40 },
    { header: '影响因素', key: 'affectedBy', width: 20 },
    { header: '是否人工修正', key: 'isCorrected', width: 12 },
    { header: '备注', key: 'remark', width: 20 }
  ]

  let totalDeferred = 0
  let totalRecognized = 0

  contracts.forEach(contract => {
    const calc = calculateMonthlyDeferral(contract, reportMonth)
    
    worksheet.addRow({
      contractNo: contract.contract_no,
      memberName: contract.member_name,
      membershipType: contract.membership_type,
      startDate: contract.start_date,
      endDate: contract.end_date,
      totalAmount: contract.total_amount,
      monthlyFee: contract.monthly_fee,
      recognizedAmount: calc.recognized,
      deferredAmount: calc.deferred,
      calculationLogic: calc.logic,
      affectedBy: calc.affectedBy.map(a => a.type).join(','),
      isCorrected: '否',
      remark: contract.remark || ''
    })

    totalDeferred += calc.deferred
    totalRecognized += calc.recognized
  })

  worksheet.addRow({
    contractNo: '合计',
    recognizedAmount: totalRecognized,
    deferredAmount: totalDeferred
  })

  const fileName = `deferral-report-${reportMonth}-${Date.now()}.xlsx`
  const filePath = path.join(exportsDir, fileName)
  
  await workbook.xlsx.writeFile(filePath)

  db.prepare(`
    INSERT INTO report_exports
    (report_month, report_type, rule_version_id, file_path, total_records,
     total_deferred_amount, total_recognized_amount, exported_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reportMonth, reportType, ruleVersionId, filePath,
    contracts.length, totalDeferred, totalRecognized, exportedBy
  )

  res.json({
    success: true,
    fileName,
    totalRecords: contracts.length,
    totalDeferred,
    totalRecognized
  })
})

router.get('/download/:id', async (req, res) => {
  const report = db.prepare('SELECT * FROM report_exports WHERE id = ?').get(req.params.id)
  
  if (!report || !report.file_path) {
    return res.status(404).json({ error: '报表不存在' })
  }

  if (!fs.existsSync(report.file_path)) {
    return res.status(404).json({ error: '文件已被删除' })
  }

  res.download(report.file_path, path.basename(report.file_path))
})

router.get('/compare', (req, res) => {
  const { reportId1, reportId2 } = req.query

  const report1 = db.prepare('SELECT * FROM report_exports WHERE id = ?').get(reportId1)
  const report2 = db.prepare('SELECT * FROM report_exports WHERE id = ?').get(reportId2)

  if (!report1 || !report2) {
    return res.status(404).json({ error: '报表不存在' })
  }

  res.json({
    report1: {
      ...report1,
      ruleVersion: db.prepare('SELECT * FROM rule_versions WHERE id = ?').get(report1.rule_version_id)
    },
    report2: {
      ...report2,
      ruleVersion: db.prepare('SELECT * FROM rule_versions WHERE id = ?').get(report2.rule_version_id)
    },
    difference: {
      totalDeferred: report1.total_deferred_amount - report2.total_deferred_amount,
      totalRecognized: report1.total_recognized_amount - report2.total_recognized_amount
    }
  })
})

export default router
