import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { SAMPLE_CSV } from '../db.js'
import * as repo from '../repository.js'
import type {
  AnnotationInput,
  CompareRow,
  Conclusion,
  ImportResult,
  Preference,
  ReviewFilters,
  ReviewRow,
  Summary,
  VersionInfo,
} from '../../shared/types.js'

const VALID_PREF = new Set<Preference>(['a', 'b', 'tie'])

function normalizePreference(value: string | undefined | null): Preference | null {
  if (value === undefined || value === null) return null
  const v = String(value).trim().toLowerCase()
  if (v === '') return null
  if (v === 'a' || v === 'A') return 'a'
  if (v === 'b' || v === 'B') return 'b'
  if (v === 'tie' || v === 't' || v === '平' || v === '平局') return 'tie'
  return null
}

function versionStamp(prefix: string): string {
  const d = new Date()
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export interface ParsedImport {
  rows: AnnotationInput[]
  version: string
  label: string
}

export function parseCsv(csvText: string): AnnotationInput[] {
  let records: Record<string, string>[] = []
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })
  } catch (err) {
    throw new Error(`CSV 解析失败：${(err as Error).message}`)
  }

  const rows: AnnotationInput[] = []
  records.forEach((rec, idx) => {
    const lineNo = idx + 2
    const record_id = (rec.record_id ?? '').trim()
    const model_version = (rec.model_version ?? '').trim()
    const prompt = (rec.prompt ?? '').trim()
    const response_a = (rec.response_a ?? '').trim()
    const response_b = (rec.response_b ?? '').trim()
    const human_label_raw = (rec.human_label ?? '').trim()

    if (!record_id) throw new Error(`第 ${lineNo} 行缺少 record_id`)
    if (!model_version) throw new Error(`第 ${lineNo} 行缺少 model_version`)
    if (!prompt) throw new Error(`第 ${lineNo} 行缺少 prompt`)
    if (!response_a || !response_b) throw new Error(`第 ${lineNo} 行缺少 response_a/response_b`)
    const human_label = normalizePreference(human_label_raw)
    if (!human_label) throw new Error(`第 ${lineNo} 行 human_label 非法：${human_label_raw}`)

    const rm_prediction = normalizePreference(rec.rm_prediction ?? '')
    const annotator = (rec.annotator ?? '').trim() || null

    rows.push({
      record_id,
      model_version,
      prompt,
      response_a,
      response_b,
      human_label,
      rm_prediction,
      annotator,
    })
  })

  return rows
}

export function importCsv(csvText: string, label?: string): ImportResult {
  const rows = parseCsv(csvText)
  if (rows.length === 0) throw new Error('CSV 中没有可导入的记录')
  const version = versionStamp('imp')
  const finalLabel = label?.trim() || version
  return repo.importBatch(rows, version, finalLabel)
}

export function seedIfEmpty(): ImportResult | null {
  if (repo.countRecords() > 0) return null
  if (!fs.existsSync(SAMPLE_CSV)) return null
  const csvText = fs.readFileSync(SAMPLE_CSV, 'utf8')
  const rows = parseCsv(csvText)
  if (rows.length === 0) return null
  return repo.importBatch(rows, 'sample', '示例数据')
}

export function listReviewRows(filters: ReviewFilters): ReviewRow[] {
  return repo.listReviewRows(filters)
}

export function getSummary(filters: ReviewFilters): Summary {
  return repo.getSummary(filters)
}

const EXPORT_COLUMNS: Array<{ key: keyof ReviewRow; header: string }> = [
  { key: 'record_id', header: 'record_id' },
  { key: 'model_version', header: 'model_version' },
  { key: 'prompt', header: 'prompt' },
  { key: 'response_a', header: 'response_a' },
  { key: 'response_b', header: 'response_b' },
  { key: 'human_label', header: 'human_label' },
  { key: 'rm_prediction', header: 'rm_prediction' },
  { key: 'annotator', header: 'annotator' },
  { key: 'conclusion', header: 'conclusion' },
  { key: 'bias_type', header: 'bias_type' },
  { key: 'severity', header: 'severity' },
  { key: 'reviewer', header: 'reviewer' },
  { key: 'feedback', header: 'feedback' },
  { key: 'concluded_at', header: 'concluded_at' },
  { key: 'versions', header: 'versions' },
  { key: 'has_disagreement', header: 'has_disagreement' },
  { key: 'created_at', header: 'created_at' },
  { key: 'updated_at', header: 'updated_at' },
]

export function exportCsv(filters: ReviewFilters): string {
  const rows = repo.listReviewRows(filters)
  const data = rows.map((r) => {
    const obj: Record<string, string> = {}
    for (const col of EXPORT_COLUMNS) {
      const value = r[col.key]
      if (value === null || value === undefined) obj[col.header] = ''
      else if (Array.isArray(value)) obj[col.header] = value.join('|')
      else if (typeof value === 'boolean') obj[col.header] = value ? 'true' : 'false'
      else obj[col.header] = String(value)
    }
    return obj
  })
  if (data.length === 0) {
    return stringify([], { header: true, columns: EXPORT_COLUMNS.map((c) => c.header) })
  }
  return stringify(data, {
    header: true,
    columns: EXPORT_COLUMNS.map((c) => c.header),
  })
}

export function getRecord(record_id: string): ReviewRow | null {
  return repo.getRecord(record_id)
}

export interface ConclusionPayload {
  conclusion: Conclusion
  bias_type?: string | null
  severity?: string | null
  reviewer?: string | null
  feedback?: string | null
}

export function upsertConclusion(record_id: string, payload: ConclusionPayload): void {
  repo.upsertConclusion(record_id, payload, null)
}

export function deleteConclusion(record_id: string): void {
  repo.deleteConclusion(record_id)
}

export function listVersions(): VersionInfo[] {
  return repo.listVersions()
}

export function compareVersions(a: string, b: string): CompareRow[] {
  return repo.compareVersions(a, b)
}

export function listModelVersions(): string[] {
  return repo.listModelVersions()
}

export function listBiasTypes(): string[] {
  return repo.listBiasTypes()
}
