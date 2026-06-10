import { create } from 'zustand'
import {
  StandardBatch,
  SpectrumRecord,
  SpectrumPeak,
  AnomalyRecord,
  ProcessRecord,
  ValidityReport,
} from '../types'
import { generateImportHash, detectPeakOverlap, generatePlainOverlapExplanation } from '../utils/spectrum'
import { buildPlainLanguageSummary, buildValidityConclusion, buildExportText } from '../utils/report'
import { sampleBatches, sampleSpectrums, sampleAnomalies, sampleProcesses } from '../data/samples'

interface LabStore {
  batches: StandardBatch[]
  spectrums: SpectrumRecord[]
  anomalies: AnomalyRecord[]
  processes: ProcessRecord[]
  reports: ValidityReport[]

  addBatch: (batch: Omit<StandardBatch, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateBatch: (id: string, updates: Partial<StandardBatch>) => void
  auditBatch: (id: string, auditor: string) => void

  importSpectrum: (
    batchId: string,
    instrumentName: string,
    instrumentNo: string,
    analyst: string,
    analysisDate: string,
    peaks: SpectrumPeak[],
    operator: string,
  ) => { id: string; isDuplicate: boolean; existingId?: string }

  addAnomaly: (anomaly: Omit<AnomalyRecord, 'id' | 'createdAt' | 'reportedAt' | 'processRecordIds'>) => string
  handleAnomaly: (id: string, handler: string, opinion: string, safetyHint?: string) => void

  addProcessRecord: (record: Omit<ProcessRecord, 'id' | 'createdAt'>) => string

  generateReport: (batchId: string, generatedBy: string) => ValidityReport
  exportReportText: (batchId: string) => string

  getBatchById: (id: string) => StandardBatch | undefined
  getSpectrumsByBatchId: (batchId: string) => SpectrumRecord[]
  getAnomaliesByBatchId: (batchId: string) => AnomalyRecord[]
  getProcessesByBatchId: (batchId: string) => ProcessRecord[]
  getAnomalyById: (id: string) => AnomalyRecord | undefined
  getSpectrumById: (id: string) => SpectrumRecord | undefined
  getTraceChain: (anomalyId: string) => { anomaly: AnomalyRecord; spectrum?: SpectrumRecord; processes: ProcessRecord[] }
}

let _counter = 1000
function nextId(prefix: string) {
  _counter++
  return `${prefix}-${_counter.toString(36)}`
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export const useLabStore = create<LabStore>((set, get) => ({
  batches: [...sampleBatches],
  spectrums: [...sampleSpectrums],
  anomalies: [...sampleAnomalies],
  processes: [...sampleProcesses],
  reports: [],

  addBatch: (batchData) => {
    const id = nextId('batch')
    const ts = now()
    const batch: StandardBatch = { ...batchData, id, createdAt: ts, updatedAt: ts }
    set((s) => ({ batches: [...s.batches, batch] }))
    get().addProcessRecord({
      batchId: id,
      operator: batchData.preparator,
      operationType: 'create_batch',
      description: `创建${batchData.reagentName}批次 ${batchData.batchNo}`,
    })
    return id
  },

  updateBatch: (id, updates) => {
    set((s) => ({
      batches: s.batches.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: now() } : b,
      ),
    }))
    get().addProcessRecord({
      batchId: id,
      operator: updates.preparator || '系统',
      operationType: 'update_batch',
      description: `修改批次 ${id} 信息`,
    })
  },

  auditBatch: (id, auditor) => {
    set((s) => ({
      batches: s.batches.map((b) =>
        b.id === id
          ? { ...b, status: 'audited' as const, auditor, updatedAt: now() }
          : b,
      ),
    }))
    get().addProcessRecord({
      batchId: id,
      operator: auditor,
      operationType: 'audit',
      description: `复核批次，状态更新为已复核`,
    })
  },

  importSpectrum: (batchId, instrumentName, instrumentNo, analyst, analysisDate, peaks, operator) => {
    const hash = generateImportHash(batchId, instrumentNo, analysisDate, peaks)
    const existing = get().spectrums.find((s) => s.importHash === hash)
    if (existing) {
      get().addProcessRecord({
        batchId,
        relatedSpectrumId: existing.id,
        operator: '系统',
        operationType: 'dedupe_spectrum',
        description: `检测到相同谱图数据已存在（ID: ${existing.id}），跳过重复导入，保留原有结论「${existing.conclusion === 'qualified' ? '合格' : existing.conclusion === 'unqualified' ? '不合格' : '待判定'}」。`,
      })
      return { id: existing.id, isDuplicate: true, existingId: existing.id }
    }

    const { hasOverlap, overlapDetails } = detectPeakOverlap(peaks)
    const conclusion: SpectrumRecord['conclusion'] = hasOverlap ? 'unqualified' : 'qualified'

    function genRawData() {
      const arr: { rt: number; intensity: number }[] = []
      for (let i = 0; i < 300; i++) {
        const rt = (i / 300) * 10
        let intensity = 5 + Math.random() * 3
        peaks.forEach((p) => {
          const diff = (rt - p.retentionTime) / (p.width / 2.355)
          intensity += p.height * Math.exp(-0.5 * diff * diff)
        })
        arr.push({ rt: Number(rt.toFixed(3)), intensity: Number(intensity.toFixed(2)) })
      }
      return arr
    }

    const id = nextId('spec')
    const ts = now()
    const spectrum: SpectrumRecord = {
      id,
      batchId,
      importHash: hash,
      instrumentName,
      instrumentNo,
      analyst,
      analysisDate,
      peaks,
      hasOverlap,
      overlapDetails,
      conclusion,
      rawData: genRawData(),
      createdAt: ts,
    }

    set((s) => ({ spectrums: [...s.spectrums, spectrum] }))

    get().addProcessRecord({
      batchId,
      relatedSpectrumId: id,
      operator,
      operationType: 'import_spectrum',
      description: `导入 ${analysisDate} ${instrumentNo} 谱图数据，${hasOverlap ? '发现谱峰重叠，判定不合格' : '单峰正常，判定合格'}。`,
    })

    if (hasOverlap) {
      get().addProcessRecord({
        batchId,
        relatedSpectrumId: id,
        operator: '系统',
        operationType: 'detect_overlap',
        description: `自动检测：谱图存在 ${overlapDetails.length} 处谱峰重叠。`,
        safetyHint: '谱峰重叠数据不可用于有效期判定，建议重新检测。',
      })

      const plainExplanation = generatePlainOverlapExplanation(overlapDetails)
      get().addAnomaly({
        batchId,
        relatedSpectrumId: id,
        anomalyType: 'peak_overlap',
        severity: 'medium',
        title: `${analysisDate} 谱图出现谱峰重叠`,
        detail: overlapDetails.join('；'),
        safetyHint: '本次检测结果不可用于有效期判定。重叠峰提示标准液中可能出现未知杂质，需核查储存条件和容器。',
        plainLanguageExplanation: plainExplanation,
        status: 'open',
        reporter: operator,
      })
    }

    return { id, isDuplicate: false }
  },

  addAnomaly: (anomalyData) => {
    const id = nextId('anom')
    const ts = now()
    const anomaly: AnomalyRecord = {
      ...anomalyData,
      id,
      reportedAt: ts,
      processRecordIds: [],
    }

    const procId = get().addProcessRecord({
      batchId: anomalyData.batchId,
      relatedSpectrumId: anomalyData.relatedSpectrumId,
      relatedAnomalyId: id,
      operator: anomalyData.reporter,
      operationType: 'mark_anomaly',
      description: `登记异常：${anomalyData.title}，等级：${anomalyData.severity === 'high' ? '高' : anomalyData.severity === 'medium' ? '中' : '低'}。`,
      safetyHint: anomalyData.safetyHint,
    })

    anomaly.processRecordIds = [procId]
    set((s) => ({ anomalies: [...s.anomalies, anomaly] }))
    return id
  },

  handleAnomaly: (id, handler, opinion, safetyHint) => {
    const anomaly = get().anomalies.find((a) => a.id === id)
    if (!anomaly) return

    const procId = get().addProcessRecord({
      batchId: anomaly.batchId,
      relatedAnomalyId: id,
      operator: handler,
      operationType: 'handle_anomaly',
      description: `处理异常 ${id}：${opinion}`,
      safetyHint,
    })

    set((s) => ({
      anomalies: s.anomalies.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'resolved' as const,
              handler,
              handlingOpinion: opinion,
              handledAt: now(),
              processRecordIds: [...a.processRecordIds, procId],
            }
          : a,
      ),
    }))
  },

  addProcessRecord: (recordData) => {
    const id = nextId('proc')
    const ts = now()
    const record: ProcessRecord = { ...recordData, id, createdAt: ts }
    set((s) => ({ processes: [...s.processes, record] }))
    return id
  },

  generateReport: (batchId, generatedBy) => {
    const batch = get().getBatchById(batchId)!
    const spectrums = get().getSpectrumsByBatchId(batchId)
    const anomalies = get().getAnomaliesByBatchId(batchId)

    const plainSummary = buildPlainLanguageSummary(batch, spectrums, anomalies)
    const conclusion = buildValidityConclusion(batch, spectrums, anomalies, new Date().toISOString().slice(0, 10))

    const spectrumConclusion =
      spectrums.length === 0
        ? '暂无谱图数据'
        : spectrums.every((s) => s.conclusion === 'qualified')
          ? '所有谱图均合格'
          : spectrums.some((s) => s.hasOverlap)
            ? '存在谱峰重叠，相关检测不合格'
            : '部分检测不合格'

    const anomalySummary =
      anomalies.length === 0
        ? '无异常'
        : `共 ${anomalies.length} 条异常，${anomalies.filter((a) => a.status !== 'closed').length} 条未关闭`

    const report: ValidityReport = {
      id: nextId('rpt'),
      batchId,
      generatedAt: now(),
      generatedBy,
      summary: `批次 ${batch.batchNo} ${batch.reagentName} 有效期判定：${conclusion === 'valid' ? '有效' : conclusion === 'invalid' ? '无效' : '需关注'}`,
      plainLanguageSummary: plainSummary,
      spectrumConclusion,
      anomalySummary,
      validityConclusion: conclusion,
    }

    set((s) => ({ reports: [...s.reports, report] }))
    get().addProcessRecord({
      batchId,
      operator: generatedBy,
      operationType: 'export_report',
      description: `生成有效期检测报告 ${report.id}，结论：${conclusion === 'valid' ? '有效' : conclusion === 'invalid' ? '无效' : '需关注'}`,
    })

    return report
  },

  exportReportText: (batchId) => {
    const batch = get().getBatchById(batchId)!
    const spectrums = get().getSpectrumsByBatchId(batchId)
    const anomalies = get().getAnomaliesByBatchId(batchId)
    const processes = get().getProcessesByBatchId(batchId)
    return buildExportText(batch, spectrums, anomalies, processes)
  },

  getBatchById: (id) => get().batches.find((b) => b.id === id),
  getSpectrumsByBatchId: (batchId) => get().spectrums.filter((s) => s.batchId === batchId),
  getAnomaliesByBatchId: (batchId) => get().anomalies.filter((a) => a.batchId === batchId),
  getProcessesByBatchId: (batchId) => get().processes.filter((p) => p.batchId === batchId),
  getAnomalyById: (id) => get().anomalies.find((a) => a.id === id),
  getSpectrumById: (id) => get().spectrums.find((s) => s.id === id),

  getTraceChain: (anomalyId) => {
    const anomaly = get().getAnomalyById(anomalyId)!
    const spectrum = anomaly.relatedSpectrumId
      ? get().getSpectrumById(anomaly.relatedSpectrumId)
      : undefined
    const processes = get().getProcessesByBatchId(anomaly.batchId)
    return { anomaly, spectrum, processes }
  },
}))
