import { v4 as uuidv4 } from 'uuid'
import { db } from './database.js'
import { createTraceLog, saveTraceLog } from '../services/errorService.js'
import { detectPeaks } from '../services/peakService.js'
import { calculateBalance } from '../services/balanceService.js'
import type { WeighingRow, Peak, OverlapRegion } from '../types/index.js'

function generateTemperatureCurve(
  baseTemp: number,
  peakCount: number,
  noise: number,
): number[][] {
  const curve: number[][] = []
  for (let t = 0; t < 300; t++) {
    let temp = baseTemp + Math.sin(t * 0.02) * 0.5
    for (let p = 0; p < peakCount; p++) {
      const peakCenter = 60 + p * 70
      const peakWidth = 20
      const peakHeight = 5 + p * 2
      temp += peakHeight * Math.exp(-((t - peakCenter) ** 2) / (2 * peakWidth * peakWidth))
    }
    temp += (Math.random() - 0.5) * noise
    curve.push([t, Number(temp.toFixed(2))])
  }
  return curve
}

function insertMaterials(): void {
  const materials = [
    { batch_no: 'BATCH-20240601-001', name: '盐酸 HCl', standard_conc: 1.0, standard_purity: 37.0, supplier: '国药集团' },
    { batch_no: 'BATCH-20240601-002', name: '氢氧化钠 NaOH', standard_conc: 1.0, standard_purity: 96.0, supplier: '阿拉丁' },
    { batch_no: 'BATCH-20240601-003', name: '硫酸 H2SO4', standard_conc: 0.5, standard_purity: 98.0, supplier: '国药集团' },
    { batch_no: 'BATCH-20240602-001', name: '氯化钠 NaCl', standard_conc: 2.0, standard_purity: 99.5, supplier: '麦克林' },
  ]

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO materials (batch_no, name, standard_conc, standard_purity, supplier)
    VALUES (?, ?, ?, ?, ?)
  `)
  materials.forEach((m) => stmt.run(m.batch_no, m.name, m.standard_conc, m.standard_purity, m.supplier))
}

function insertRecord(
  recordId: string,
  batchNo: string,
  operator: string,
  filename: string,
  status: 'success' | 'pending' | 'bad',
  rows: WeighingRow[],
): void {
  const insertRecordStmt = db.prepare(`
    INSERT INTO weighing_records (id, batch_no, operator, filename, status, imported_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertRecordStmt.run(recordId, batchNo, operator, filename, status, new Date().toISOString())

  const insertRowStmt = db.prepare(`
    INSERT INTO weighing_rows (record_id, row_index, reagent_name, batch_no, concentration, weight, purity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  rows.forEach((row) =>
    insertRowStmt.run(
      recordId,
      row.rowIndex,
      row.reagentName,
      row.batchNo,
      row.concentration,
      row.weight,
      row.purity,
    ),
  )
}

function seedSuccessRecord(): void {
  const recordId = 'rec-success-001'
  const rows: WeighingRow[] = [
    { rowIndex: 0, reagentName: '盐酸 HCl', batchNo: 'BATCH-20240601-001', concentration: 1.0, weight: 36.5, purity: 37.0 },
    { rowIndex: 1, reagentName: '氢氧化钠 NaOH', batchNo: 'BATCH-20240601-002', concentration: 1.0, weight: 40.0, purity: 96.0 },
  ]

  insertRecord(recordId, 'BATCH-20240601-SUCCESS', '张三', 'weighing_success.csv', 'success', rows)

  const curve = generateTemperatureCurve(25, 3, 0.2)
  const { peaks, overlaps, warnings } = detectPeaks(curve)

  const analysisId = 'analysis-success-001'
  const insertAnalysisStmt = db.prepare(`
    INSERT INTO peak_analysis (id, record_id, peaks_json, overlaps_json, warnings_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertAnalysisStmt.run(
    analysisId,
    recordId,
    JSON.stringify(peaks),
    JSON.stringify(overlaps),
    JSON.stringify(warnings),
    new Date().toISOString(),
  )

  const balanceResult = calculateBalance(
    recordId,
    [{ formula: 'HCl' }, { formula: 'NaOH' }],
    [{ formula: 'NaCl' }, { formula: 'H2O' }],
    rows,
  )

  const insertBalanceStmt = db.prepare(`
    INSERT INTO balance_calc (id, record_id, equation, enthalpy_change, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertBalanceStmt.run(
    balanceResult.calcId,
    recordId,
    balanceResult.balancedEquation,
    balanceResult.enthalpyChange,
    balanceResult.status,
    new Date().toISOString(),
  )

  const insertTraceStmt = db.prepare(`
    INSERT INTO material_trace (calc_id, row_id, reagent_name, expected_conc, actual_conc, delta_desc)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  balanceResult.materialTrace.forEach((item, idx) => {
    insertTraceStmt.run(
      balanceResult.calcId,
      idx + 1,
      item.reagentName,
      item.concentration,
      item.concentration,
      item.delta,
    )
  })
}

function seedPendingRecord(): void {
  const recordId = 'rec-pending-001'
  const rows: WeighingRow[] = [
    { rowIndex: 0, reagentName: '硫酸 H2SO4', batchNo: 'BATCH-20240601-003', concentration: 0.5, weight: 49.0, purity: 98.0 },
    { rowIndex: 1, reagentName: '氢氧化钠 NaOH', batchNo: 'BATCH-20240601-002', concentration: 1.0, weight: 40.0, purity: 96.0 },
  ]

  insertRecord(recordId, 'BATCH-20240601-PENDING', '李四', 'weighing_pending.csv', 'pending', rows)

  const curve = generateTemperatureCurve(25, 4, 0.8)
  const { peaks, overlaps, warnings } = detectPeaks(curve)
  overlaps.push({
    id: uuidv4(),
    startTime: 120,
    endTime: 140,
    peakCount: 2,
    confidence: 0.85,
  })
  warnings.push('检测到 1 处重叠峰，建议人工复核')

  const analysisId = 'analysis-pending-001'
  const insertAnalysisStmt = db.prepare(`
    INSERT INTO peak_analysis (id, record_id, peaks_json, overlaps_json, warnings_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertAnalysisStmt.run(
    analysisId,
    recordId,
    JSON.stringify(peaks),
    JSON.stringify(overlaps),
    JSON.stringify(warnings),
    new Date().toISOString(),
  )

  const log1 = createTraceLog('MISSING_CURVE', 'medium', {
    recordId,
    batchNo: 'BATCH-20240601-PENDING',
  }, '缺少完整的温度曲线文件，仅上传了部分数据')
  saveTraceLog(log1)

  const log2 = createTraceLog('PEAK_UNCERTAIN', 'medium', {
    recordId,
    batchNo: 'BATCH-20240601-PENDING',
  })
  saveTraceLog(log2)

  const balanceResult = calculateBalance(
    recordId,
    [{ formula: 'H2SO4' }, { formula: 'NaOH' }],
    [{ formula: 'Na2SO4' }, { formula: 'H2O' }],
    rows,
  )

  const insertBalanceStmt = db.prepare(`
    INSERT INTO balance_calc (id, record_id, equation, enthalpy_change, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertBalanceStmt.run(
    balanceResult.calcId,
    recordId,
    balanceResult.balancedEquation,
    balanceResult.enthalpyChange,
    'pending',
    new Date().toISOString(),
  )

  const insertTraceStmt = db.prepare(`
    INSERT INTO material_trace (calc_id, row_id, reagent_name, expected_conc, actual_conc, delta_desc)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  balanceResult.materialTrace.forEach((item, idx) => {
    insertTraceStmt.run(
      balanceResult.calcId,
      idx + 1,
      item.reagentName,
      item.concentration,
      item.concentration,
      item.delta,
    )
  })
}

function seedBadRecord(): void {
  const recordId = 'rec-bad-001'
  const rows: WeighingRow[] = [
    { rowIndex: 0, reagentName: '盐酸 HCl', batchNo: 'BATCH-20240601-001', concentration: 2.5, weight: 36.5, purity: 37.0 },
    { rowIndex: 1, reagentName: '氯化钠 NaCl', batchNo: 'BATCH-20240602-001', concentration: 5.0, weight: 58.5, purity: 99.5 },
  ]

  insertRecord(recordId, 'BATCH-20240601-BAD', '王五', 'weighing_bad.csv', 'bad', rows)

  const curve = generateTemperatureCurve(25, 2, 2.0)
  const { peaks, overlaps, warnings } = detectPeaks(curve)
  warnings.push('数据噪声过大，谱峰检测结果不可靠')

  const analysisId = 'analysis-bad-001'
  const insertAnalysisStmt = db.prepare(`
    INSERT INTO peak_analysis (id, record_id, peaks_json, overlaps_json, warnings_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertAnalysisStmt.run(
    analysisId,
    recordId,
    JSON.stringify(peaks),
    JSON.stringify(overlaps),
    JSON.stringify(warnings),
    new Date().toISOString(),
  )

  const log1 = createTraceLog('CONCENTRATION_ERROR', 'high', {
    recordId,
    batchNo: 'BATCH-20240601-BAD',
    rowIndex: 1,
    reagentName: '盐酸 HCl',
    details: { expectedConc: '1.0' },
  }, '盐酸 HCl 浓度填写为 2.5 mol/L，标准值应为 1.0 mol/L，偏差 150%')
  saveTraceLog(log1)

  const log2 = createTraceLog('CONCENTRATION_ERROR', 'high', {
    recordId,
    batchNo: 'BATCH-20240601-BAD',
    rowIndex: 2,
    reagentName: '氯化钠 NaCl',
    details: { expectedConc: '2.0' },
  }, '氯化钠 NaCl 浓度填写为 5.0 mol/L，标准值应为 2.0 mol/L，偏差 150%，可能错填单位或数据')
  saveTraceLog(log2)

  const log3 = createTraceLog('MATERIAL_MISMATCH', 'low', {
    recordId,
    batchNo: 'BATCH-20240601-BAD',
    details: { materialBatchNo: 'BATCH-UNKNOWN-001' },
  })
  saveTraceLog(log3)

  const balanceResult = calculateBalance(
    recordId,
    [{ formula: 'HCl' }, { formula: 'NaCl' }],
    [{ formula: 'NaOH' }, { formula: 'Cl2' }],
    rows,
  )

  const insertBalanceStmt = db.prepare(`
    INSERT INTO balance_calc (id, record_id, equation, enthalpy_change, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertBalanceStmt.run(
    balanceResult.calcId,
    recordId,
    balanceResult.balancedEquation,
    balanceResult.enthalpyChange,
    'bad',
    new Date().toISOString(),
  )

  const insertTraceStmt = db.prepare(`
    INSERT INTO material_trace (calc_id, row_id, reagent_name, expected_conc, actual_conc, delta_desc)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  balanceResult.materialTrace.forEach((item, idx) => {
    insertTraceStmt.run(
      balanceResult.calcId,
      idx + 1,
      item.reagentName,
      idx === 0 ? 1.0 : 2.0,
      item.concentration,
      item.delta,
    )
  })
}

function seedReports(): void {
  const insertReportStmt = db.prepare(`
    INSERT INTO reports (id, record_id, conclusion_level, preview_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  insertReportStmt.run(
    'report-success-001',
    'rec-success-001',
    'usable',
    JSON.stringify({
      recordId: 'rec-success-001',
      conclusionLevel: 'usable',
      summary: '【数据可用】检测到 3 个谱峰；配平方程式：HCl + NaOH → NaCl + H2O；焓变 ΔH = -57.3 kJ/mol',
    }),
    new Date().toISOString(),
  )

  insertReportStmt.run(
    'report-pending-001',
    'rec-pending-001',
    'review',
    JSON.stringify({
      recordId: 'rec-pending-001',
      conclusionLevel: 'review',
      summary: '【需人工复核】检测到 4 个谱峰，存在 1 处重叠峰；存在 2 条待处理异常',
    }),
    new Date().toISOString(),
  )

  insertReportStmt.run(
    'report-bad-001',
    'rec-bad-001',
    'reject',
    JSON.stringify({
      recordId: 'rec-bad-001',
      conclusionLevel: 'reject',
      summary: '【数据不可用】存在 3 条待处理异常，包含 2 个高严重度浓度错误',
    }),
    new Date().toISOString(),
  )
}

export function runSeed(): void {
  const insertMany = db.transaction(() => {
    insertMaterials()
    seedSuccessRecord()
    seedPendingRecord()
    seedBadRecord()
    seedReports()
  })

  insertMany()
  console.log('[DB] Seed data inserted successfully: 3 records (success/pending/bad)')
}
