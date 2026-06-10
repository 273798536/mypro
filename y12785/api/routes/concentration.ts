import { Router, type Request, type Response } from 'express'
import db, { logOperation } from '../db.js'

const router = Router({ mergeParams: true })

const PRECISION_TO_DIGITS: Record<string, number> = {
  '0.01mg': 4,
  '0.1mg': 3,
  '1mg': 2,
}

const PRECISION_VALUE: Record<string, number> = {
  '0.01mg': 0.01,
  '0.1mg': 0.1,
  '1mg': 1,
}

router.post('/', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { sample_weight, dilution_factor, weight_unit, operator } = req.body

  if (sample_weight == null) {
    res.status(400).json({
      code: 'MISSING_FIELD',
      message: '缺少必填字段',
      actionableHint: '请提供 sample_weight 字段',
      missingData: ['sample_weight'],
    })
    return
  }

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as any
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const weighingPrecision = batch.weighing_precision || '0.1mg'
  const significantDigits = PRECISION_TO_DIGITS[weighingPrecision] || 3
  const precisionValue = PRECISION_VALUE[weighingPrecision] || 0.1
  const dilutionFactor = dilution_factor || 1

  const concentration = (sample_weight / dilutionFactor) * 1000
  const roundedConcentration = Number(concentration.toFixed(significantDigits))
  const uncertainty = (precisionValue / sample_weight) * concentration
  const roundedUncertainty = Number(uncertainty.toFixed(significantDigits))

  const existing = db.prepare('SELECT id FROM concentration_results WHERE batch_id = ?').get(batchId)
  if (existing) {
    db.prepare(
      `UPDATE concentration_results SET sample_weight = ?, weight_unit = ?, dilution_factor = ?,
       concentration = ?, significant_digits = ?, uncertainty = ?, weighing_precision = ?
       WHERE batch_id = ?`
    ).run(sample_weight, weight_unit || 'mg', dilutionFactor, roundedConcentration, significantDigits, roundedUncertainty, weighingPrecision, batchId)
  } else {
    const id = crypto.randomUUID()
    db.prepare(
      `INSERT INTO concentration_results (id, batch_id, sample_weight, weight_unit, dilution_factor,
       concentration, significant_digits, uncertainty, weighing_precision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, batchId, sample_weight, weight_unit || 'mg', dilutionFactor, roundedConcentration, significantDigits, roundedUncertainty, weighingPrecision)
  }

  logOperation(batchId, 'CALC_CONCENTRATION', operator || 'system', `浓度计算: ${roundedConcentration} μg/mL, 不确定度: ${roundedUncertainty}`)

  const result = db.prepare('SELECT * FROM concentration_results WHERE batch_id = ?').get(batchId)
  res.status(201).json({ success: true, data: result })
})

router.get('/', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const result = db.prepare('SELECT * FROM concentration_results WHERE batch_id = ?').get(batchId)
  if (!result) {
    res.status(404).json({
      code: 'NO_CONCENTRATION',
      message: '该批次尚未计算浓度',
      actionableHint: '请先执行浓度计算',
    })
    return
  }

  res.json({ success: true, data: result })
})

export default router
