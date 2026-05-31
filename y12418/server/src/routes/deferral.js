import express from 'express'
import db from '../db.js'
import { calculateMonthlyDeferral, analyzeDiscrepancy, generateCalculationHash } from '../services/deferralEngine.js'
import dayjs from 'dayjs'

const router = express.Router()

router.get('/calculations', (req, res) => {
  const { contractId, month, page = 1, pageSize = 20 } = req.query
  const offset = (page - 1) * pageSize

  let whereClause = '1=1'
  const params = []

  if (contractId) {
    whereClause += ' AND d.contract_id = ?'
    params.push(contractId)
  }
  if (month) {
    whereClause += ' AND d.calculation_month = ?'
    params.push(month)
  }

  const calculations = db.prepare(`
    SELECT d.*, c.contract_no, c.member_name, c.membership_type,
      r.version as rule_version, r.rule_name
    FROM deferral_calculations d
    LEFT JOIN membership_contracts c ON d.contract_id = c.id
    LEFT JOIN rule_versions r ON d.rule_version_id = r.id
    WHERE ${whereClause}
    ORDER BY d.calculation_month DESC, d.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset)

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM deferral_calculations d
    WHERE ${whereClause}
  `).get(...params)

  res.json({
    data: calculations,
    total: total.count,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  })
})

router.post('/calculate', (req, res) => {
  const { contractId, month, ruleVersionId = 1, options = {} } = req.body

  const contract = db.prepare('SELECT * FROM membership_contracts WHERE id = ?').get(contractId)
  if (!contract) {
    return res.status(404).json({ error: '合同不存在' })
  }

  const result = calculateMonthlyDeferral(contract, month, options)
  const hash = generateCalculationHash(contractId, month, ruleVersionId, options)

  const existing = db.prepare(`
    SELECT * FROM deferral_calculations 
    WHERE contract_id = ? AND calculation_month = ? AND calculation_hash = ?
  `).get(contractId, month, hash)

  if (!existing) {
    const affectedTypes = result.affectedBy.map(a => a.type).join(',')
    db.prepare(`
      INSERT INTO deferral_calculations 
      (contract_id, calculation_month, rule_version_id, deferred_amount, recognized_amount, calculation_logic, affected_by, calculation_hash, has_withdrawn_makeup)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contractId, month, ruleVersionId, result.deferred, result.recognized, 
      result.logic, affectedTypes, hash, result.hasWithdrawnMakeup ? 1 : 0
    )
  }

  res.json({
    ...result,
    contract,
    calculationHash: hash
  })
})

router.get('/discrepancy/:contractId/:month', (req, res) => {
  const { contractId, month } = req.params

  const contract = db.prepare('SELECT * FROM membership_contracts WHERE id = ?').get(contractId)
  if (!contract) {
    return res.status(404).json({ error: '合同不存在' })
  }

  const analysis = analyzeDiscrepancy(contract, month)

  if (analysis) {
    const existingAnalysis = db.prepare(`
      SELECT * FROM discrepancy_analysis 
      WHERE contract_id = ? AND analysis_month = ?
    `).get(contractId, month)

    if (!existingAnalysis) {
      db.prepare(`
        INSERT INTO discrepancy_analysis
        (contract_id, analysis_month, contract_amount, deferred_amount, difference_amount, 
        cause_type, cause_description, related_record_type, related_record_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        contractId, month, analysis.contractAmount, analysis.deferredAmount, 
        analysis.differenceAmount,
        analysis.primaryCause.type, analysis.primaryCause.description,
        analysis.primaryCause.type, analysis.primaryCause.recordId || null
      )
    }
  }

  res.json(analysis || { hasDiscrepancy: false })
})

router.post('/:id/correct', (req, res) => {
  const { id } = req.params
  const { newDeferredAmount, newRecognizedAmount, correctionReason, correctedBy = 'admin' } = req.body

  const oldCalc = db.prepare('SELECT * FROM deferral_calculations WHERE id = ?').get(id)
  if (!oldCalc) {
    return res.status(404).json({ error: '计算记录不存在' })
  }

  db.prepare(`
    INSERT INTO correction_history
    (deferral_calc_id, old_deferred_amount, new_deferred_amount,
    old_recognized_amount, new_recognized_amount,
    old_rule_version_id, new_rule_version_id,
    correction_reason, corrected_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, oldCalc.deferred_amount, newDeferredAmount,
    oldCalc.recognized_amount, newRecognizedAmount,
    oldCalc.rule_version_id, oldCalc.rule_version_id,
    correctionReason, correctedBy
  )

  db.prepare(`
    UPDATE deferral_calculations
    SET deferred_amount = ?, recognized_amount = ?, 
        is_manual_corrected = 1, correction_remark = ?
    WHERE id = ?
  `).run(newDeferredAmount, newRecognizedAmount, correctionReason, id)

  res.json({ success: true })
})

router.get('/:id/history', (req, res) => {
  const history = db.prepare(`
    SELECT h.*, r.version as rule_version
    FROM correction_history h
    LEFT JOIN rule_versions r ON h.new_rule_version_id = r.id
    WHERE h.deferral_calc_id = ?
    ORDER BY h.created_at DESC
  `).all(req.params.id)

  res.json(history)
})

router.get('/overview/:contractId', (req, res) => {
  const { contractId } = req.params
  const { startMonth, endMonth } = req.query

  const contract = db.prepare('SELECT * FROM membership_contracts WHERE id = ?').get(contractId)
  if (!contract) {
    return res.status(404).json({ error: '合同不存在' })
  }

  const start = dayjs(startMonth || contract.start_date).startOf('month')
  const end = dayjs(endMonth || contract.end_date).endOf('month')

  const months = []
  let current = start.clone()

  while (current.isBefore(end) || current.isSame(end, 'month')) {
    const monthStr = current.format('YYYY-MM')
    const calc = calculateMonthlyDeferral(contract, monthStr)
    const discrepancy = analyzeDiscrepancy(contract, monthStr)

    months.push({
      month: monthStr,
      ...calc,
      discrepancy
    })

    current = current.add(1, 'month')
  }

  res.json({
    contract,
    months
  })
})

export default router
