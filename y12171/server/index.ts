import express from 'express'
import cors from 'cors'
import * as XLSX from 'xlsx'
import { DataStore } from './data/DataStore'
import { DataProcessor } from './data/DataProcessor'
import { generateSampleData } from './data/SampleData'
import { RiskEngine } from './logic/RiskEngine'
import { VersionTracker } from './logic/VersionTracker'
import type {
  LedgerDashboardData,
  SamplePack,
  LicenseAgreement,
  TrackProject,
  SampleUsage
} from '../shared/types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const dataStore = new DataStore()
const dataProcessor = new DataProcessor()
const versionTracker = new VersionTracker()

const sampleData = generateSampleData()
dataStore.importAll(sampleData)

const riskEngine = new RiskEngine()
const initialRisks = riskEngine.generateAllRisks(
  dataStore.getSamplePacks(),
  dataStore.getLicenses(),
  dataStore.getTracks(),
  dataStore.getUsages()
)

versionTracker.createSnapshot(
  dataStore.getSamplePacks(),
  dataStore.getLicenses(),
  dataStore.getTracks(),
  dataStore.getUsages(),
  initialRisks,
  '初始数据导入'
)

function generateTimeline() {
  const timeline = []
  const packs = dataStore.getSamplePacks()
  const tracks = dataStore.getTracks()

  const allDates = new Set<string>()
  packs.forEach(p => allDates.add(p.purchaseDate.split('T')[0]))
  tracks.forEach(t => t.releaseDate && allDates.add(t.releaseDate))

  for (const date of Array.from(allDates).sort()) {
    timeline.push({
      date,
      purchases: packs.filter(p => p.purchaseDate.startsWith(date)).length,
      releases: tracks.filter(t => t.releaseDate?.startsWith(date)).length
    })
  }

  return timeline
}

function getDashboardData(): LedgerDashboardData {
  const samplePacks = dataStore.getSamplePacks()
  const licenses = dataStore.getLicenses()
  const tracks = dataStore.getTracks()
  const usages = dataStore.getUsages()

  const risks = riskEngine.generateAllRisks(samplePacks, licenses, tracks, usages)
  const expiringLicenses = riskEngine.getExpiringLicensesList(licenses, samplePacks)
  const nameConflicts = riskEngine.detectNameConflicts(samplePacks)
  const dataQualityIssues = dataProcessor.getIssues()

  return {
    summary: {
      totalPacks: samplePacks.length,
      totalLicenses: licenses.length,
      activeTracks: tracks.filter(t => t.status !== 'archived').length,
      totalCost: samplePacks.reduce((sum, p) => sum + p.cost, 0)
    },
    risks,
    expiringLicenses,
    nameConflicts,
    dataQualityIssues,
    timeline: generateTimeline(),
    versionHistory: versionTracker.getSnapshots()
  }
}

app.get('/api/dashboard', (req, res) => {
  res.json(getDashboardData())
})

app.get('/api/sample-packs', (req, res) => {
  res.json(dataStore.getSamplePacks())
})

app.get('/api/sample-packs/:id', (req, res) => {
  const pack = dataStore.getSamplePack(req.params.id)
  if (!pack) return res.status(404).json({ error: 'Not found' })
  res.json(pack)
})

app.post('/api/sample-packs', (req, res) => {
  const cleaned = dataProcessor.cleanSamplePack(req.body)
  dataStore.addSamplePack(cleaned)
  res.status(201).json(cleaned)
})

app.put('/api/sample-packs/:id', (req, res) => {
  const updated = dataStore.updateSamplePack(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.get('/api/licenses', (req, res) => {
  res.json(dataStore.getLicenses())
})

app.get('/api/licenses/:id', (req, res) => {
  const license = dataStore.getLicense(req.params.id)
  if (!license) return res.status(404).json({ error: 'Not found' })
  res.json(license)
})

app.post('/api/licenses', (req, res) => {
  const cleaned = dataProcessor.cleanLicenseAgreement(req.body)
  dataStore.addLicense(cleaned)
  res.status(201).json(cleaned)
})

app.put('/api/licenses/:id', (req, res) => {
  const updated = dataStore.updateLicense(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Not found' })

  const risks = riskEngine.generateAllRisks(
    dataStore.getSamplePacks(),
    dataStore.getLicenses(),
    dataStore.getTracks(),
    dataStore.getUsages()
  )
  versionTracker.createSnapshot(
    dataStore.getSamplePacks(),
    dataStore.getLicenses(),
    dataStore.getTracks(),
    dataStore.getUsages(),
    risks,
    `更新授权协议: ${updated.licenseName}`
  )

  res.json(updated)
})

app.get('/api/tracks', (req, res) => {
  res.json(dataStore.getTracks())
})

app.get('/api/tracks/:id', (req, res) => {
  const track = dataStore.getTrack(req.params.id)
  if (!track) return res.status(404).json({ error: 'Not found' })
  res.json(track)
})

app.post('/api/tracks', (req, res) => {
  const cleaned = dataProcessor.cleanTrackProject(req.body)
  dataStore.addTrack(cleaned)
  res.status(201).json(cleaned)
})

app.put('/api/tracks/:id', (req, res) => {
  const updated = dataStore.updateTrack(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.get('/api/usages', (req, res) => {
  res.json(dataStore.getUsages())
})

app.get('/api/versions', (req, res) => {
  res.json(versionTracker.getSnapshots())
})

app.get('/api/versions/compare', (req, res) => {
  const { from, to } = req.query
  if (typeof from !== 'string' || typeof to !== 'string') {
    return res.status(400).json({ error: 'Missing from or to parameters' })
  }
  const diff = versionTracker.compareVersions(from, to)
  if (!diff) return res.status(404).json({ error: 'Snapshot not found' })
  res.json(diff)
})

app.get('/api/export/json', (req, res) => {
  const data = dataStore.exportAll()
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="license-ledger.json"')
  res.json(data)
})

app.get('/api/export/excel', (req, res) => {
  const data = dataStore.exportAll()

  const wb = XLSX.utils.book_new()

  const packSheet = XLSX.utils.json_to_sheet(data.samplePacks.map(p => ({
    '采样包名称': p.name,
    '供应商': p.vendor,
    '购买日期': p.purchaseDate,
    '价格': p.cost,
    '文件数量': p.fileCount,
    '标签': p.tags.join(', '),
    '备注': p.notes || ''
  })))
  XLSX.utils.book_append_sheet(wb, packSheet, '采样包')

  const licSheet = XLSX.utils.json_to_sheet(data.licenses.map(l => {
    const pack = data.samplePacks.find(p => p.id === l.samplePackId)
    return {
      '采样包': pack?.name || '未知',
      '授权名称': l.licenseName,
      '授权类型': l.licenseType,
      '生效日期': l.validFrom,
      '到期日期': l.validUntil || '永久',
      '是否永久': l.isPerpetual ? '是' : '否',
      '允许用途': l.allowedUses.join(', '),
      '限制条款': l.restrictions.join(', '),
      '需要署名': l.attributionRequired ? '是' : '否'
    }
  }))
  XLSX.utils.book_append_sheet(wb, licSheet, '授权协议')

  const trackSheet = XLSX.utils.json_to_sheet(data.tracks.map(t => ({
    '曲目名称': t.name,
    '艺术家': t.artist,
    '专辑': t.album || '',
    '发行日期': t.releaseDate || '',
    '状态': t.status
  })))
  XLSX.utils.book_append_sheet(wb, trackSheet, '曲目项目')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="license-ledger.xlsx"')
  res.send(buffer)
})

app.post('/api/snapshot', (req, res) => {
  const { description } = req.body
  const risks = riskEngine.generateAllRisks(
    dataStore.getSamplePacks(),
    dataStore.getLicenses(),
    dataStore.getTracks(),
    dataStore.getUsages()
  )
  const snapshot = versionTracker.createSnapshot(
    dataStore.getSamplePacks(),
    dataStore.getLicenses(),
    dataStore.getTracks(),
    dataStore.getUsages(),
    risks,
    description || '手动快照'
  )
  res.json(snapshot)
})

app.post('/api/validate-license', (req, res) => {
  const { licenseId } = req.body
  const license = dataStore.getLicense(licenseId)
  if (!license) return res.status(404).json({ error: 'License not found' })
  const pack = dataStore.getSamplePack(license.samplePackId)
  if (!pack) return res.status(404).json({ error: 'Sample pack not found' })
  const result = riskEngine.validateLicense(license, pack)
  res.json(result)
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})
