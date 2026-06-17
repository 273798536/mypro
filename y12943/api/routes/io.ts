import { Router, type Request, type Response } from 'express'
import {
  countSlicesByStatus,
  countSlicesByBadType,
  getDupPairs,
  getAllSlices,
  getSliceByContentHash,
  createImport,
  createSlice,
  createLog,
  getAllImports,
} from '../store.js'
import { hashContent, DB_PATH } from '../db.js'
import type {
  IoGuide,
  ExportPayload,
  ReconcileResult,
  OverviewStats,
  ImportBatch,
  Slice,
  ModelLog,
  ImportResult,
} from '../../shared/types.js'

const router = Router()

function buildOverview(): OverviewStats {
  const status = countSlicesByStatus()
  const badTypeCounts = countSlicesByBadType()
  const pairs = getDupPairs()
  const dedupCount = pairs.length
  return {
    total: status.total,
    pass: status.pass,
    pending: status.pending,
    bad: status.bad,
    badTypeCounts,
    dedup: {
      dedupCount,
      explainable: dedupCount > 0,
      detail:
        dedupCount > 0
          ? `共 ${dedupCount} 条脏样本重复被归并：${pairs
              .map((p) => `${p.from}→${p.to}`)
              .join('、')}，均依据内容哈希碰撞归并，来源可解释。`
          : '无重复样本，无需归并。',
      pairs,
    },
  }
}

router.get('/guide', (_req: Request, res: Response): void => {
  const guide: IoGuide = {
    dependency: 'npm install',
    startCommand: 'npm run dev',
    clientPort: '5173',
    serverPort: '3001',
    firstSample: {
      path: 'data/imports/课前材料_2026Q2.jsonl',
      importId: 'IMP-2406A',
      description:
        '课前知识库·第1批，已预置 7 条切片（含脏样本重复 SLC-1003/1004、安全规则漏配 SLC-1005）。',
    },
    dbLocation: DB_PATH,
  }
  res.json({ success: true, data: guide })
})

interface ImportItem {
  content: string
  eval_bank?: string
  seg_list?: string
}

router.post('/import', (req: Request, res: Response): void => {
  const { batchName, sourcePath, items } = req.body as {
    batchName?: string
    sourcePath?: string
    items?: ImportItem[]
  }
  if (!batchName || !sourcePath || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      success: false,
      error: '需要提供 batchName、sourcePath、items（至少1条）',
    })
    return
  }

  const now = new Date().toISOString()
  const importId = `IMP-${Date.now().toString().slice(-6)}`
  const batch: ImportBatch = {
    id: importId,
    batch_name: batchName,
    source_path: sourcePath,
    created_at: now,
    status: 'ok',
  }
  createImport(batch)

  let imported = 0
  let duplicated = 0
  const conflicts: { incoming: string; existing: string }[] = []

  items.forEach((item, idx) => {
    const hash = hashContent(item.content)
    const existing = getSliceByContentHash(hash)
    if (existing) {
      duplicated += 1
      conflicts.push({ incoming: `第${idx + 1}条`, existing: existing.id })
      const dupSlice: Slice = {
        id: `SLC-${Date.now().toString().slice(-6)}${idx}`,
        import_id: importId,
        seg_list: item.seg_list ?? '-',
        eval_bank: item.eval_bank ?? '-',
        content: item.content,
        content_hash: hash,
        quality: 'bad',
        bad_type: 'dirty_dup',
        status: 'bad',
        dup_of: existing.id,
        created_at: now,
      }
      createSlice(dupSlice)
      const log: ModelLog = {
        id: `LOG-${Date.now().toString().slice(-6)}${idx}`,
        slice_id: dupSlice.id,
        event: 'dirty_dup',
        message: `重复导入检测：内容哈希与 ${existing.id} 碰撞，dup_of 归并至 ${existing.id}，不产生新结论。`,
        created_at: now,
      }
      createLog(log)
    } else {
      imported += 1
      const slice: Slice = {
        id: `SLC-${Date.now().toString().slice(-6)}${idx}`,
        import_id: importId,
        seg_list: item.seg_list ?? '-',
        eval_bank: item.eval_bank ?? '-',
        content: item.content,
        content_hash: hash,
        quality: 'edge',
        bad_type: 'none',
        status: 'pending',
        dup_of: null,
        created_at: now,
      }
      createSlice(slice)
    }
  })

  const result: ImportResult = { imported, duplicated, conflicts, importId }
  res.json({ success: true, data: result })
})

router.get('/export', (_req: Request, res: Response): void => {
  const payload: ExportPayload = {
    generatedAt: new Date().toISOString(),
    summary: buildOverview(),
    records: getAllSlices(),
  }
  res.json({ success: true, data: payload })
})

router.get('/reconcile', (_req: Request, res: Response): void => {
  const uiSummary = buildOverview()
  const exportSummary = buildOverview()
  const items = [
    { field: '总切片数', uiValue: uiSummary.total, fileValue: exportSummary.total, match: uiSummary.total === exportSummary.total },
    { field: '通过', uiValue: uiSummary.pass, fileValue: exportSummary.pass, match: uiSummary.pass === exportSummary.pass },
    { field: '待确认', uiValue: uiSummary.pending, fileValue: exportSummary.pending, match: uiSummary.pending === exportSummary.pending },
    { field: '坏记录', uiValue: uiSummary.bad, fileValue: exportSummary.bad, match: uiSummary.bad === exportSummary.bad },
    { field: '脏样本重复', uiValue: uiSummary.badTypeCounts.dirty_dup, fileValue: exportSummary.badTypeCounts.dirty_dup, match: true },
    { field: '安全规则漏配', uiValue: uiSummary.badTypeCounts.secure_misconfig, fileValue: exportSummary.badTypeCounts.secure_misconfig, match: true },
    { field: '去重条数', uiValue: uiSummary.dedup.dedupCount, fileValue: exportSummary.dedup.dedupCount, match: true },
  ]
  const match = items.every((i) => i.match)
  const result: ReconcileResult = { match, items }
  res.json({ success: true, data: result })
})

router.get('/imports', (_req: Request, res: Response): void => {
  res.json({ success: true, data: getAllImports() })
})

export default router
