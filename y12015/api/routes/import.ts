import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { deduplicateEntries, getLatestVersion } from '../services/allocationService.js'

const router = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function parseFile(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet)
}

router.post('/accounts', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, count: 0, errors: ['未找到上传文件'] })
      return
    }

    const rows = parseFile(req.file.buffer)
    const insertAccount = db.prepare(
      'INSERT OR REPLACE INTO accounts (id, card_no, holder_name, purchase_amount, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)'
    )

    const errors: string[] = []
    let count = 0

    const transaction = db.transaction(() => {
      for (const row of rows) {
        try {
          const cardNo = String(row['card_no'] ?? row['年卡号'] ?? '').trim()
          const holderName = String(row['holder_name'] ?? row['持卡人'] ?? '').trim()
          const purchaseAmount = parseFloat(String(row['purchase_amount'] ?? row['购卡金额'] ?? '0'))
          const validFrom = String(row['valid_from'] ?? row['有效期起'] ?? '').trim()
          const validTo = String(row['valid_to'] ?? row['有效期止'] ?? '').trim()

          if (!cardNo) {
            errors.push(`行缺失年卡号: ${JSON.stringify(row)}`)
            continue
          }

          insertAccount.run(uuidv4(), cardNo, holderName, isNaN(purchaseAmount) ? 0 : purchaseAmount, validFrom, validTo)
          count++
        } catch (err) {
          errors.push(`插入失败: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    })

    transaction()

    res.json({ success: true, count, errors })
  } catch (err) {
    res.status(500).json({ success: false, count: 0, errors: [err instanceof Error ? err.message : String(err)] })
  }
})

router.post('/entries', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, count: 0, duplicates: 0, errors: ['未找到上传文件'] })
      return
    }

    const rows = parseFile(req.file.buffer)
    const insertEntry = db.prepare(
      'INSERT INTO entries (id, card_no, scenic_spot_id, scenic_spot_name, entry_time, swipe_serial_no, is_deduplicated) VALUES (?, ?, ?, ?, ?, ?, 0)'
    )

    const errors: string[] = []
    let count = 0

    const transaction = db.transaction(() => {
      for (const row of rows) {
        try {
          const cardNo = String(row['card_no'] ?? row['年卡号'] ?? '').trim()
          const scenicSpotId = String(row['scenic_spot_id'] ?? row['景点ID'] ?? '').trim()
          const scenicSpotName = String(row['scenic_spot_name'] ?? row['景点名称'] ?? '').trim()
          const entryTime = String(row['entry_time'] ?? row['入园时间'] ?? '').trim()
          const swipeSerialNo = String(row['swipe_serial_no'] ?? row['刷卡流水号'] ?? uuidv4()).trim()

          if (!cardNo || !scenicSpotId) {
            errors.push(`行缺失必要字段: ${JSON.stringify(row)}`)
            continue
          }

          insertEntry.run(uuidv4(), cardNo, scenicSpotId, scenicSpotName, entryTime, swipeSerialNo)
          count++
        } catch (err) {
          errors.push(`插入失败: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    })

    transaction()

    const duplicates = deduplicateEntries()

    res.json({ success: true, count, duplicates, errors })
  } catch (err) {
    res.status(500).json({ success: false, count: 0, duplicates: 0, errors: [err instanceof Error ? err.message : String(err)] })
  }
})

router.post('/subsidies', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, count: 0, changes: { added: 0, updated: 0, removed: 0, details: [] }, errors: ['未找到上传文件'] })
      return
    }

    const rows = parseFile(req.file.buffer)
    const errors: string[] = []
    let count = 0
    let added = 0
    let updated = 0
    const details: Array<{ action: 'added' | 'updated' | 'removed'; activityId: string; activityName: string; scenicSpotName: string; subsidyAmount: number }> = []

    const findExisting = db.prepare(
      'SELECT id, version FROM subsidies WHERE activity_id = ? AND scenic_spot_id = ? ORDER BY version DESC LIMIT 1'
    )
    const insertSubsidy = db.prepare(
      'INSERT INTO subsidies (id, activity_id, activity_name, scenic_spot_id, scenic_spot_name, subsidy_amount, valid_from, valid_to, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const updateSubsidy = db.prepare(
      'UPDATE subsidies SET subsidy_amount = ?, valid_from = ?, valid_to = ?, version = ? WHERE id = ?'
    )

    const transaction = db.transaction(() => {
      for (const row of rows) {
        try {
          const activityId = String(row['activity_id'] ?? row['活动ID'] ?? '').trim()
          const activityName = String(row['activity_name'] ?? row['活动名称'] ?? '').trim()
          const scenicSpotId = String(row['scenic_spot_id'] ?? row['景点ID'] ?? '').trim()
          const scenicSpotName = String(row['scenic_spot_name'] ?? row['景点名称'] ?? '').trim()
          const subsidyAmount = parseFloat(String(row['subsidy_amount'] ?? row['补贴金额'] ?? '0'))
          const validFrom = String(row['valid_from'] ?? row['生效起始'] ?? '').trim()
          const validTo = String(row['valid_to'] ?? row['生效截止'] ?? '').trim()

          if (!activityId || !scenicSpotId) {
            errors.push(`行缺失必要字段: ${JSON.stringify(row)}`)
            continue
          }

          const existing = findExisting.get(activityId, scenicSpotId) as { id: string; version: number } | undefined

          if (existing) {
            const newVersion = existing.version + 1
            updateSubsidy.run(isNaN(subsidyAmount) ? 0 : subsidyAmount, validFrom, validTo, newVersion, existing.id)
            updated++
            details.push({ action: 'updated', activityId, activityName, scenicSpotName, subsidyAmount: isNaN(subsidyAmount) ? 0 : subsidyAmount })
          } else {
            insertSubsidy.run(uuidv4(), activityId, activityName, scenicSpotId, scenicSpotName, isNaN(subsidyAmount) ? 0 : subsidyAmount, validFrom, validTo, 1)
            added++
            details.push({ action: 'added', activityId, activityName, scenicSpotName, subsidyAmount: isNaN(subsidyAmount) ? 0 : subsidyAmount })
          }
          count++
        } catch (err) {
          errors.push(`插入失败: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    })

    transaction()

    res.json({
      success: true,
      count,
      changes: { added, updated, removed: 0, details },
      errors,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      count: 0,
      changes: { added: 0, updated: 0, removed: 0, details: [] },
      errors: [err instanceof Error ? err.message : String(err)],
    })
  }
})

router.get('/status', (_req: Request, res: Response) => {
  try {
    const accountCount = (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number }).c
    const entryCount = (db.prepare('SELECT COUNT(*) as c FROM entries').get() as { c: number }).c
    const subsidyCount = (db.prepare('SELECT COUNT(*) as c FROM subsidies').get() as { c: number }).c
    const refundCount = (db.prepare('SELECT COUNT(*) as c FROM refunds').get() as { c: number }).c
    const latestVersion = getLatestVersion() ?? '-'

    res.json({ accountCount, entryCount, subsidyCount, refundCount, latestVersion })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
