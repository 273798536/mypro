import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

interface DefectImportRow {
  type: string
  colorRuleName?: string
  posX: number
  posY: number
  width: number
  height: number
  description: string
  isOfflineAsset?: boolean
}

interface AnomalyItem {
  row: number
  reason: 'offline_asset_missing' | 'color_rule_mismatch' | 'coordinate_offset' | 'duplicate'
  detail: string
}

const DEDUP_DISTANCE = 5

const router = Router({ mergeParams: true })

router.post('/import', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { data } = req.body as { data: DefectImportRow[] }

    if (!Array.isArray(data) || data.length === 0) {
      res.status(400).json({ success: false, error: '导入数据不能为空' })
      return
    }

    const workshop = db.prepare('SELECT id FROM workshop WHERE id = ?').get(workshopId)
    if (!workshop) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }

    const colorRules = db.prepare('SELECT * FROM color_rule WHERE workshopId = ?').all(workshopId) as any[]

    const anomalies: AnomalyItem[] = []
    let imported = 0
    let duplicates = 0
    const batchId = uuidv4()
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')

    const existingDefects = db.prepare(
      'SELECT * FROM defect WHERE workshopId = ?'
    ).all(workshopId) as any[]

    const insertDefect = db.prepare(`
      INSERT INTO defect (id, workshopId, colorRuleId, type, status, posX, posY, width, height, description, source, importBatchId, isOfflineAsset, coordinateOffset, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'import', ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO import_batch (id, workshopId, totalCount, importedCount, duplicateCount, anomalies, createdAt)
        VALUES (?, ?, 0, 0, 0, '[]', ?)
      `).run(batchId, workshopId, now)

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 1

        let colorRuleId: string | null = null
        let isCoordinateOffset = false

        if (row.isOfflineAsset) {
          anomalies.push({
            row: rowNum,
            reason: 'offline_asset_missing',
            detail: `第${rowNum}行：离线素材缺失`
          })
        }

        if (row.colorRuleName) {
          const matchedRule = colorRules.find(r => r.name === row.colorRuleName)
          if (matchedRule) {
            colorRuleId = matchedRule.id
          } else {
            anomalies.push({
              row: rowNum,
              reason: 'color_rule_mismatch',
              detail: `第${rowNum}行：颜色规则"${row.colorRuleName}"不匹配`
            })
          }
        }

        if (row.posX < 0 || row.posY < 0 || row.width < 0 || row.height < 0) {
          isCoordinateOffset = true
          anomalies.push({
            row: rowNum,
            reason: 'coordinate_offset',
            detail: `第${rowNum}行：坐标偏移 (posX=${row.posX}, posY=${row.posY})`
          })
        }

        let isDuplicate = false
        for (const existing of existingDefects) {
          if (existing.type === row.type) {
            const dx = Math.abs(existing.posX - row.posX)
            const dy = Math.abs(existing.posY - row.posY)
            if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
              isDuplicate = true
              duplicates++
              anomalies.push({
                row: rowNum,
                reason: 'duplicate',
                detail: `第${rowNum}行：与已有缺陷重复 (id=${existing.id})`
              })
              break
            }
          }
        }

        if (!isDuplicate) {
          const id = uuidv4()
          insertDefect.run(
            id, workshopId, colorRuleId, row.type,
            row.posX, row.posY, row.width, row.height,
            row.description || '',
            batchId,
            row.isOfflineAsset ? 1 : 0,
            isCoordinateOffset ? 1 : 0,
            now, now
          )
          existingDefects.push({
            id, workshopId, type: row.type,
            posX: row.posX, posY: row.posY
          })
          imported++
        }
      }

      db.prepare(`
        UPDATE import_batch SET totalCount = ?, importedCount = ?, duplicateCount = ?, anomalies = ? WHERE id = ?
      `).run(
        data.length, imported, duplicates,
        JSON.stringify(anomalies),
        batchId
      )
    })

    transaction()

    const result = {
      batchId,
      total: data.length,
      imported,
      duplicates,
      anomalies
    }

    res.status(201).json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/export-check', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { statusSummary } = req.body as {
      statusSummary?: { defectId: string; status: string }[]
    }

    const workshop = db.prepare('SELECT id FROM workshop WHERE id = ?').get(workshopId)
    if (!workshop) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }

    if (!statusSummary || !Array.isArray(statusSummary)) {
      const defects = db.prepare('SELECT id, status FROM defect WHERE workshopId = ?').all(workshopId)
      res.json({ success: true, data: { isConsistent: true, mismatches: [], totalDefects: (defects as any[]).length } })
      return
    }

    const dbDefects = db.prepare('SELECT id, status FROM defect WHERE workshopId = ?').all(workshopId) as any[]
    const dbMap = new Map(dbDefects.map(d => [d.id, d.status]))

    const mismatches: { defectId: string; uiStatus: string; dataStatus: string }[] = []

    for (const item of statusSummary) {
      const dbStatus = dbMap.get(item.defectId)
      if (dbStatus === undefined) continue
      if (dbStatus !== item.status) {
        mismatches.push({
          defectId: item.defectId,
          uiStatus: item.status,
          dataStatus: dbStatus
        })
      }
    }

    res.json({
      success: true,
      data: {
        isConsistent: mismatches.length === 0,
        mismatches
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/export', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { workshopId } = req.params
    const { status, includeDetails } = req.body as {
      status?: string[]
      includeDetails?: boolean
    }

    const workshop = db.prepare('SELECT * FROM workshop WHERE id = ?').get(workshopId)
    if (!workshop) {
      res.status(404).json({ success: false, error: '车间不存在' })
      return
    }

    let sql = 'SELECT * FROM defect WHERE workshopId = ?'
    const params: any[] = [workshopId]

    if (status && Array.isArray(status) && status.length > 0) {
      const placeholders = status.map(() => '?').join(',')
      sql += ` AND status IN (${placeholders})`
      params.push(...status)
    }
    sql += ' ORDER BY createdAt DESC'

    const defects = db.prepare(sql).all(...params) as any[]

    if (!includeDetails) {
      res.json({
        success: true,
        data: {
          workshop,
          defects: defects.map(d => ({
            id: d.id,
            type: d.type,
            status: d.status,
            posX: d.posX,
            posY: d.posY,
            width: d.width,
            height: d.height,
            description: d.description,
            isOfflineAsset: !!d.isOfflineAsset,
            coordinateOffset: !!d.coordinateOffset,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt
          }))
        }
      })
      return
    }

    const result = defects.map(d => {
      const opinions = db.prepare('SELECT * FROM handling_opinion WHERE defectId = ? ORDER BY createdAt ASC').all(d.id)
      const statusLogs = db.prepare('SELECT * FROM status_log WHERE defectId = ? ORDER BY createdAt ASC').all(d.id)
      return {
        ...d,
        isOfflineAsset: !!d.isOfflineAsset,
        coordinateOffset: !!d.coordinateOffset,
        opinions,
        statusLogs
      }
    })

    res.json({
      success: true,
      data: { workshop, defects: result }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
