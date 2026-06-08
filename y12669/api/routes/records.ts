import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { MOCK_RECORDS, MOCK_HISTORY } from '../../shared/mockData.js'
import { ANOMALY_META } from '../../shared/constants.js'
import type {
  Record as AppRecord,
  RecordHistory,
  HistoryChange,
  ListQueryParams,
  ListResponse,
  ExportConfig,
  ApiResponse,
  AnomalyDetail,
} from '../../shared/types.js'

const router = Router()

function buildStatistics(records: AppRecord[]) {
  return {
    totalRecords: records.length,
    anomalyCount: records.filter((r) => r.status === 'anomaly').length,
    correctedCount: records.filter((r) => r.status === 'corrected').length,
    pendingCount: records.filter((r) => r.status === 'pending').length,
    normalCount: records.filter((r) => r.status === 'normal').length,
  }
}

function buildFieldLabel(field: string): string {
  const labels: { [key: string]: string } = {
    timeParameter: '时间参数',
    riskNote: '风险备注',
    status: '状态',
    anomalyType: '异常类型',
    anomalyDescription: '异常描述',
    anomalySuggestion: '异常建议',
    ropeAngle: '绳索角度',
    ropeLength: '绳索长度',
    ropeTension: '绳索张力',
    operator: '操作员',
  }
  return labels[field] || field
}

router.get('/records', (req: Request, res: Response): void => {
  try {
    const query = req.query
    const page = Math.max(1, parseInt(query.page as unknown as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as unknown as string) || 10))

    let filtered = [...MOCK_RECORDS] as AppRecord[]

    if (query.status) {
      filtered = filtered.filter((r) => r.status === query.status)
    }

    if (query.anomalyType) {
      filtered = filtered.filter((r) => r.anomalyType === query.anomalyType)
    }

    if (query.keyword) {
      const kw = (query.keyword as string).toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.recordNumber.toLowerCase().includes(kw) ||
          r.riskNote.toLowerCase().includes(kw) ||
          r.operator.toLowerCase().includes(kw),
      )
    }

    if (query.startDate) {
      const start = new Date(query.startDate as unknown as string).getTime()
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() >= start)
    }

    if (query.endDate) {
      const end = new Date(query.endDate as unknown as string).getTime()
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() <= end)
    }

    const total = filtered.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    const data: ListResponse<AppRecord> = {
      items,
      total,
      page,
      pageSize,
      totalPages,
      statistics: buildStatistics(MOCK_RECORDS),
    }

    const response: ApiResponse<ListResponse<AppRecord>> = {
      success: true,
      data,
      message: '获取记录列表成功',
    }

    res.json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取记录列表失败',
    })
  }
})

router.get('/records/:id', (req: Request, res: Response): void => {
  try {
    const record = MOCK_RECORDS.find((r) => r.id === req.params.id)

    if (!record) {
      res.status(404).json({
        success: false,
        message: '记录不存在',
      })
      return
    }

    const response: ApiResponse<AppRecord> = {
      success: true,
      data: record,
      message: '获取记录成功',
    }

    res.json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取记录失败',
    })
  }
})

router.put('/records/:id', (req: Request, res: Response): void => {
  try {
    const recordIndex = MOCK_RECORDS.findIndex((r) => r.id === req.params.id)

    if (recordIndex === -1) {
      res.status(404).json({
        success: false,
        message: '记录不存在',
      })
      return
    }

    const originalRecord = { ...MOCK_RECORDS[recordIndex] } as AppRecord
    const updates = req.body as Partial<AppRecord>

    const changes: HistoryChange[] = []
    const allowedFields = [
      'timeParameter',
      'riskNote',
      'status',
      'anomalyType',
      'anomalyDescription',
      'anomalySuggestion',
      'ropeAngle',
      'ropeLength',
      'ropeTension',
      'anchorPointA',
      'anchorPointB',
      'crossSectionData',
      'operator',
    ]

    for (const field of allowedFields) {
      if (field in updates) {
        const oldValue = (originalRecord as unknown as { [key: string]: unknown })[field]
        const newValue = (updates as unknown as { [key: string]: unknown })[field]
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            field,
            fieldLabel: buildFieldLabel(field),
            oldValue: oldValue as string | number | boolean | null,
            newValue: newValue as string | number | boolean | null,
          })
        }
      }
    }

    const updatedRecord: AppRecord = {
      ...originalRecord,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    MOCK_RECORDS[recordIndex] = updatedRecord

    let newHistory: RecordHistory | null = null
    if (changes.length > 0) {
      if (!MOCK_HISTORY[req.params.id]) {
        MOCK_HISTORY[req.params.id] = []
      }
      const historyList = MOCK_HISTORY[req.params.id]
      newHistory = {
        id: uuidv4(),
        recordId: req.params.id,
        version: historyList.length + 1,
        changes,
        operator: updates.operator || originalRecord.operator,
        operatedAt: new Date().toISOString(),
      }
      historyList.push(newHistory)
    }

    const response: ApiResponse<{ record: AppRecord; history?: RecordHistory }> = {
      success: true,
      data: {
        record: updatedRecord,
        history: newHistory || undefined,
      },
      message: '更新记录成功',
    }

    res.json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新记录失败',
    })
  }
})

router.get('/records/:id/history', (req: Request, res: Response): void => {
  try {
    const history = MOCK_HISTORY[req.params.id] || []

    const response: ApiResponse<RecordHistory[]> = {
      success: true,
      data: history,
      message: '获取历史记录成功',
    }

    res.json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取历史记录失败',
    })
  }
})

router.get('/anomalies', (req: Request, res: Response): void => {
  try {
    const anomalies = Object.values(ANOMALY_META) as AnomalyDetail[]

    const response: ApiResponse<AnomalyDetail[]> = {
      success: true,
      data: anomalies,
      message: '获取异常类型成功',
    }

    res.json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取异常类型失败',
    })
  }
})

router.post('/export', (req: Request, res: Response): void => {
  try {
    const config = req.body as ExportConfig
    let recordsToExport = [...MOCK_RECORDS]

    if (config.recordIds && config.recordIds.length > 0) {
      recordsToExport = MOCK_RECORDS.filter((r) => config.recordIds!.includes(r.id))
    }

    if (config.dateRange) {
      const start = new Date(config.dateRange.start).getTime()
      const end = new Date(config.dateRange.end).getTime()
      recordsToExport = recordsToExport.filter((r) => {
        const t = new Date(r.createdAt).getTime()
        return t >= start && t <= end
      })
    }

    let filename = `records-${new Date().toISOString().slice(0, 10)}`
    let content = ''

    if (config.format === 'json') {
      const exportData: unknown = {
        exportedAt: new Date().toISOString(),
        records: recordsToExport,
        ...(config.includeHistory
          ? { history: Object.fromEntries(
              recordsToExport.map((r) => [r.id, MOCK_HISTORY[r.id] || []]),
            ) }
          : {}),
      }
      content = JSON.stringify(exportData, null, 2)
      filename += '.json'
    } else if (config.format === 'csv') {
      const headers = [
        '记录编号',
        '时间参数',
        '状态',
        '异常类型',
        '绳索角度',
        '绳索长度',
        '绳索张力',
        '操作员',
        '创建时间',
        '风险备注',
      ]
      const rows = recordsToExport.map((r) =>
        [
          r.recordNumber,
          r.timeParameter,
          r.status,
          r.anomalyType || '',
          r.ropeAngle,
          r.ropeLength,
          r.ropeTension,
          r.operator,
          r.createdAt,
          `"${r.riskNote.replace(/"/g, '""')}"`,
        ].join(','),
      )
      content = [headers.join(','), ...rows].join('\n')
      filename += '.csv'
    } else if (config.format === 'markdown') {
      const lines: string[] = []
      lines.push(`# 导出记录报告`)
      lines.push('')
      lines.push(`导出时间：${new Date().toLocaleString()}`)
      lines.push('')
      lines.push(`## 记录列表（共 ${recordsToExport.length} 条）`)
      lines.push('')
      lines.push('| 记录编号 | 状态 | 异常类型 | 角度 | 长度 | 张力 | 操作员 | 创建时间 |')
      lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
      for (const r of recordsToExport) {
        lines.push(
          `| ${r.recordNumber} | ${r.status} | ${r.anomalyType || '-'} | ${r.ropeAngle}° | ${r.ropeLength}m | ${r.ropeTension}kgf | ${r.operator} | ${r.createdAt.slice(0, 10)} |`,
        )
      }
      if (config.includeHistory) {
        lines.push('')
        lines.push('## 历史版本')
        for (const r of recordsToExport) {
          const h = MOCK_HISTORY[r.id]
          if (h && h.length > 0) {
            lines.push('')
            lines.push(`### ${r.recordNumber}`)
            for (const item of h) {
              lines.push('')
              lines.push(`- 版本 ${item.version}，操作人：${item.operator}，时间：${item.operatedAt}`)
              for (const c of item.changes) {
                lines.push(`  - ${c.fieldLabel}: ${c.oldValue} → ${c.newValue}`)
              }
              if (item.comment) {
                lines.push(`  - 备注：${item.comment}`)
              }
            }
          }
        }
      }
      content = lines.join('\n')
      filename += '.md'
    }

    const response: ApiResponse<{ downloadUrl: string; content: string; filename: string }> = {
      success: true,
      data: {
        downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
        content,
        filename,
      },
      message: '导出成功',
    }

    res.json(response)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导出失败',
    })
  }
})

export default router
