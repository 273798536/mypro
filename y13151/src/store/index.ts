import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppState,
  LogBatch,
  SensorRow,
  ComputeRecord,
  AnomalyQueue,
  ComputeConfig,
  AnomalyStatus,
  ComputeStep,
  ResultLevel,
  JumpCause,
} from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const defaultConfig: ComputeConfig = {
  threshold: 50,
  thresholdType: 'absolute',
  timeRangeThresholds: [
    { startHour: 0, endHour: 8, value: 45 },
    { startHour: 8, endHour: 18, value: 50 },
    { startHour: 18, endHour: 24, value: 48 },
  ],
  warningRatio: 0.8,
  unit: 'dB/s',
  formulaVersion: 'v1.0',
}

const sampleBatch: LogBatch = {
  id: 'batch_' + uid(),
  source: 'demo / 传感器A通道_20260612.csv',
  createdAt: new Date().toISOString(),
  rawText: '',
  status: 'confirmed',
}

const directionSamples = ['+', '+', '+', '+', '+', '+', '+', '-', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+']

const _now = Date.now()
const sampleRows: SensorRow[] = Array.from({ length: 20 }).map((_, i) => {
  const baseTs = _now - (20 - i) * 60 * 1000
  const direction = directionSamples[i] || '+'
  const baseVals = [35, 38, 42, 40, 37, 52, 18, 41, 44, 46, 48, 51, 49, 47, 45, 65, 21, 43, 44, 46]
  const reverb = baseVals[i] || 40
  const isSuspicious = i === 7
  const isDirty = i === 12
  const unit = i === 12 ? '' : 'dB/s'
  return {
    id: 'row_' + uid(),
    batchId: sampleBatch.id,
    rawLine: `${new Date(baseTs).toISOString().slice(11, 19)},${direction},${reverb.toFixed(2)},${unit}`,
    timestamp: baseTs,
    direction,
    reverb,
    unit,
    dirtyFlag: isDirty,
    dirtyReasons: isDirty ? ['单位字段缺失'] : [],
    directionSuspicious: isSuspicious,
    directionImpact: isSuspicious
      ? `方向 ${direction} 与前后众数 + 不一致，影响 #${Math.max(1, i - 3)}~#${Math.min(20, i + 3)} 共 ${Math.min(20, i + 3) - Math.max(1, i - 3) + 1} 条判定`
      : '',
  }
})

sampleRows[3].directionConfirmed = false

function buildComputeSteps(
  raw: number,
  rowUnit: string,
  cfgUnit: string,
  formulaVersion: string,
  threshold: number,
  warningRatio: number,
  value: number,
  result: ResultLevel,
  factor: number,
): ComputeStep[] {
  return [
    {
      label: '获取原始值',
      value: `raw = ${raw} ${rowUnit || '—'}`,
      detail: '行内解析结果',
    },
    {
      label: '单位换算',
      value: `factor = ${factor.toFixed(3)}`,
      detail: rowUnit === cfgUnit
        ? `与配置单位 ${cfgUnit} 一致，无需换算`
        : `从 ${rowUnit} 换算到 ${cfgUnit}`,
    },
    {
      label: `应用公式（${formulaVersion}）`,
      value: `|raw × factor| = ${value.toFixed(2)} ${cfgUnit}`,
      detail: '取绝对值作为混响强度',
    },
    {
      label: '比较阈值',
      value: `${value.toFixed(2)} vs ${threshold} × ${warningRatio} = ${(threshold * warningRatio).toFixed(2)}`,
      detail:
        result === 'normal'
          ? '低于预警线'
          : result === 'warning'
            ? '超预警线，未达临界'
            : '超临界线',
    },
  ]
}

function getUnitFactor(rowUnit: string, cfgUnit: string): number | null {
  if (!rowUnit) return null
  if (rowUnit === cfgUnit) return 1
  const from = rowUnit.toLowerCase()
  const to = cfgUnit.toLowerCase()
  if (from === 'db/ms' && to === 'db/s') return 1000
  if (from === 'db/s' && to === 'db/ms') return 0.001
  if (from === 's' && to === 'db/s') return 1
  if (from === 'db' && to === 'db/s') return 1
  return null
}

function resolveThreshold(cfg: ComputeConfig, ts: number): number {
  if (cfg.thresholdType !== 'timeRange' || !cfg.timeRangeThresholds?.length) return cfg.threshold
  const h = new Date(ts).getHours() + new Date(ts).getMinutes() / 60
  const tr = cfg.timeRangeThresholds.find((t) => h >= t.startHour && h < t.endHour)
  return tr ? tr.value : cfg.threshold
}

function detectJump(
  sorted: ComputeRecord[],
  jumpRelRatio = 0.3,
): Map<string, { cause: JumpCause; note: string; delta: number }> {
  const out = new Map<string, { cause: JumpCause; note: string; delta: number }>()
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (isNaN(prev.computedValue) || isNaN(cur.computedValue)) continue
    const absDelta = cur.computedValue - prev.computedValue
    const relDelta = Math.abs(absDelta) / (Math.abs(prev.computedValue) || 1)

    const crossThreshold = (prev.result === 'normal' && cur.result !== 'normal')
      || (prev.result !== 'critical' && cur.result === 'critical')
      || (prev.result === 'critical' && cur.result !== 'critical')

    let cause: JumpCause | null = null

    if (cur.status === 'manual') cause = 'manualOverride'
    else if (cur.unit !== prev.unit) cause = 'unitChanged'
    else if (cur.threshold !== prev.threshold) cause = 'thresholdChanged'
    else if (relDelta >= jumpRelRatio || crossThreshold) cause = 'rawJump'

    if (cause) {
      let note = ''
      switch (cause) {
        case 'manualOverride':
          note = `人工改判导致跳变，改判理由：${cur.manualReason || '未填'}，${cur.manualNote || ''}`
          break
        case 'unitChanged':
          note = `单位从 ${prev.unit} 切换到 ${cur.unit} 触发跳变`
          break
        case 'thresholdChanged':
          note = `阈值从 ${prev.threshold} 变更为 ${cur.threshold} 触发跳变（阈值/时段调整）`
          break
        case 'rawJump':
          note = `原值前后差值 ${absDelta.toFixed(2)}（相对 ${(relDelta * 100).toFixed(0)}%），原始数据波动${crossThreshold ? '并跨越阈值线' : ''}`
          break
      }
      out.set(cur.id, { cause, note, delta: absDelta })
    }
  }
  return out
}

const sampleComputes: ComputeRecord[] = []
const sortedRows = [...sampleRows].sort((a, b) => a.timestamp - b.timestamp)
for (const row of sortedRows) {
  if (row.dirtyFlag || (row.directionSuspicious && !row.directionConfirmed)) continue
  const threshold = resolveThreshold(defaultConfig, row.timestamp)
  const factor = getUnitFactor(row.unit || defaultConfig.unit, defaultConfig.unit) || 1
  const value = Math.abs(row.reverb * factor)
  const ratio = value / threshold
  let result: ResultLevel = 'normal'
  if (ratio >= 1) result = 'critical'
  else if (ratio >= defaultConfig.warningRatio) result = 'warning'

  const cmp: ComputeRecord = {
    id: 'cmp_' + uid(),
    rowId: row.id,
    formulaVersion: defaultConfig.formulaVersion,
    threshold,
    thresholdType: defaultConfig.thresholdType,
    unit: defaultConfig.unit,
    rawValue: row.reverb,
    computedValue: value,
    status: 'success',
    result,
    computeSteps: buildComputeSteps(
      row.reverb, row.unit, defaultConfig.unit, defaultConfig.formulaVersion,
      threshold, defaultConfig.warningRatio, value, result, factor,
    ),
  }
  sampleComputes.push(cmp)
}

{
  const jumpInfo = detectJump(sampleComputes, 0.3)
  for (const c of sampleComputes) {
    const j = jumpInfo.get(c.id)
    if (j) {
      c.jumpCause = j.cause
      c.jumpNote = j.note
      ;(c as ComputeRecord & { jumpValueDelta?: number }).jumpValueDelta = j.delta
    }
  }
}

{
  const toFail = sampleComputes.find((c) => Math.abs(c.rawValue - 49) < 0.1)
  if (toFail) {
    toFail.status = 'failed'
    toFail.failCategory = 'unit'
    toFail.failNote = '原始行单位空，换算系数无法确定，无法继续计算'
    toFail.result = 'normal'
  }
  const toManual = sampleComputes.find((c) => Math.abs(c.rawValue - 51) < 0.1)
  if (toManual) {
    toManual.originalResult = toManual.result
    toManual.status = 'manual'
    toManual.result = 'warning'
    toManual.manualReason = 'threshold'
    toManual.manualNote = '该时段现场实测背景噪声偏高，阈值临时上调 10%'
    toManual.manualBy = '小宋'
    toManual.manualAt = new Date().toISOString()
  }
}

const sampleAnomalies: AnomalyQueue[] = []

for (const r of sampleRows) {
  if (r.directionSuspicious) {
    sampleAnomalies.push({
      id: 'an_' + uid(),
      rowId: r.id,
      type: 'direction',
      status: 'open',
      reason: `方向 ${r.direction} 与众数方向不一致`,
      impact: r.directionImpact || '影响相邻记录阈值判定',
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}
for (const c of sampleComputes) {
  if (c.status === 'failed') {
    sampleAnomalies.push({
      id: 'an_' + uid(),
      rowId: c.rowId,
      computeId: c.id,
      type: 'failed',
      status: 'open',
      reason: `卡壳：${c.failCategory === 'formula' ? '公式' : c.failCategory === 'unit' ? '单位' : '阈值'}问题`,
      impact: c.failNote || '该条结果缺失',
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  if (c.status === 'manual') {
    sampleAnomalies.push({
      id: 'an_' + uid(),
      rowId: c.rowId,
      computeId: c.id,
      type: 'manual',
      status: 'confirmed',
      reason: `人工改判：${c.originalResult || '原结果'} → ${c.result}`,
      impact: c.manualNote || '',
      note: `操作人：${c.manualBy || '未填'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  if (c.jumpCause) {
    sampleAnomalies.push({
      id: 'an_' + uid(),
      rowId: c.rowId,
      computeId: c.id,
      type: 'jump',
      status: 'open',
      reason: `跳变检测：${
        c.jumpCause === 'thresholdChanged' ? '阈值变更'
        : c.jumpCause === 'unitChanged' ? '单位变更'
        : c.jumpCause === 'manualOverride' ? '人工改判'
        : '原始数据波动'
      }`,
      impact: c.jumpNote || '趋势图出现异常峰',
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

const initialState: AppState = {
  batches: [sampleBatch],
  rows: sampleRows,
  computes: sampleComputes,
  anomalies: sampleAnomalies,
  config: defaultConfig,
  selectedBatchId: sampleBatch.id,
  selectedRowId: null,
  uiNotes: {},
}

type StoreState = AppState & {
  setConfig: (patch: Partial<ComputeConfig>) => void
  importBatch: (source: string, rawText: string) => void
  confirmDirection: (rowId: string) => void
  ignoreDirection: (rowId: string) => void
  runCompute: () => { ok: number; skipped: number }
  markFail: (computeId: string, category: 'formula' | 'unit' | 'threshold', note: string) => void
  manualOverride: (computeId: string, result: ResultLevel, reason: 'formula' | 'unit' | 'threshold', note: string, by?: string) => void
  updateAnomalyStatus: (anomalyId: string, status: AnomalyStatus) => void
  updateAnomalyNote: (anomalyId: string, note: string) => void
  setRowNote: (rowId: string, note: string) => void
  setSelectedBatchId: (id: string | null) => void
  setSelectedRowId: (id: string | null) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setConfig: (patch) => set({ config: { ...get().config, ...patch } }),
      importBatch: (source, rawText) => {
        const batchId = 'batch_' + uid()
        const now = new Date().toISOString()
        const lines = rawText.split(/\r?\n/).filter((l) => l.trim())
        const headerIdx = lines.findIndex((l) => /时间|time|timestamp|混响|reverb|方向|direction/i.test(l))
        const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines
        let baseTs = Date.now() - dataLines.length * 5 * 60 * 1000

        const rows: SensorRow[] = dataLines.map((line, i) => {
          const cols = line.split(/[,\t;]/).map((c) => c.trim())
          const ts = baseTs + i * 5 * 60 * 1000
          let dir = '+'
          for (const c of cols) {
            if (/^[+\-NSEWnsew]$/.test(c)) { dir = c.toUpperCase(); break }
          }
          const secondCol = cols[1] || ''
          let reverbRaw = NaN
          for (const c of cols) {
            const n = parseFloat(c)
            if (!isNaN(n) && Math.abs(n) < 10000) { reverbRaw = n; break }
          }
          let unit = ''
          for (const c of cols) {
            if (/^(db\/s|db|s|hz|db\/ms)$/i.test(c)) { unit = c; break }
          }
          const reverb = isNaN(reverbRaw) ? 0 : reverbRaw
          const dirtyReasons: string[] = []
          if (isNaN(reverbRaw)) dirtyReasons.push('数值解析失败')
          if (secondCol && secondCol !== dir && !parseFloat(secondCol) && unit !== secondCol) {
            // noop，只是检查
          }
          if (!/^(db\/s|db|s|hz|db\/ms)$/i.test(unit) && cols.length >= 4) dirtyReasons.push('未知单位')
          return {
            id: 'row_' + uid(),
            batchId,
            rawLine: line,
            timestamp: ts,
            direction: dir,
            reverb,
            unit,
            dirtyFlag: dirtyReasons.length > 0,
            dirtyReasons,
            directionSuspicious: false,
            directionImpact: '',
          }
        })

        const dirCounts: Record<string, number> = {}
        rows.slice(0, 20).forEach((r) => {
          dirCounts[r.direction] = (dirCounts[r.direction] || 0) + 1
        })
        const sortedDirs = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])
        const modeDir = sortedDirs[0]?.[0] || '+'
        const newAnomalies: AnomalyQueue[] = []

        rows.forEach((r, i) => {
          const oppositeMap: Record<string, string> = { '+': '-', '-': '+', N: 'S', S: 'N', E: 'W', W: 'E' }
          const isOpposite = oppositeMap[modeDir] === r.direction
          const diffFromMode = r.direction !== modeDir
          if (diffFromMode && (/^[+\-NSEW]$/.test(r.direction) || isOpposite)) {
            r.directionSuspicious = true
            const start = Math.max(0, i - 3)
            const end = Math.min(rows.length - 1, i + 3)
            r.directionImpact = `与众数方向 ${modeDir} 不一致${isOpposite ? '（疑似写反）' : ''}，影响 #${start + 1}~#${end + 1} 共 ${end - start + 1} 条`
            newAnomalies.push({
              id: 'an_' + uid(),
              rowId: r.id,
              type: 'direction',
              status: 'open',
              reason: `方向 ${r.direction} 与众数 ${modeDir} 不一致${isOpposite ? '（疑似写反）' : ''}`,
              impact: r.directionImpact,
              note: '',
              createdAt: now,
              updatedAt: now,
            })
          }
        })

        const newBatch: LogBatch = {
          id: batchId,
          source,
          createdAt: now,
          rawText,
          status: 'pending',
        }
        set({
          batches: [newBatch, ...get().batches],
          rows: [...rows, ...get().rows],
          anomalies: [...newAnomalies, ...get().anomalies],
          selectedBatchId: batchId,
        })
      },
      confirmDirection: (rowId) => {
        set({
          rows: get().rows.map((r) =>
            r.id === rowId ? { ...r, directionSuspicious: false, directionConfirmed: true } : r,
          ),
          anomalies: get().anomalies.map((a) =>
            a.type === 'direction' && a.rowId === rowId
              ? { ...a, status: 'confirmed' as AnomalyStatus, updatedAt: new Date().toISOString() }
              : a,
          ),
        })
      },
      ignoreDirection: (rowId) => {
        set({
          rows: get().rows.map((r) =>
            r.id === rowId ? { ...r, directionSuspicious: false, directionIgnored: true } : r,
          ),
          anomalies: get().anomalies.map((a) =>
            a.type === 'direction' && a.rowId === rowId
              ? { ...a, status: 'ignored' as AnomalyStatus, updatedAt: new Date().toISOString() }
              : a,
          ),
        })
      },
      runCompute: () => {
        const cfg = get().config
        const allRows = get().rows
        const rows = allRows.filter(
          (r) => !r.dirtyFlag && (!r.directionSuspicious || r.directionConfirmed),
        )
        const existingIds = new Set(get().computes.map((c) => c.rowId))
        const todo = rows.filter((r) => !existingIds.has(r.id))

        const batchRowIds = new Map<string, SensorRow[]>()
        for (const r of todo) {
          const arr = batchRowIds.get(r.batchId) || []
          arr.push(r)
          batchRowIds.set(r.batchId, arr)
        }

        const newComputes: ComputeRecord[] = []
        for (const [, rowsOfBatch] of batchRowIds) {
          const sorted = [...rowsOfBatch].sort((a, b) => a.timestamp - b.timestamp)
          for (const row of sorted) {
            const threshold = resolveThreshold(cfg, row.timestamp)
            const factor = getUnitFactor(row.unit || cfg.unit, cfg.unit)
            let computeStatus: ComputeRecord['status'] = 'success'
            let failCategory: ComputeRecord['failCategory'] | undefined
            let failNote: string | undefined
            let value = 0
            let result: ResultLevel = 'normal'
            let steps: ComputeStep[] = []

            if (!cfg.formulaVersion.trim()) {
              computeStatus = 'failed'
              failCategory = 'formula'
              failNote = '公式版本为空，请先在配置中填写公式版本号'
            } else if (!cfg.threshold && cfg.thresholdType === 'absolute') {
              computeStatus = 'failed'
              failCategory = 'threshold'
              failNote = '主阈值未设置或为 0'
            } else if (factor === null) {
              computeStatus = 'failed'
              failCategory = 'unit'
              failNote = `原始单位 "${row.unit}" 无法换算到目标单位 "${cfg.unit}"`
            } else {
              value = Math.abs(row.reverb * factor)
              const ratio = value / threshold
              if (ratio >= 1) result = 'critical'
              else if (ratio >= cfg.warningRatio) result = 'warning'
              steps = buildComputeSteps(
                row.reverb, row.unit, cfg.unit, cfg.formulaVersion,
                threshold, cfg.warningRatio, value, result, factor,
              )
            }

            newComputes.push({
              id: 'cmp_' + uid(),
              rowId: row.id,
              formulaVersion: cfg.formulaVersion,
              threshold,
              thresholdType: cfg.thresholdType,
              unit: cfg.unit,
              rawValue: row.reverb,
              computedValue: value,
              status: computeStatus,
              failCategory,
              failNote,
              result,
              computeSteps: steps,
            })
          }
        }

        const existingSorted = [...get().computes, ...newComputes]
          .map((c) => {
            const r = allRows.find((x) => x.id === c.rowId)
            return { c, ts: r?.timestamp || 0 }
          })
          .sort((a, b) => a.ts - b.ts)
          .map((x) => x.c)

        const jumpInfo = detectJump(existingSorted, 0.3)
        const finalComputes = existingComputes.map((c) => {
          const j = jumpInfo.get(c.id)
          if (!j) return c
          return { ...c, jumpCause: j.cause, jumpNote: j.note }
        })
        const finalNewComputes = newComputes.map((c) => {
          const j = jumpInfo.get(c.id)
          if (!j) return c
          return { ...c, jumpCause: j.cause, jumpNote: j.note }
        })

        const now = new Date().toISOString()
        const extraAnomalies: AnomalyQueue[] = []
        for (const c of finalNewComputes) {
          if (c.status === 'failed' && c.failCategory) {
            extraAnomalies.push({
              id: 'an_' + uid(),
              rowId: c.rowId,
              computeId: c.id,
              type: 'failed',
              status: 'open',
              reason: `卡壳：${c.failCategory === 'formula' ? '公式' : c.failCategory === 'unit' ? '单位' : '阈值'}问题`,
              impact: c.failNote || '该条结果缺失',
              note: '',
              createdAt: now,
              updatedAt: now,
            })
          }
          if (c.jumpCause) {
            extraAnomalies.push({
              id: 'an_' + uid(),
              rowId: c.rowId,
              computeId: c.id,
              type: 'jump',
              status: 'open',
              reason: `跳变检测：${
                c.jumpCause === 'thresholdChanged' ? '阈值变更'
                : c.jumpCause === 'unitChanged' ? '单位变更'
                : c.jumpCause === 'manualOverride' ? '人工改判'
                : '原始数据波动'
              }`,
              impact: c.jumpNote || '',
              note: '',
              createdAt: now,
              updatedAt: now,
            })
          }
        }

        set({
          computes: finalComputes,
          anomalies: [...extraAnomalies, ...get().anomalies],
        })

        return { ok: newComputes.length, skipped: rows.length - todo.length }
      },
      markFail: (computeId, category, note) => {
        const ts = new Date().toISOString()
        const compute = get().computes.find((c) => c.id === computeId)
        set({
          computes: get().computes.map((c) =>
            c.id === computeId
              ? { ...c, status: 'failed', failCategory: category, failNote: note, result: 'normal' }
              : c,
          ),
          anomalies: [
            {
              id: 'an_' + uid(),
              rowId: compute?.rowId || '',
              computeId,
              type: 'failed',
              status: 'open',
              reason: `卡壳：${category === 'formula' ? '公式' : category === 'unit' ? '单位' : '阈值'}问题`,
              impact: note || '该条结果缺失',
              note: '',
              createdAt: ts,
              updatedAt: ts,
            },
            ...get().anomalies,
          ],
        })
      },
      manualOverride: (computeId, result, reason, note, by = '小宋') => {
        const ts = new Date().toISOString()
        const compute = get().computes.find((c) => c.id === computeId)
        const originalResult = compute?.result
        set({
          computes: get().computes.map((c) =>
            c.id === computeId
              ? {
                  ...c,
                  status: 'manual',
                  originalResult: originalResult,
                  result,
                  manualReason: reason,
                  manualNote: note,
                  manualBy: by,
                  manualAt: ts,
                }
              : c,
          ),
          anomalies: [
            {
              id: 'an_' + uid(),
              rowId: compute?.rowId || '',
              computeId,
              type: 'manual',
              status: 'confirmed',
              reason: `人工改判 ${originalResult || ''} → ${result}`,
              impact: note,
              note: `操作人：${by}`,
              createdAt: ts,
              updatedAt: ts,
            },
            ...get().anomalies,
          ],
        })
      },
      updateAnomalyStatus: (anomalyId, status) => {
        set({
          anomalies: get().anomalies.map((a) =>
            a.id === anomalyId ? { ...a, status, updatedAt: new Date().toISOString() } : a,
          ),
        })
      },
      updateAnomalyNote: (anomalyId, note) => {
        set({
          anomalies: get().anomalies.map((a) =>
            a.id === anomalyId ? { ...a, note, updatedAt: new Date().toISOString() } : a,
          ),
        })
      },
      setRowNote: (rowId, note) => {
        set({ uiNotes: { ...get().uiNotes, [rowId]: note } })
      },
      setSelectedBatchId: (id) => set({ selectedBatchId: id }),
      setSelectedRowId: (id) => set({ selectedRowId: id }),
    }),
    {
      name: 'reverb-warning:v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)

export default useStore
