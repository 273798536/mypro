import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

const FILES = {
  batches: path.join(DATA_DIR, 'batches.json'),
  parameters: path.join(DATA_DIR, 'parameters.json'),
  processingRecords: path.join(DATA_DIR, 'processingRecords.json'),
  rawData: path.join(DATA_DIR, 'rawData.json'),
  corrections: path.join(DATA_DIR, 'corrections.json'),
  opinions: path.join(DATA_DIR, 'opinions.json'),
} as const

function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  for (const filePath of Object.values(FILES)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8')
    }
  }
}

function readJSON<T = any[]>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

function writeJSON<T = any[]>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

initStorage()

export function getBatches() {
  return readJSON<any[]>(FILES.batches)
}

export function getBatchById(id: string) {
  const batches = readJSON<any[]>(FILES.batches)
  return batches.find((b) => b.id === id) || null
}

export function createBatch(data: any) {
  const batches = readJSON<any[]>(FILES.batches)
  const batch = { id: `batch_${Date.now()}`, createdAt: new Date().toISOString(), ...data }
  batches.push(batch)
  writeJSON(FILES.batches, batches)
  return batch
}

export function getParametersByBatchId(batchId: string) {
  const parameters = readJSON<any[]>(FILES.parameters)
  return parameters.filter((p) => p.batchId === batchId)
}

export function createParameters(batchId: string, params: any) {
  const parameters = readJSON<any[]>(FILES.parameters)
  const entry = { id: `param_${Date.now()}`, batchId, ...params, createdAt: new Date().toISOString() }
  parameters.push(entry)
  writeJSON(FILES.parameters, parameters)
  return entry
}

export function getProcessingRecordsByBatchId(batchId: string) {
  const records = readJSON<any[]>(FILES.processingRecords)
  return records.filter((r) => r.batchId === batchId)
}

export function createProcessingRecord(batchId: string, record: any) {
  const records = readJSON<any[]>(FILES.processingRecords)
  const entry = { id: `proc_${Date.now()}`, batchId, ...record, createdAt: new Date().toISOString() }
  records.push(entry)
  writeJSON(FILES.processingRecords, records)
  return entry
}

export function getRawDataByBatchId(batchId: string) {
  const rawData = readJSON<any[]>(FILES.rawData)
  return rawData.filter((r) => r.batchId === batchId)
}

export function createRawData(batchId: string, data: any) {
  const rawData = readJSON<any[]>(FILES.rawData)
  const entry = { id: `raw_${Date.now()}`, batchId, ...data, createdAt: new Date().toISOString() }
  rawData.push(entry)
  writeJSON(FILES.rawData, rawData)
  return entry
}

export function getCorrectionsByBatchId(batchId: string) {
  const corrections = readJSON<any[]>(FILES.corrections)
  return corrections.filter((c) => c.batchId === batchId)
}

export function createCorrection(batchId: string, correction: any) {
  const corrections = readJSON<any[]>(FILES.corrections)
  const entry = { id: `corr_${Date.now()}`, batchId, ...correction, createdAt: new Date().toISOString() }
  corrections.push(entry)
  writeJSON(FILES.corrections, corrections)
  return entry
}

export function getOpinionsByBatchId(batchId: string) {
  const opinions = readJSON<any[]>(FILES.opinions)
  return opinions.filter((o) => o.batchId === batchId)
}

export function createOpinion(batchId: string, opinion: any) {
  const opinions = readJSON<any[]>(FILES.opinions)
  const entry = { id: `opin_${Date.now()}`, batchId, ...opinion, createdAt: new Date().toISOString() }
  opinions.push(entry)
  writeJSON(FILES.opinions, opinions)
  return entry
}

export function getAllBatches() {
  return readJSON<any[]>(FILES.batches)
}
