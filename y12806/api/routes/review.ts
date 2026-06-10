import { Router } from 'express'
import {
  getStepProgress,
  confirmBand,
  supplementBand,
  getLogs,
  writeJSON,
  getBands,
} from '../services/dataService.js'
import type { ReviewStepProgress, Band, ReviewLog } from '../../shared/types/index.js'

const router = Router()

router.get('/steps', async (_req, res) => {
  try {
    const steps: ReviewStepProgress[] = await getStepProgress()
    res.json({ success: true, data: steps })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/logs', async (_req, res) => {
  try {
    const logs = await getLogs()
    res.json({ success: true, data: logs })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/confirm', async (req, res) => {
  try {
    const body = req.body ?? {}
    const bandId = body.bandId ?? body.band_id
    const pass = body.pass
    const comment = body.comment
    const operator = body.operator ?? body.reviewer ?? 'analyst'
    if (!bandId) {
      res.status(400).json({ success: false, error: 'bandId is required' })
      return
    }
    const result = await confirmBand(
      String(bandId),
      Boolean(pass),
      String(comment ?? ''),
      String(operator)
    )
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/supplement', async (req, res) => {
  try {
    const body = req.body ?? {}
    const bandId = body.bandId ?? body.band_id
    const fields = body.fields
    const operator = body.operator ?? 'analyst'
    if (!bandId) {
      res.status(400).json({ success: false, error: 'bandId is required' })
      return
    }
    const band: Band = await supplementBand(String(bandId), fields ?? {})
    const [logs, bands] = await Promise.all([getLogs(), getBands()])
    const log: ReviewLog = {
      id: `LOG${String(logs.length + 1).padStart(3, '0')}`,
      band_id: String(bandId),
      action: 'supplement',
      operator: String(operator ?? 'system'),
      created_at: new Date().toISOString(),
      old_value: null,
      new_value: JSON.stringify(fields ?? {}),
      comment: '字段补录完成',
    }
    logs.push(log)
    await writeJSON('logs', logs)
    void bands
    res.json({ success: true, data: { band, log } })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/confirm-batch', async (req, res) => {
  try {
    const body = req.body ?? {}
    const ids = body.ids ?? body.band_ids ?? []
    const pass = body.pass
    const operator = body.operator ?? body.reviewer ?? 'analyst'
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids (array) is required' })
      return
    }
    const results: Array<{ bandId: string; band: Band; log: ReviewLog; success: boolean; error?: string }> = []
    for (const id of ids) {
      try {
        const r = await confirmBand(String(id), Boolean(pass), '批量处理', String(operator))
        results.push({ bandId: String(id), band: r.band, log: r.log, success: true })
      } catch (e) {
        results.push({
          bandId: String(id),
          band: {} as Band,
          log: {} as ReviewLog,
          success: false,
          error: (e as Error).message,
        })
      }
    }
    const successCount = results.filter((r) => r.success).length
    res.json({
      success: true,
      data: {
        total: ids.length,
        success_count: successCount,
        failed_count: ids.length - successCount,
        results,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
