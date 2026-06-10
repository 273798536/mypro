import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type {
  ReagentLot,
  SamplingSite,
  Sample,
  AnalysisRun,
  Band,
  ReviewLog,
  DiffRow,
  GroupStats,
  DiffReport,
  TimelineNode,
  ExportOptions,
  ExportPreview,
  DemoCase,
  ReviewStepProgress,
  LotStats,
} from '../../shared/types/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../data')

const FILES = {
  lots: 'reagent_lots.json',
  samples: 'samples.json',
  bands: 'bands.json',
  runs: 'analysis_runs.json',
  logs: 'review_logs.json',
  sites: 'sampling_sites.json',
  cases: 'bad_data_cases.json',
} as const

type CacheMap = {
  lots: ReagentLot[]
  samples: Sample[]
  bands: Band[]
  runs: AnalysisRun[]
  logs: ReviewLog[]
  sites: SamplingSite[]
  cases: DemoCase[]
}

const cache: Partial<CacheMap> = {}

async function readJSON<K extends keyof CacheMap>(name: K): Promise<CacheMap[K]> {
  if (cache[name]) return cache[name] as CacheMap[K]
  const filePath = path.join(DATA_DIR, FILES[name])
  const raw = await readFile(filePath, 'utf-8')
  const data = JSON.parse(raw) as CacheMap[K]
  cache[name] = data
  return data
}

async function writeJSON<K extends keyof CacheMap>(name: K, data: CacheMap[K]): Promise<void> {
  cache[name] = data
  const filePath = path.join(DATA_DIR, FILES[name])
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function invalidateCache(): void {
  Object.keys(cache).forEach((k) => delete cache[k as keyof CacheMap])
}

const getLots = () => readJSON('lots')
const getSamples = () => readJSON('samples')
const getBands = () => readJSON('bands')
const getRuns = () => readJSON('runs')
const getLogs = () => readJSON('logs')
const getSites = () => readJSON('sites')
const getCases = () => readJSON('cases')

function calcGroupStats(bands: Band[]): GroupStats[] {
  const map = new Map<string, number>()
  for (const b of bands) {
    map.set(b.label_category, (map.get(b.label_category) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([category, count]) => ({ category, count_before: 0, count_after: count }))
}

function mergeGroupStats(before: GroupStats[], after: GroupStats[]): { before: GroupStats[]; after: GroupStats[] } {
  const keys = new Set<string>()
  before.forEach((s) => keys.add(s.category))
  after.forEach((s) => keys.add(s.category))
  const bMap = new Map(before.map((s) => [s.category, s.count_after]))
  const aMap = new Map(after.map((s) => [s.category, s.count_after]))
  const bResult: GroupStats[] = []
  const aResult: GroupStats[] = []
  for (const k of keys) {
    const cb = bMap.get(k) ?? 0
    const ca = aMap.get(k) ?? 0
    bResult.push({ category: k, count_before: 0, count_after: cb })
    aResult.push({ category: k, count_before: 0, count_after: ca })
  }
  return { before: bResult, after: aResult }
}

async function getLotStats(): Promise<LotStats[]> {
  const [lots, samples, bands] = await Promise.all([getLots(), getSamples(), getBands()])
  return lots.map((lot) => {
    const lotSamples = samples.filter((s) => s.lot_id === lot.id)
    const sampleIds = new Set(lotSamples.map((s) => s.id))
    const lotBands = bands.filter((b) => sampleIds.has(b.sample_id))
    const bandCount = lotBands.length
    const avgQuality = bandCount
      ? lotBands.reduce((sum, b) => sum + b.quality_score, 0) / bandCount
      : 0
    const pendingCount = lotBands.filter((b) => b.confirm_status === 'pending').length
    const anomalyCount = lotBands.filter(
      (b) => b.label_category === 'smear' || b.label_category === 'missing' || b.needs_supplement
    ).length
    return {
      lot_id: lot.id,
      lot_number: lot.lot_number,
      sample_count: lotSamples.length,
      band_count: bandCount,
      avg_quality: Math.round(avgQuality * 100) / 100,
      pending_count: pendingCount,
      anomaly_count: anomalyCount,
    }
  })
}

async function getBandsByLotId(lotId: string): Promise<Band[]> {
  const [samples, bands] = await Promise.all([getSamples(), getBands()])
  const sampleIds = new Set(samples.filter((s) => s.lot_id === lotId).map((s) => s.id))
  return bands.filter((b) => sampleIds.has(b.sample_id))
}

async function getSamplesByLotId(lotId: string): Promise<Sample[]> {
  const samples = await getSamples()
  return samples.filter((s) => s.lot_id === lotId)
}

async function getRunsByLotId(lotId: string): Promise<AnalysisRun[]> {
  const runs = await getRuns()
  return runs.filter((r) => r.lot_id === lotId).sort((a, b) => a.run_index - b.run_index)
}

async function getTimelineByLotId(lotId: string): Promise<TimelineNode[]> {
  const [runs, samples, bands] = await Promise.all([getRuns(), getSamples(), getBands()])
  const lotSamples = samples.filter((s) => s.lot_id === lotId)
  const sampleIds = new Set(lotSamples.map((s) => s.id))
  const lotRuns = runs.filter((r) => r.lot_id === lotId).sort((a, b) => a.run_index - b.run_index)
  const runBandMap = new Map<string, number>()
  for (const b of bands) {
    if (sampleIds.has(b.sample_id)) {
      runBandMap.set(b.run_id, (runBandMap.get(b.run_id) ?? 0) + 1)
    }
  }
  return lotRuns.map((r) => {
    const count = runBandMap.get(r.id) ?? 0
    const summary = `第${r.run_index}轮分析 · ${count}条条带 · 算法${r.algorithm_version}`
    return {
      run_id: r.id,
      run_index: r.run_index,
      algorithm_version: r.algorithm_version,
      executed_at: r.executed_at,
      operator: r.operator,
      summary,
      band_count: count,
    }
  })
}

function getSampleCodeMap(samples: Sample[]): Map<string, string> {
  return new Map(samples.map((s) => [s.id, s.sample_code]))
}

async function compareLots(oldId: string, newId: string): Promise<DiffReport> {
  const [allSamples, allBands, allRuns] = await Promise.all([getSamples(), getBands(), getRuns()])
  const samples = allSamples.filter((s) => s.lot_id === oldId || s.lot_id === newId)
  const sampleIds = new Set(samples.map((s) => s.id))
  const sampleCodeMap = getSampleCodeMap(allSamples)

  const oldRuns = allRuns.filter((r) => r.lot_id === oldId).sort((a, b) => a.run_index - b.run_index)
  const newRuns = allRuns.filter((r) => r.lot_id === newId).sort((a, b) => a.run_index - b.run_index)
  const oldRun = oldRuns[oldRuns.length - 1]
  const newRun = newRuns[newRuns.length - 1]

  const oldBands = allBands.filter((b) => sampleIds.has(b.sample_id) && b.run_id === oldRun.id)
  const newBands = allBands.filter((b) => sampleIds.has(b.sample_id) && b.run_id === newRun.id)

  const rows: DiffRow[] = []
  const keyFn = (b: Band) => `${b.sample_id}-${b.molecular_weight_kda}`
  const oldMap = new Map(oldBands.map((b) => [keyFn(b), b]))
  const newMap = new Map(newBands.map((b) => [keyFn(b), b]))

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()])
  for (const key of allKeys) {
    const ob = oldMap.get(key)
    const nb = newMap.get(key)
    const sampleCode = (ob ?? nb) ? sampleCodeMap.get((ob ?? nb)!.sample_id) ?? '' : ''
    if (ob && nb) {
      if (ob.label_category !== nb.label_category) {
        const severity: DiffRow['severity'] =
          nb.label_category === 'smear' || nb.label_category === 'missing' ? 'danger' :
          ob.label_category === 'smear' || ob.label_category === 'missing' ? 'warning' : 'info'
        rows.push({
          band_id: nb.id,
          sample_code: sampleCode,
          field_name: 'label_category',
          old_value: ob.label_category,
          new_value: nb.label_category,
          severity,
        })
      }
      if (Math.abs(ob.quality_score - nb.quality_score) >= 5) {
        const diff = nb.quality_score - ob.quality_score
        rows.push({
          band_id: nb.id,
          sample_code: sampleCode,
          field_name: 'quality_score',
          old_value: ob.quality_score,
          new_value: nb.quality_score,
          severity: diff < 0 ? 'warning' : 'info',
        })
      }
    }
  }

  const statsBefore = calcGroupStats(oldBands)
  const statsAfter = calcGroupStats(newBands)
  const { before, after } = mergeGroupStats(statsBefore, statsAfter)

  return {
    lot_id: newId,
    old_run_id: oldRun.id,
    new_run_id: newRun.id,
    total_changed: rows.length,
    rows,
    group_stats_before: before,
    group_stats_after: after,
  }
}

async function triggerDiffRun(
  lotId: string,
  params: Record<string, unknown> = {}
): Promise<DiffReport> {
  const [allSamples, allBands, allRuns, allLogs] = await Promise.all([
    getSamples(), getBands(), getRuns(), getLogs()
  ])
  const samples = allSamples.filter((s) => s.lot_id === lotId)
  const sampleIds = new Set(samples.map((s) => s.id))
  const sampleCodeMap = getSampleCodeMap(allSamples)

  const lotRuns = allRuns.filter((r) => r.lot_id === lotId).sort((a, b) => a.run_index - b.run_index)
  const lastRun = lotRuns[lotRuns.length - 1]
  const lastBands = allBands.filter((b) => sampleIds.has(b.sample_id) && b.run_id === lastRun.id)

  const newRunIndex = lastRun.run_index + 1
  const newRunId = `RUN${String(allRuns.length + 1).padStart(3, '0')}`
  const newRun: AnalysisRun = {
    id: newRunId,
    lot_id: lotId,
    run_index: newRunIndex,
    algorithm_version: params.algorithm_version as string ?? 'v2.0',
    executed_at: new Date().toISOString(),
    operator: params.operator as string ?? 'system',
    parameters: params,
  }

  const categories: Band['label_category'][] = ['target', 'nonspecific', 'smear', 'missing']
  const totalChange = Math.max(1, Math.floor(lastBands.length * (0.1 + Math.random() * 0.05)))
  const indices = [...lastBands.keys()].sort(() => Math.random() - 0.5).slice(0, totalChange)
  const changeSet = new Set(indices)

  const newBands: Band[] = lastBands.map((b, i) => {
    const nb: Band = { ...b }
    nb.id = `BND${String(allBands.length + i + 1).padStart(3, '0')}`
    nb.run_id = newRunId
    nb.confirm_status = 'pending'
    delete nb.reviewer
    delete nb.confirmed_at
    delete nb.reject_reason
    if (changeSet.has(i)) {
      const currentIdx = categories.indexOf(b.label_category)
      let newIdx
      do { newIdx = Math.floor(Math.random() * categories.length) } while (newIdx === currentIdx)
      nb.label_category = categories[newIdx]
      const delta = Math.round((Math.random() * 16 - 8) * 10) / 10
      nb.quality_score = Math.max(0, Math.min(100, Math.round((b.quality_score + delta) * 10) / 10))
    }
    return nb
  })

  const rows: DiffRow[] = []
  for (let i = 0; i < lastBands.length; i++) {
    const ob = lastBands[i]
    const nb = newBands[i]
    const sampleCode = sampleCodeMap.get(ob.sample_id) ?? ''
    if (ob.label_category !== nb.label_category) {
      const severity: DiffRow['severity'] =
        nb.label_category === 'smear' || nb.label_category === 'missing' ? 'danger' :
        ob.label_category === 'smear' || ob.label_category === 'missing' ? 'warning' : 'info'
      rows.push({
        band_id: nb.id,
        sample_code: sampleCode,
        field_name: 'label_category',
        old_value: ob.label_category,
        new_value: nb.label_category,
        severity,
      })
    }
    if (Math.abs(ob.quality_score - nb.quality_score) >= 1) {
      const diff = nb.quality_score - ob.quality_score
      rows.push({
        band_id: nb.id,
        sample_code: sampleCode,
        field_name: 'quality_score',
        old_value: ob.quality_score,
        new_value: nb.quality_score,
        severity: diff < -3 ? 'warning' : 'info',
      })
    }
  }

  const updatedRuns = [...allRuns, newRun]
  const updatedBands = [...allBands, ...newBands]
  await Promise.all([writeJSON('runs', updatedRuns), writeJSON('bands', updatedBands)])

  const statsBefore = calcGroupStats(lastBands)
  const statsAfter = calcGroupStats(newBands)
  const { before, after } = mergeGroupStats(statsBefore, statsAfter)

  void allLogs

  return {
    lot_id: lotId,
    old_run_id: lastRun.id,
    new_run_id: newRunId,
    total_changed: rows.length,
    rows,
    group_stats_before: before,
    group_stats_after: after,
  }
}

async function supplementBand(
  bandId: string,
  fields: Record<string, unknown>
): Promise<Band> {
  const bands = await getBands()
  const idx = bands.findIndex((b) => b.id === bandId)
  if (idx === -1) throw new Error(`Band ${bandId} not found`)
  const band = { ...bands[idx] }
  band.needs_supplement = false
  band.confirm_status = 'pending'
  band.supplement_fields = { ...(band.supplement_fields ?? {}), ...fields }
  bands[idx] = band
  await writeJSON('bands', bands)
  return band
}

async function confirmBand(
  bandId: string,
  pass: boolean,
  comment: string,
  operator: string
): Promise<{ band: Band; log: ReviewLog }> {
  const [bands, logs] = await Promise.all([getBands(), getLogs()])
  const idx = bands.findIndex((b) => b.id === bandId)
  if (idx === -1) throw new Error(`Band ${bandId} not found`)
  const band = { ...bands[idx] }
  const oldStatus = band.confirm_status
  if (pass) {
    band.confirm_status = 'confirmed'
    band.human_confirmed = true
    band.reviewer = operator
    band.confirmed_at = new Date().toISOString()
    delete band.reject_reason
  } else {
    band.confirm_status = 'rejected'
    band.human_confirmed = true
    band.reviewer = operator
    band.confirmed_at = new Date().toISOString()
    band.reject_reason = comment
  }
  bands[idx] = band

  const log: ReviewLog = {
    id: `LOG${String(logs.length + 1).padStart(3, '0')}`,
    band_id: bandId,
    action: pass ? 'confirm' : 'reject',
    operator,
    created_at: new Date().toISOString(),
    old_value: oldStatus,
    new_value: band.confirm_status,
    comment,
  }
  logs.push(log)

  await Promise.all([writeJSON('bands', bands), writeJSON('logs', logs)])
  return { band, log }
}

async function getGroupStats(lotId: string): Promise<GroupStats[]> {
  const [samples, bands, runs] = await Promise.all([getSamples(), getBands(), getRuns()])
  const lotSamples = samples.filter((s) => s.lot_id === lotId)
  const sampleIds = new Set(lotSamples.map((s) => s.id))
  const lotRuns = runs.filter((r) => r.lot_id === lotId).sort((a, b) => a.run_index - b.run_index)
  if (lotRuns.length < 2) {
    const currentBands = bands.filter((b) => sampleIds.has(b.sample_id))
    return calcGroupStats(currentBands).map((s) => ({
      category: s.category,
      count_before: 0,
      count_after: s.count_after,
    }))
  }
  const prevRun = lotRuns[lotRuns.length - 2]
  const currRun = lotRuns[lotRuns.length - 1]
  const prevBands = bands.filter((b) => sampleIds.has(b.sample_id) && b.run_id === prevRun.id)
  const currBands = bands.filter((b) => sampleIds.has(b.sample_id) && b.run_id === currRun.id)
  const keys = new Set<string>()
  const prevMap = new Map<string, number>()
  const currMap = new Map<string, number>()
  for (const b of prevBands) {
    prevMap.set(b.label_category, (prevMap.get(b.label_category) ?? 0) + 1)
    keys.add(b.label_category)
  }
  for (const b of currBands) {
    currMap.set(b.label_category, (currMap.get(b.label_category) ?? 0) + 1)
    keys.add(b.label_category)
  }
  return Array.from(keys).map((k) => ({
    category: k,
    count_before: prevMap.get(k) ?? 0,
    count_after: currMap.get(k) ?? 0,
  }))
}

async function getStepProgress(): Promise<ReviewStepProgress[]> {
  const [lots, samples, bands, runs] = await Promise.all([getLots(), getSamples(), getBands(), getRuns()])

  const lotRunCounts = new Map<string, number>()
  for (const r of runs) {
    lotRunCounts.set(r.lot_id, (lotRunCounts.get(r.lot_id) ?? 0) + 1)
  }
  const totalLots = lots.length
  const lotsWithRuns = Array.from(lotRunCounts.values()).filter((c) => c >= 2).length
  const step1: ReviewStepProgress = {
    step: 1,
    name: '重复运行',
    total: totalLots,
    done: lotsWithRuns,
    percent: totalLots ? Math.round((lotsWithRuns / totalLots) * 100) : 0,
  }

  const totalNeedSupplement = bands.filter((b) => b.needs_supplement).length
  const supplemented = bands.filter((b) => b.supplement_fields && Object.keys(b.supplement_fields).length > 0 && !b.needs_supplement).length
  const step2: ReviewStepProgress = {
    step: 2,
    name: '补录',
    total: totalNeedSupplement + supplemented,
    done: supplemented,
    percent: totalNeedSupplement + supplemented
      ? Math.round((supplemented / (totalNeedSupplement + supplemented)) * 100)
      : 0,
  }

  const totalPending = bands.filter((b) => b.confirm_status === 'pending').length
  const totalBands = bands.length
  const confirmed = bands.filter((b) => b.confirm_status !== 'pending').length
  const step3: ReviewStepProgress = {
    step: 3,
    name: '人工确认',
    total: totalBands,
    done: confirmed,
    percent: totalBands ? Math.round((confirmed / totalBands) * 100) : 0,
  }

  void samples
  void totalPending

  return [step1, step2, step3]
}

function collectExportBands(
  lots: ReagentLot[],
  samples: Sample[],
  sites: SamplingSite[],
  bands: Band[],
  lotIds: string[]
): Array<Record<string, unknown>> {
  const filteredLots = lotIds.length ? lots.filter((l) => lotIds.includes(l.id)) : lots
  const lotMap = new Map(filteredLots.map((l) => [l.id, l]))
  const filteredSamples = samples.filter((s) => lotMap.has(s.lot_id))
  const sampleMap = new Map(filteredSamples.map((s) => [s.id, s]))
  const siteMap = new Map(sites.map((s) => [s.id, s]))
  const filteredBands = bands.filter((b) => sampleMap.has(b.sample_id))

  return filteredBands.map((b) => {
    const s = sampleMap.get(b.sample_id)!
    const l = lotMap.get(s.lot_id)!
    const site = siteMap.get(s.sampling_site_id)
    return {
      lot_id: l.id,
      lot_number: l.lot_number,
      reagent_name: l.reagent_name,
      sample_id: s.id,
      sample_code: s.sample_code,
      sampling_site: site?.name ?? '',
      collection_date: s.collection_date,
      band_id: b.id,
      run_id: b.run_id,
      position_mm: b.position_mm,
      molecular_weight_kda: b.molecular_weight_kda,
      gray_value: b.gray_value,
      quality_score: b.quality_score,
      label: b.label ?? '',
      label_category: b.label_category,
      confirm_status: b.confirm_status,
      reviewer: b.reviewer ?? '',
      confirmed_at: b.confirmed_at ?? '',
    }
  })
}

async function getExportPreview(opts: ExportOptions): Promise<ExportPreview> {
  const [lots, samples, sites, bands] = await Promise.all([
    getLots(), getSamples(), getSites(), getBands()
  ])
  const rows = collectExportBands(lots, samples, sites, bands, opts.lot_ids)
  const fields = rows.length ? Object.keys(rows[0]) : []
  const filteredLotNumbers = opts.lot_ids.length
    ? lots.filter((l) => opts.lot_ids.includes(l.id)).map((l) => l.lot_number)
    : lots.map((l) => l.lot_number)
  const lot_range = filteredLotNumbers.length
    ? `${filteredLotNumbers[0]} ~ ${filteredLotNumbers[filteredLotNumbers.length - 1]}`
    : ''
  const sampleCount = new Set(rows.map((r) => r.sample_id)).size
  return {
    row_count: rows.length,
    fields,
    lot_range,
    sample_count: sampleCount,
  }
}

async function generateExport(
  opts: ExportOptions
): Promise<{ csv: string; json: unknown }> {
  const [lots, samples, sites, bands] = await Promise.all([
    getLots(), getSamples(), getSites(), getBands()
  ])
  const rows = collectExportBands(lots, samples, sites, bands, opts.lot_ids)
  const fields = rows.length ? Object.keys(rows[0]) : []

  const json = rows

  let csv = ''
  if (fields.length) {
    csv += fields.join(',') + '\n'
    for (const row of rows) {
      csv += fields
        .map((f) => {
          const v = row[f]
          const s = v === null || v === undefined ? '' : String(v)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(',') + '\n'
    }
  }

  return { csv, json }
}

async function loadDemoCase(caseId: string): Promise<number> {
  const cases = await getCases()
  const demoCase = cases.find((c) => c.id === caseId)
  if (!demoCase) throw new Error(`Case ${caseId} not found`)

  let affectedCount = 0
  const [bands, samples] = await Promise.all([getBands(), getSamples()])

  const newBands = bands.map((b) => ({ ...b }))
  const newSamples = samples.map((s) => ({ ...s }))

  if (caseId === 'BAD001') {
    const targetSamples = ['SMP002', 'SMP003', 'SMP006']
    const positions = [67, 71, 74, 78]
    const labels = ['BAD001-异常条带1', 'BAD001-异常条带2', 'BAD001-异常条带3', 'BAD001-异常条带4']
    let bandCounter = 0
    for (const sid of targetSamples) {
      for (let i = 0; i < 4; i++) {
        const idx = newBands.findIndex((b) => b.sample_id === sid && b.position_mm === positions[i])
        if (idx !== -1) {
          newBands[idx].label_category = 'smear'
          newBands[idx].quality_score = 18 + Math.floor(Math.random() * 12)
          newBands[idx].gray_value = 88 + i * 42
          newBands[idx].label = labels[i]
          newBands[idx].confirm_status = 'pending'
          delete newBands[idx].reviewer
          delete newBands[idx].confirmed_at
          delete newBands[idx].reject_reason
          affectedCount++
          bandCounter++
        }
      }
    }
    for (const sid of targetSamples) {
      const sIdx = newSamples.findIndex((s) => s.id === sid)
      if (sIdx !== -1) {
        newSamples[sIdx].is_abnormal = true
        affectedCount++
      }
    }
    void bandCounter
  } else if (caseId === 'BAD002') {
    const targets = [
      { sid: 'SMP011', positions: [30, 50] },
      { sid: 'SMP014', positions: [32, 48] },
    ]
    for (const { sid, positions } of targets) {
      for (const pos of positions) {
        const idx = newBands.findIndex((b) => b.sample_id === sid && b.position_mm === pos)
        if (idx !== -1) {
          newBands[idx].label_category = 'missing'
          newBands[idx].gray_value = 258 + Math.floor(Math.random() * 20)
          newBands[idx].quality_score = 25 + Math.floor(Math.random() * 10)
          newBands[idx].confirm_status = 'pending'
          delete newBands[idx].reviewer
          delete newBands[idx].confirmed_at
          delete newBands[idx].reject_reason
          affectedCount++
        }
      }
    }
  } else if (caseId === 'BAD004') {
    const targetSamples = ['SMP025', 'SMP026', 'SMP027', 'SMP029', 'SMP031']
    for (const sid of targetSamples) {
      const idx = newBands.findIndex(
        (b) => b.sample_id === sid && b.molecular_weight_kda === 45
      )
      if (idx !== -1) {
        newBands[idx].label_category = 'missing'
        newBands[idx].gray_value = 0
        newBands[idx].quality_score = 10 + Math.floor(Math.random() * 8)
        newBands[idx].needs_supplement = true
        newBands[idx].confirm_status = 'pending'
        newBands[idx].supplement_fields = { expected_mw: 45, detected: false }
        delete newBands[idx].reviewer
        delete newBands[idx].confirmed_at
        delete newBands[idx].reject_reason
        affectedCount++
      }
    }
    for (const sid of targetSamples) {
      const sIdx = newSamples.findIndex((s) => s.id === sid)
      if (sIdx !== -1) {
        newSamples[sIdx].is_abnormal = true
        affectedCount++
      }
    }
  } else if (caseId === 'BAD005') {
    const lot5Samples = newSamples.filter((s) => s.lot_id === 'LOT005')
    for (const s of lot5Samples) {
      const idx = newSamples.findIndex((x) => x.id === s.id)
      if (idx !== -1) {
        newSamples[idx].sampling_site_id = ''
        affectedCount++
      }
    }
  } else if (caseId === 'BAD006') {
    const targets = [
      { sid: 'SMP009', mw: 55, label: 'BAD006-Tubulin-β误判' },
      { sid: 'SMP010', mw: 33, label: 'BAD006-GAPDH误判' },
      { sid: 'SMP012', mw: 38, label: 'BAD006-Actin误判' },
      { sid: 'SMP016', mw: 31, label: 'BAD006-Annexin误判' },
    ]
    for (const { sid, mw, label } of targets) {
      const idx = newBands.findIndex(
        (b) => b.sample_id === sid && b.label_category === 'nonspecific' && Math.abs(b.molecular_weight_kda - mw) <= 3
      )
      if (idx !== -1) {
        newBands[idx].label_category = 'target'
        newBands[idx].label = label
        newBands[idx].confirm_status = 'pending'
        delete newBands[idx].reviewer
        delete newBands[idx].confirmed_at
        delete newBands[idx].reject_reason
        affectedCount++
      } else {
        const idx2 = newBands.findIndex(
          (b) => b.sample_id === sid && Math.abs(b.molecular_weight_kda - mw) <= 5
        )
        if (idx2 !== -1) {
          newBands[idx2].label_category = 'nonspecific'
          newBands[idx2].label = label
          newBands[idx2].confirm_status = 'pending'
          delete newBands[idx2].reviewer
          delete newBands[idx2].confirmed_at
          delete newBands[idx2].reject_reason
          affectedCount++
        }
      }
    }
  } else {
    affectedCount = demoCase.band_count
  }

  await Promise.all([writeJSON('bands', newBands), writeJSON('samples', newSamples)])
  return affectedCount
}

export {
  readJSON,
  writeJSON,
  invalidateCache,
  getLots,
  getSamples,
  getBands,
  getRuns,
  getLogs,
  getSites,
  getCases,
  getLotStats,
  getBandsByLotId,
  getSamplesByLotId,
  getRunsByLotId,
  getTimelineByLotId,
  compareLots,
  triggerDiffRun,
  supplementBand,
  confirmBand,
  getGroupStats,
  getStepProgress,
  getExportPreview,
  generateExport,
  loadDemoCase,
}
