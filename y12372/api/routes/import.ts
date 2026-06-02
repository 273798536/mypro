import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { db, UPLOADS_DIR } from '../database.js'

const router = Router()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 CSV 和 Excel 文件'))
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }
    rows.push(row)
  }
  return rows
}

function parseExcel(filePath: string): any[] {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet)
}

interface ValidationIssue {
  row: number
  type: string
  message: string
}

function validateRows(rows: any[]): { validRows: any[], issues: ValidationIssue[] } {
  const validRows: any[] = []
  const issues: ValidationIssue[] = []

  const requiredFields = ['title', 'authors', 'platform', 'usageCount', 'period']

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const missing = requiredFields.filter(f => !row[f])
    if (missing.length > 0) {
      issues.push({ row: i + 2, type: 'missing_field', message: `缺少字段: ${missing.join(', ')}` })
      continue
    }

    const usageCount = parseInt(row.usageCount)
    if (isNaN(usageCount) || usageCount < 0) {
      issues.push({ row: i + 2, type: 'invalid_value', message: `使用量无效: ${row.usageCount}` })
      continue
    }

    const validPlatforms = ['short_video', 'ktv', 'live']
    if (!validPlatforms.includes(row.platform)) {
      issues.push({ row: i + 2, type: 'invalid_platform', message: `平台类型无效: ${row.platform}` })
      continue
    }

    validRows.push({
      title: String(row.title),
      authors: String(row.authors),
      isrc: row.isrc ? String(row.isrc) : '',
      platform: row.platform,
      usageCount,
      period: String(row.period),
    })
  }

  return { validRows, issues }
}

router.post('/upload', upload.single('file'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传文件' })
      return
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    let rows: any[]

    if (ext === '.csv') {
      const content = fs.readFileSync(req.file.path, 'utf-8')
      rows = parseCSV(content)
    } else {
      rows = parseExcel(req.file.path)
    }

    const { validRows, issues } = validateRows(rows)

    const now = new Date().toISOString()
    const importId = uuidv4()

    db.prepare(`
      INSERT INTO import_records (id, fileName, fileType, recordCount, issues, status, data, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      importId,
      req.file.originalname,
      ext.replace('.', ''),
      validRows.length,
      JSON.stringify(issues),
      'pending',
      JSON.stringify(validRows),
      now,
    )

    res.json({
      success: true,
      data: {
        importId,
        original: rows,
        processed: validRows,
        issues,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:importId/confirm', (req: Request, res: Response): void => {
  try {
    const importRecord = db.prepare('SELECT * FROM import_records WHERE id = ?').get(req.params.importId) as any
    if (!importRecord) {
      res.status(404).json({ success: false, error: '导入记录不存在' })
      return
    }

    if (importRecord.status === 'confirmed') {
      res.status(400).json({ success: false, error: '该导入已确认' })
      return
    }

    const rows: any[] = JSON.parse(importRecord.data)
    const now = new Date().toISOString()

    const findWork = db.prepare('SELECT id FROM works WHERE title = ? AND authors = ?')
    const insertWork = db.prepare(`
      INSERT INTO works (id, title, authors, isrc, status, anomalyTypes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'normal', '[]', ?, ?)
    `)
    const insertUsage = db.prepare(`
      INSERT INTO usage_records (id, workId, platform, usageCount, period, unitPrice, amount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const platformPrices: Record<string, number> = { short_video: 0.01, ktv: 0.5, live: 0.03 }

    const transaction = db.transaction(() => {
      for (const row of rows) {
        let work = findWork.get(row.title, row.authors) as any
        if (!work) {
          const workId = uuidv4()
          insertWork.run(workId, row.title, row.authors, row.isrc || '', now, now)
          work = { id: workId }
        }

        const unitPrice = platformPrices[row.platform] || 0.01
        const amount = Math.round(row.usageCount * unitPrice * 100) / 100

        insertUsage.run(
          uuidv4(),
          work.id,
          row.platform,
          row.usageCount,
          row.period,
          unitPrice,
          amount,
          now,
        )
      }

      db.prepare('UPDATE import_records SET status = ? WHERE id = ?').run('confirmed', req.params.importId)
    })

    transaction()

    res.json({
      success: true,
      data: {
        importId: req.params.importId,
        insertedCount: rows.length,
        status: 'confirmed',
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
