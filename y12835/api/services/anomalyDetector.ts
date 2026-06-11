import { v4 as uuid } from 'uuid'
import { getDb } from '../db.js'
import type { CryoRecord, AnomalyReview } from '../types.js'

type AnomalyType = AnomalyReview['anomaly_type']

export function detectMissingPhotos(recordId: string): string | null {
  const db = getDb()
  const record = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(recordId) as CryoRecord | undefined
  if (!record) return null

  const photos = db.prepare('SELECT photo_type FROM micro_photos WHERE record_id = ?').all(recordId) as { photo_type: string }[]
  const types = new Set(photos.map(p => p.photo_type))

  if (record.type === 'freeze' && !types.has('pre_freeze')) {
    return createAnomaly(recordId, 'missing_photo',
      `${record.cell_line}冻存记录缺少冻存前显微照片`,
      generateActionableHint('missing_photo', record))
  }
  if (record.type === 'thaw' && !types.has('post_thaw')) {
    return createAnomaly(recordId, 'missing_photo',
      `${record.cell_line}复苏记录缺少复苏后显微照片`,
      generateActionableHint('missing_photo', record))
  }
  return null
}

export function detectViabilityAnomaly(recordId: string): string | null {
  const db = getDb()
  const record = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(recordId) as CryoRecord | undefined
  if (!record || record.type !== 'thaw' || record.viability_rate === null) return null

  if (record.viability_rate < 50) {
    return createAnomaly(recordId, 'viability_anomaly',
      `${record.cell_line}复苏存活率仅${record.viability_rate}%，低于50%阈值`,
      generateActionableHint('viability_anomaly', record))
  }
  return null
}

export function detectLabelUnclear(recordId: string): string[] {
  const db = getDb()
  const ids: string[] = []
  const photos = db.prepare('SELECT id, label FROM micro_photos WHERE record_id = ? AND label = ?').all(recordId, '') as { id: string }[]

  if (photos.length > 0) {
    const record = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(recordId) as CryoRecord | undefined
    if (!record) return ids
    const anomalyId = createAnomaly(recordId, 'label_unclear',
      `${record.cell_line}有${photos.length}张照片标签为空`,
      generateActionableHint('label_unclear', record))
    if (anomalyId) ids.push(anomalyId)
  }
  return ids
}

export function generateActionableHint(anomalyType: AnomalyType, record: CryoRecord): string {
  switch (anomalyType) {
    case 'missing_photo':
      if (record.type === 'freeze') {
        return `缺少冻存前显微照片，请上传冻存前（P${record.passage_number}代）照片`
      }
      return `缺少复苏后显微照片，请上传复苏后（P${record.passage_number}代）照片`
    case 'viability_anomaly':
      return `复苏存活率异常偏低(${record.viability_rate}%)，请检查冻存流程及试剂是否过期`
    case 'label_unclear':
      return `照片标签为空，请补充标注细胞系名称、代次及拍照时间`
    case 'annotation_conflict':
      return `标注信息存在冲突，请核实并更正`
    default:
      return '请检查记录并补充相关信息'
  }
}

export function runAllDetectors(recordId: string): { warnings: string[]; anomaly_ids: string[] } {
  const warnings: string[] = []
  const anomaly_ids: string[] = []

  const missingId = detectMissingPhotos(recordId)
  if (missingId) {
    anomaly_ids.push(missingId)
    warnings.push('缺少必要的显微照片，已创建异常复核记录')
  }

  const viabilityId = detectViabilityAnomaly(recordId)
  if (viabilityId) {
    anomaly_ids.push(viabilityId)
    warnings.push('复苏存活率异常偏低，已创建异常复核记录')
  }

  const labelIds = detectLabelUnclear(recordId)
  if (labelIds.length > 0) {
    anomaly_ids.push(...labelIds)
    warnings.push('存在标签为空的照片，已创建异常复核记录')
  }

  if (anomaly_ids.length > 0) {
    const db = getDb()
    db.prepare('UPDATE cryo_records SET status = ? WHERE id = ?').run('review_needed', recordId)
  }

  return { warnings, anomaly_ids }
}

function createAnomaly(recordId: string, type: AnomalyType, description: string, hint: string): string | null {
  const db = getDb()
  const existing = db.prepare(
    'SELECT id FROM anomaly_reviews WHERE record_id = ? AND anomaly_type = ? AND review_status = ?'
  ).get(recordId, type, 'pending') as { id: string } | undefined

  if (existing) return existing.id

  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO anomaly_reviews (id, record_id, anomaly_type, description, actionable_hint, review_status, created_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, recordId, type, description, hint, 'pending', now)

  db.prepare(
    'INSERT INTO anomaly_source_links (id, anomaly_id, source_record_id) VALUES (?,?,?)'
  ).run(uuid(), id, recordId)

  return id
}
