const express = require('express')
const cors = require('cors')
const { STAGES, annotationRecords, importBatches, generateMockData } = require('./data')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/stages', (req, res) => {
  res.json({ stages: STAGES })
})

app.get('/api/records', (req, res) => {
  const { 
    stage, reviewStatus, sampleName, hasAnomaly, isBoundary, 
    page = 1, pageSize = 20, sortBy = 'originalRow', sortOrder = 'asc'
  } = req.query

  let filtered = [...annotationRecords]

  if (stage) filtered = filtered.filter(r => r.stage === stage)
  if (reviewStatus) filtered = filtered.filter(r => r.reviewStatus === reviewStatus)
  if (sampleName) filtered = filtered.filter(r => r.sampleName.includes(sampleName))
  if (hasAnomaly === 'true') filtered = filtered.filter(r => r.hasAnomaly)
  if (isBoundary === 'true') filtered = filtered.filter(r => r.isBoundary)

  filtered.sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })

  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + parseInt(pageSize))

  res.json({ data, total, page: parseInt(page), pageSize: parseInt(pageSize) })
})

app.get('/api/records/:id', (req, res) => {
  const record = annotationRecords.find(r => r.id === req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })
  res.json({ record })
})

app.put('/api/records/:id', (req, res) => {
  const idx = annotationRecords.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: '记录不存在' })

  annotationRecords[idx] = { ...annotationRecords[idx], ...req.body }
  res.json({ record: annotationRecords[idx] })
})

app.put('/api/records/:id/review', (req, res) => {
  const idx = annotationRecords.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: '记录不存在' })

  const { reviewStatus, reviewer, reviewComment, finalStage, finalStageName } = req.body
  const record = annotationRecords[idx]

  record.reviewStatus = reviewStatus || record.reviewStatus
  record.reviewer = reviewer || record.reviewer
  record.reviewComment = reviewComment || record.reviewComment
  record.reviewTime = new Date().toLocaleString('zh-CN')
  record.finalStage = finalStage || record.finalStage
  record.finalStageName = finalStageName || record.finalStageName

  if (finalStage) {
    const stageInfo = STAGES.find(s => s.id === finalStage)
    if (stageInfo) {
      record.finalStageName = stageInfo.name
    }
  }

  res.json({ record })
})

app.post('/api/records/batch-review', (req, res) => {
  const { ids, reviewStatus, reviewer, reviewComment } = req.body
  const updated = []

  ids.forEach(id => {
    const idx = annotationRecords.findIndex(r => r.id === id)
    if (idx !== -1) {
      annotationRecords[idx].reviewStatus = reviewStatus
      annotationRecords[idx].reviewer = reviewer
      annotationRecords[idx].reviewComment = reviewComment
      annotationRecords[idx].reviewTime = new Date().toLocaleString('zh-CN')
      updated.push(annotationRecords[idx])
    }
  })

  res.json({ updated: updated.length, records: updated })
})

app.get('/api/statistics', (req, res) => {
  const stageStats = {}
  STAGES.forEach(s => {
    stageStats[s.id] = { stage: s.id, stageName: s.name, count: 0, approved: 0, pending: 0, anomaly: 0 }
  })

  annotationRecords.forEach(r => {
    if (stageStats[r.stage]) {
      stageStats[r.stage].count++
      if (r.reviewStatus === 'approved') stageStats[r.stage].approved++
      if (r.reviewStatus === 'pending_review' || r.reviewStatus === 'rejected') stageStats[r.stage].pending++
      if (r.hasAnomaly) stageStats[r.stage].anomaly++
    }
  })

  const sampleStats = {}
  annotationRecords.forEach(r => {
    if (!sampleStats[r.sampleName]) {
      sampleStats[r.sampleName] = { sampleName: r.sampleName, total: 0, approved: 0, pendingReview: 0, anomaly: 0 }
    }
    sampleStats[r.sampleName].total++
    if (r.reviewStatus === 'approved') sampleStats[r.sampleName].approved++
    if (r.reviewStatus === 'pending_review') sampleStats[r.sampleName].pendingReview++
    if (r.hasAnomaly) sampleStats[r.sampleName].anomaly++
  })

  const overall = {
    total: annotationRecords.length,
    approved: annotationRecords.filter(r => r.reviewStatus === 'approved').length,
    pendingReview: annotationRecords.filter(r => r.reviewStatus === 'pending_review').length,
    rejected: annotationRecords.filter(r => r.reviewStatus === 'rejected').length,
    anomaly: annotationRecords.filter(r => r.hasAnomaly).length,
    boundary: annotationRecords.filter(r => r.isBoundary).length
  }

  res.json({ stageStats: Object.values(stageStats), sampleStats: Object.values(sampleStats), overall })
})

app.get('/api/import/batches', (req, res) => {
  res.json({ batches: importBatches })
})

app.post('/api/import/check-duplicates', (req, res) => {
  const { records } = req.body
  const duplicates = []

  records.forEach((rec, idx) => {
    const existing = annotationRecords.find(
      r => r.imageName === rec.imageName && r.sampleName === rec.sampleName
    )
    if (existing) {
      duplicates.push({
        importIndex: idx,
        imageName: rec.imageName,
        sampleName: rec.sampleName,
        existingId: existing.id,
        existingImportBatch: existing.importBatch
      })
    }
  })

  res.json({ duplicates, total: records.length, duplicateCount: duplicates.length })
})

app.post('/api/import/execute', (req, res) => {
  const { records, batchName, strategy = 'skip' } = req.body
  const batchId = `batch-${Date.now()}`
  let imported = 0
  let skipped = 0
  let updated = 0

  records.forEach((rec, idx) => {
    const existingIdx = annotationRecords.findIndex(
      r => r.imageName === rec.imageName && r.sampleName === rec.sampleName
    )

    if (existingIdx !== -1) {
      if (strategy === 'overwrite') {
        annotationRecords[existingIdx] = {
          ...annotationRecords[existingIdx],
          ...rec,
          id: annotationRecords[existingIdx].id,
          importBatch: batchId,
          importTime: new Date().toLocaleString('zh-CN')
        }
        updated++
      } else {
        skipped++
      }
    } else {
      const newRec = {
        ...rec,
        id: `rec-${Date.now()}-${idx}`,
        originalRow: annotationRecords.length + idx + 2,
        importBatch: batchId,
        importTime: new Date().toLocaleString('zh-CN'),
        reviewStatus: rec.hasAnomaly || rec.isBoundary ? 'pending_review' : 'approved'
      }
      annotationRecords.push(newRec)
      imported++
    }
  })

  importBatches.unshift({
    id: batchId,
    name: batchName || `导入批次 ${new Date().toLocaleString('zh-CN')}`,
    importTime: new Date().toLocaleString('zh-CN'),
    recordCount: imported + updated,
    source: 'file',
    fileName: 'imported_file.xlsx',
    status: 'completed',
    imported,
    updated,
    skipped
  })

  res.json({ batchId, imported, updated, skipped, total: records.length })
})

app.get('/api/records/:id/trace', (req, res) => {
  const record = annotationRecords.find(r => r.id === req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })

  const batch = importBatches.find(b => b.id === record.importBatch)

  const traceInfo = {
    record,
    importBatch: batch,
    sourceChain: [
      { type: '原始记录', detail: `Excel第${record.originalRow}行 / ${record.imageName}`, time: record.importTime },
      { type: '标注人', detail: record.investigator, time: record.importTime },
      { type: '培养记录版本', detail: record.cultureVersion, time: record.importTime },
      { type: '导入批次', detail: batch ? batch.name : record.importBatch, time: batch ? batch.importTime : record.importTime }
    ]
  }

  if (record.reviewer) {
    traceInfo.sourceChain.push({
      type: '复核人',
      detail: `${record.reviewer} - ${record.reviewComment || '无备注'}`,
      time: record.reviewTime
    })
  }

  res.json(traceInfo)
})

app.post('/api/test/reset-data', (req, res) => {
  const newRecords = generateMockData()
  annotationRecords.length = 0
  annotationRecords.push(...newRecords)
  importBatches.length = 0
  importBatches.push({
    id: 'batch-2026-06-01-v1',
    name: '2026年6月1日 第一批导入',
    importTime: '2026-06-01 09:30:00',
    recordCount: 48,
    source: 'manual',
    fileName: '斑马鱼胚胎标注_20260601_v1.xlsx',
    status: 'completed'
  })
  res.json({ message: '数据已重置', recordCount: annotationRecords.length })
})

app.listen(PORT, () => {
  console.log(`斑马鱼胚胎标注系统 后端服务已启动: http://localhost:${PORT}`)
})
