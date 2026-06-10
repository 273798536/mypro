import { Router } from 'express'
import { getExportPreview, generateExport } from '../services/dataService.js'
import type { ExportOptions, ExportPreview } from '../../shared/types/index.js'

const router = Router()

router.post('/preview', async (req, res) => {
  try {
    const opts = (req.body ?? {}) as ExportOptions
    const preview: ExportPreview = await getExportPreview(opts)
    res.json({ success: true, data: preview })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/download', async (req, res) => {
  try {
    const opts = (req.body ?? {}) as ExportOptions
    const format = opts.format ?? 'csv'
    const result = await generateExport(opts)
    const timestamp = new Date().toISOString().slice(0, 10)
    if (format === 'json') {
      const filename = `export_${timestamp}.json`
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(JSON.stringify(result.json, null, 2))
    } else {
      const filename = `export_${timestamp}.csv`
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send('\uFEFF' + result.csv)
    }
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
