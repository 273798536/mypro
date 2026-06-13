import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.post('/generate', (req: Request, res: Response): void => {
  try {
    const { floor, anomalyType, status, dateFrom, dateTo, includePhotos, includeHistory } = req.body

    const startDate = dateFrom
    const endDate = dateTo

    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (floor) {
      conditions.push('floor = @floor')
      params.floor = floor
    }
    if (anomalyType) {
      conditions.push('anomalyType = @anomalyType')
      params.anomalyType = anomalyType
    }
    if (status) {
      conditions.push('status = @status')
      params.status = status
    }
    if (startDate) {
      conditions.push('createdAt >= @startDate')
      params.startDate = startDate
    }
    if (endDate) {
      conditions.push('createdAt <= @endDate')
      params.endDate = endDate
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const records = db.prepare(`SELECT * FROM records ${whereClause} ORDER BY createdAt ASC`).all(params) as Record<string, unknown>[]

    const totalRecords = records.length
    const anomalyRecords = records.filter(r => (r.anomalyType as string) !== 'normal')
    const anomalyCount = anomalyRecords.length
    const rejudgedCount = records.filter(r => (r.status as string) === 'rejudged').length
    const dirtyCount = records.filter(r => (r.hasDirtyData as number) === 1).length

    const anomalyTypeMap: Record<string, string> = {
      normal: '正常',
      flicker: '灯光闪烁',
      brightness_abnormal: '亮度异常',
      off_schedule: '非计划时段',
    }

    const levelMap: Record<string, string> = {
      none: '无',
      low: '低',
      medium: '中',
      high: '高',
    }

    const statusMap: Record<string, string> = {
      pending: '待审核',
      reviewed: '已审核',
      rejudged: '已重审',
      resolved: '已解决',
    }

    let md = `# 博物馆展柜灯光时序回放巡检报告\n\n`
    md += `**生成时间：** ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n\n`

    if (startDate || endDate) {
      md += `**统计区间：** ${startDate || '起始'} ~ ${endDate || '至今'}\n\n`
    }

    if (floor) {
      md += `**筛选楼层：** ${floor}\n\n`
    }

    md += `---\n\n`
    md += `## 统计概览\n\n`
    md += `| 指标 | 数值 |\n`
    md += `|------|------|\n`
    md += `| 总记录数 | ${totalRecords} |\n`
    md += `| 异常记录数 | ${anomalyCount} |\n`
    md += `| 重审记录数 | ${rejudgedCount} |\n`
    md += `| 脏数据记录数 | ${dirtyCount} |\n\n`

    if (anomalyCount > 0) {
      const anomalyBreakdown: Record<string, number> = {}
      for (const r of anomalyRecords) {
        const t = r.anomalyType as string
        anomalyBreakdown[t] = (anomalyBreakdown[t] || 0) + 1
      }
      md += `### 异常类型分布\n\n`
      md += `| 异常类型 | 数量 |\n`
      md += `|----------|------|\n`
      for (const [type, count] of Object.entries(anomalyBreakdown)) {
        md += `| ${anomalyTypeMap[type] || type} | ${count} |\n`
      }
      md += `\n`
    }

    md += `---\n\n`
    md += `## 记录明细\n\n`

    for (const r of records) {
      const cabinetNo = r.cabinetNo as string
      const fl = r.floor as string
      const aType = r.anomalyType as string
      const aLevel = r.anomalyLevel as string
      const st = r.status as string
      const judg = r.judgment as string

      md += `### ${cabinetNo}（${fl}）\n\n`
      md += `- **异常类型：** ${anomalyTypeMap[aType] || aType}\n`
      md += `- **异常等级：** ${levelMap[aLevel] || aLevel}\n`
      md += `- **审核状态：** ${statusMap[st] || st}\n`
      md += `- **判定结果：** ${judg || '未判定'}\n`
      md += `- **记录时间：** ${r.createdAt}\n`

      if ((r.hasDirtyData as number) === 1) {
        md += `- **⚠️ 脏数据标记：** ${r.dirtyDataNote}\n`
      }

      if (includeHistory) {
        const history = db.prepare('SELECT * FROM history_entries WHERE recordId = ? ORDER BY timestamp ASC').all(r.id) as Record<string, unknown>[]
        if (history.length > 0) {
          md += `- **重审历史：**\n`
          for (const h of history) {
            md += `  - ${(h.action as string) === 'rejudge' ? '重审' : (h.action as string)}：由"${h.oldValue}"改为"${h.newValue}"（操作人：${h.operatorName}，原因：${h.reason}，时间：${h.timestamp}）\n`
          }
        }
      }

      if (includePhotos) {
        const photos = db.prepare('SELECT * FROM photos WHERE recordId = ? ORDER BY uploadedAt ASC').all(r.id) as Record<string, unknown>[]
        if (photos.length > 0) {
          md += `- **巡检照片：**\n`
          for (const p of photos) {
            md += `  - 原始文件：${p.originalFilename}（设备：${p.deviceInfo}，拍摄时间：${p.captureTime}）\n`
          }
        }
      }

      md += `\n`
    }

    if (dirtyCount > 0) {
      md += `---\n\n`
      md += `## ⚠️ 脏数据标记\n\n`
      md += `以下记录存在数据规范问题，需要修正后重新审核：\n\n`

      const dirtyRecords = records.filter(r => (r.hasDirtyData as number) === 1)
      for (const r of dirtyRecords) {
        md += `- **${r.cabinetNo}**（${r.floor}）：${r.dirtyDataNote}\n`
      }
      md += `\n`
    }

    const reportId = uuidv4()
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const configSnapshot = JSON.stringify({
      floor,
      anomalyType,
      status,
      dateFrom: startDate,
      dateTo: endDate,
      includePhotos: !!includePhotos,
      includeHistory: !!includeHistory,
    })

    const insertReport = db.prepare(`
      INSERT INTO reports (id, content, configSnapshot, recordCount, generatedAt)
      VALUES (@id, @content, @configSnapshot, @recordCount, @generatedAt)
    `)
    insertReport.run({
      id: reportId,
      content: md,
      configSnapshot,
      recordCount: totalRecords,
      generatedAt: createdAt,
    })

    res.json({
      success: true,
      data: {
        id: reportId,
        content: md,
        createdAt,
        recordCount: totalRecords,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate report' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' })
      return
    }
    res.json({
      success: true,
      data: {
        id: report.id,
        content: report.content,
        createdAt: report.generatedAt,
        recordCount: report.recordCount,
        configSnapshot: report.configSnapshot ? JSON.parse(report.configSnapshot as string) : {},
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch report' })
  }
})

router.get('/', (_req: Request, res: Response): void => {
  try {
    const reports = db.prepare('SELECT id, recordCount, generatedAt FROM reports ORDER BY generatedAt DESC LIMIT 50').all() as Record<string, unknown>[]
    res.json({ success: true, data: reports })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list reports' })
  }
})

export default router
