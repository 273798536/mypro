import { getDb, type DB } from './db.js'
import type {
  AnnotationInput,
  CompareRow,
  Conclusion,
  ImportResult,
  ReviewFilters,
  ReviewRow,
  Summary,
  VersionInfo,
} from '../shared/types.js'

type RawReviewRow = {
  record_id: string
  model_version: string
  prompt: string
  response_a: string
  response_b: string
  human_label: string
  rm_prediction: string | null
  annotator: string | null
  created_at: string
  updated_at: string
  conclusion: string | null
  bias_type: string | null
  severity: string | null
  reviewer: string | null
  feedback: string | null
  concluded_at: string | null
  conclusion_version: string | null
  versions_csv: string | null
}

function reviewBaseQuery(filters: ReviewFilters): { where: string; params: unknown[] } {
  const where: string[] = []
  const params: unknown[] = []
  if (filters.version) {
    where.push('r.record_id IN (SELECT record_id FROM record_versions WHERE version = ?)')
    params.push(filters.version)
  }
  if (filters.model_version) {
    where.push('r.model_version = ?')
    params.push(filters.model_version)
  }
  if (filters.conclusion) {
    if (filters.conclusion === 'pending') {
      where.push('c.conclusion IS NULL')
    } else {
      where.push('c.conclusion = ?')
      params.push(filters.conclusion)
    }
  }
  if (filters.bias_type) {
    where.push('c.bias_type = ?')
    params.push(filters.bias_type)
  }
  if (filters.q) {
    where.push('(r.prompt LIKE ? OR r.record_id LIKE ?)')
    params.push(`%${filters.q}%`, `%${filters.q}%`)
  }
  return { where: where.length ? 'WHERE ' + where.join(' AND ') : '', params }
}

function toReviewRow(r: RawReviewRow): ReviewRow {
  const rm = r.rm_prediction
  const has_disagreement =
    rm !== null && r.human_label !== null && rm !== r.human_label
  return {
    record_id: r.record_id,
    model_version: r.model_version,
    prompt: r.prompt,
    response_a: r.response_a,
    response_b: r.response_b,
    human_label: r.human_label as ReviewRow['human_label'],
    rm_prediction: (r.rm_prediction as ReviewRow['rm_prediction']) ?? null,
    annotator: r.annotator,
    created_at: r.created_at,
    updated_at: r.updated_at,
    conclusion: (r.conclusion as Conclusion | null) ?? null,
    bias_type: r.bias_type,
    severity: r.severity,
    reviewer: r.reviewer,
    feedback: r.feedback,
    concluded_at: r.concluded_at,
    conclusion_version: r.conclusion_version,
    versions: r.versions_csv ? r.versions_csv.split(',') : [],
    has_disagreement,
  }
}

export function listReviewRows(filters: ReviewFilters): ReviewRow[] {
  const db = getDb()
  const { where, params } = reviewBaseQuery(filters)
  const sql = `
    SELECT r.record_id, r.model_version, r.prompt, r.response_a, r.response_b,
           r.human_label, r.rm_prediction, r.annotator, r.created_at, r.updated_at,
           c.conclusion, c.bias_type, c.severity, c.reviewer, c.feedback, c.concluded_at,
           c.version AS conclusion_version,
           (SELECT group_concat(version, ',') FROM record_versions rv WHERE rv.record_id = r.record_id) AS versions_csv
    FROM records r
    LEFT JOIN conclusions c ON c.record_id = r.record_id
    ${where}
    ORDER BY r.created_at DESC
  `
  const rows = db.prepare(sql).all(...params) as RawReviewRow[]
  return rows.map(toReviewRow)
}

export function getSummary(filters: ReviewFilters): Summary {
  const db = getDb()
  const { where, params } = reviewBaseQuery(filters)
  const sql = `
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN c.conclusion IS NOT NULL THEN 1 ELSE 0 END), 0) AS reviewed,
      COALESCE(SUM(CASE WHEN c.conclusion IS NULL THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN c.conclusion = '通过' THEN 1 ELSE 0 END), 0) AS pass,
      COALESCE(SUM(CASE WHEN c.conclusion = '待确认' THEN 1 ELSE 0 END), 0) AS pending_confirm,
      COALESCE(SUM(CASE WHEN c.conclusion = '驳回' THEN 1 ELSE 0 END), 0) AS rejected
    FROM records r
    LEFT JOIN conclusions c ON c.record_id = r.record_id
    ${where}
  `
  const row = db.prepare(sql).get(...params) as {
    total: number
    reviewed: number
    pending: number
    pass: number
    pending_confirm: number
    rejected: number
  }
  return {
    total: row.total ?? 0,
    reviewed: row.reviewed ?? 0,
    pending: row.pending ?? 0,
    pass: row.pass ?? 0,
    pending_confirm: row.pending_confirm ?? 0,
    rejected: row.rejected ?? 0,
    distribution: [
      { conclusion: '通过', count: row.pass ?? 0 },
      { conclusion: '待确认', count: row.pending_confirm ?? 0 },
      { conclusion: '驳回', count: row.rejected ?? 0 },
      { conclusion: '待复核', count: row.pending ?? 0 },
    ],
  }
}

export function getRecord(record_id: string): ReviewRow | null {
  const rows = listReviewRows({ q: undefined })
  return rows.find((r) => r.record_id === record_id) ?? null
}

export function countRecords(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) AS c FROM records').get() as { c: number }
  return row.c
}

export function listModelVersions(): string[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT DISTINCT model_version FROM records ORDER BY model_version')
    .all() as { model_version: string }[]
  return rows.map((r) => r.model_version)
}

export function listBiasTypes(): string[] {
  const db = getDb()
  const rows = db
    .prepare("SELECT DISTINCT bias_type FROM conclusions WHERE bias_type IS NOT NULL ORDER BY bias_type")
    .all() as { bias_type: string }[]
  return rows.map((r) => r.bias_type)
}

const UPSERT_RECORD_SQL = `
  INSERT INTO records (record_id, model_version, prompt, response_a, response_b, human_label, rm_prediction, annotator, created_at, updated_at)
  VALUES (@record_id, @model_version, @prompt, @response_a, @response_b, @human_label, @rm_prediction, @annotator, @created_at, @updated_at)
  ON CONFLICT(record_id) DO UPDATE SET
    model_version = excluded.model_version,
    prompt = excluded.prompt,
    response_a = excluded.response_a,
    response_b = excluded.response_b,
    human_label = excluded.human_label,
    rm_prediction = excluded.rm_prediction,
    annotator = excluded.annotator,
    updated_at = excluded.updated_at
`

export function importBatch(
  rows: AnnotationInput[],
  version: string,
  label: string,
): ImportResult {
  const db = getDb()
  const now = new Date().toISOString()

  const upsertRecord = db.prepare(UPSERT_RECORD_SQL)
  const addVersion = db.prepare(
    'INSERT INTO record_versions (record_id, version) VALUES (?, ?) ON CONFLICT DO NOTHING',
  )
  const existingStmt = db.prepare('SELECT 1 FROM records WHERE record_id = ?')
  const upsertVersionRow = db.prepare(`
    INSERT INTO versions (version, label, created_at, record_count, summary)
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT(version) DO UPDATE SET label = excluded.label, created_at = excluded.created_at
  `)
  const countForVersion = db.prepare(
    'SELECT COUNT(*) AS c FROM record_versions WHERE version = ?',
  )

  const tx = db.transaction((input: AnnotationInput[]) => {
    let imported = 0
    let updated = 0
    for (const row of input) {
      const existed = existingStmt.get(row.record_id) !== undefined
      upsertRecord.run({
        record_id: row.record_id,
        model_version: row.model_version,
        prompt: row.prompt,
        response_a: row.response_a,
        response_b: row.response_b,
        human_label: row.human_label,
        rm_prediction: row.rm_prediction,
        annotator: row.annotator,
        created_at: now,
        updated_at: now,
      })
      addVersion.run(row.record_id, version)
      if (existed) updated++
      else imported++
    }
    const total = (countForVersion.get(version) as { c: number }).c
    upsertVersionRow.run(version, label, now, total)
    return { imported, updated, total }
  })

  const result = tx(rows)
  return { version, label, ...result }
}

export interface ConclusionInput {
  conclusion: Conclusion
  bias_type?: string | null
  severity?: string | null
  reviewer?: string | null
  feedback?: string | null
}

export function upsertConclusion(record_id: string, input: ConclusionInput, version: string | null): void {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO conclusions (record_id, conclusion, bias_type, severity, reviewer, feedback, concluded_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(record_id) DO UPDATE SET
      conclusion = excluded.conclusion,
      bias_type = excluded.bias_type,
      severity = excluded.severity,
      reviewer = excluded.reviewer,
      feedback = excluded.feedback,
      concluded_at = excluded.concluded_at,
      version = excluded.version
  `).run(
    record_id,
    input.conclusion,
    input.bias_type ?? null,
    input.severity ?? null,
    input.reviewer ?? null,
    input.feedback ?? null,
    now,
    version,
  )
}

export function deleteConclusion(record_id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM conclusions WHERE record_id = ?').run(record_id)
}

function summaryFromCount(db: DB, version: string): Summary {
  const row = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN c.conclusion IS NOT NULL THEN 1 ELSE 0 END), 0) AS reviewed,
        COALESCE(SUM(CASE WHEN c.conclusion IS NULL THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN c.conclusion = '通过' THEN 1 ELSE 0 END), 0) AS pass,
        COALESCE(SUM(CASE WHEN c.conclusion = '待确认' THEN 1 ELSE 0 END), 0) AS pending_confirm,
        COALESCE(SUM(CASE WHEN c.conclusion = '驳回' THEN 1 ELSE 0 END), 0) AS rejected
      FROM record_versions rv
      JOIN records r ON r.record_id = rv.record_id
      LEFT JOIN conclusions c ON c.record_id = rv.record_id
      WHERE rv.version = ?
    `)
    .get(version) as {
    total: number
    reviewed: number
    pending: number
    pass: number
    pending_confirm: number
    rejected: number
  }
  return {
    total: row.total ?? 0,
    reviewed: row.reviewed ?? 0,
    pending: row.pending ?? 0,
    pass: row.pass ?? 0,
    pending_confirm: row.pending_confirm ?? 0,
    rejected: row.rejected ?? 0,
    distribution: [
      { conclusion: '通过', count: row.pass ?? 0 },
      { conclusion: '待确认', count: row.pending_confirm ?? 0 },
      { conclusion: '驳回', count: row.rejected ?? 0 },
      { conclusion: '待复核', count: row.pending ?? 0 },
    ],
  }
}

export function listVersions(): VersionInfo[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT version, label, created_at, record_count FROM versions ORDER BY created_at DESC')
    .all() as { version: string; label: string | null; created_at: string; record_count: number }[]
  return rows.map((r) => ({
    version: r.version,
    label: r.label,
    created_at: r.created_at,
    record_count: r.record_count,
    summary: summaryFromCount(db, r.version),
  }))
}

export function getVersionSummary(version: string): Summary {
  const db = getDb()
  return summaryFromCount(db, version)
}

type RawCompareRow = {
  record_id: string
  model_version: string
  prompt: string
  rm_prediction: string | null
  human_label: string
  conclusion: string | null
  bias_type: string | null
}

export function compareVersions(a: string, b: string): CompareRow[] {
  const db = getDb()
  const sql = `
    SELECT r.record_id, r.model_version, r.prompt, r.rm_prediction, r.human_label,
           c.conclusion, c.bias_type, rv_a.version IS NOT NULL AS in_a, rv_b.version IS NOT NULL AS in_b
    FROM records r
    LEFT JOIN conclusions c ON c.record_id = r.record_id
    LEFT JOIN record_versions rv_a ON rv_a.record_id = r.record_id AND rv_a.version = ?
    LEFT JOIN record_versions rv_b ON rv_b.record_id = r.record_id AND rv_b.version = ?
    WHERE rv_a.version IS NOT NULL OR rv_b.version IS NOT NULL
    ORDER BY r.record_id
  `
  const rows = db.prepare(sql).all(a, b) as Array<RawCompareRow & { in_a: number; in_b: number }>
  return rows.map((r) => {
    const rm = r.rm_prediction
    const has_disagreement = rm !== null && r.human_label !== null && rm !== r.human_label
    return {
      record_id: r.record_id,
      model_version: r.model_version,
      prompt: r.prompt,
      rm_prediction: (rm as CompareRow['rm_prediction']) ?? null,
      human_label: r.human_label as CompareRow['human_label'],
      conclusion: (r.conclusion as Conclusion | null) ?? null,
      bias_type: r.bias_type,
      has_disagreement,
      in_a: r.in_a === 1,
      in_b: r.in_b === 1,
      in_both: r.in_a === 1 && r.in_b === 1,
    }
  })
}
