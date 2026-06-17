import { useState } from 'react'
import { useAppStore } from '@/store'
import { buildExportContent, downloadFile, formatTimeForFilename } from '@/utils/format'
import type { WarningRecord } from '@/types'
import { Download, FileText, FileJson, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  selectedRecord: WarningRecord | null
}

type ExportStatus = 'idle' | 'success' | 'error'

export default function ExportPanel({ selectedRecord }: Props) {
  const records = useAppStore((s) => s.records)
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const showStatus = (type: ExportStatus, message: string) => {
    setStatus(type)
    setStatusMessage(message)
    setTimeout(() => {
      setStatus('idle')
      setStatusMessage(null)
    }, 4000)
  }

  const handleExport = (format: 'csv' | 'json') => {
    try {
      if (records.length === 0) {
        showStatus('error', '没有可导出的数据')
        return
      }

      const { csv, json } = buildExportContent(records, selectedRecord)
      const content = format === 'csv' ? csv : json
      const ext = format === 'csv' ? 'csv' : 'json'
      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
      const filename = `梁体挠度阈值预警_${formatTimeForFilename()}.${ext}`

      const ok = downloadFile(content, filename, mimeType)
      if (ok) {
        const selectedPart = selectedRecord
          ? `当前聚焦「${selectedRecord.sceneLabel}」，`
          : ''
        showStatus('success', `导出成功：${filename}（${selectedPart}共${records.length}条记录）`)
      } else {
        showStatus('error', '导出失败：浏览器不支持或权限受限')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showStatus('error', `导出异常：${msg}`)
      console.error('[Export]', e)
    }
  }

  const getConsistencyInfo = () => {
    if (!selectedRecord) {
      return { ok: false, text: '未选中记录，无法校验三套话一致性' }
    }
    const { summary } = buildExportContent(records, selectedRecord)
    const sidePhrase = `当前场景：${selectedRecord.sceneLabel}。`
    const cardPhrase = selectedRecord.sceneLabel
    const summaryOk = summary.includes(cardPhrase)
    const sideOk = sidePhrase.includes(cardPhrase)
    const ok = summaryOk && sideOk
    return {
      ok,
      text: ok
        ? `三套话一致性校验通过：${cardPhrase}`
        : `不一致！页面摘要${summaryOk ? '✓' : '✗'} 侧边说明${sideOk ? '✓' : '✗'} 卡片标注✓`,
    }
  }

  const consistencyInfo = getConsistencyInfo()

  return (
    <div className="bg-white rounded-xl border border-surface-dark p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-navy">
          <Download className="w-4 h-4" />
          <h2 className="font-bold text-sm">数据导出</h2>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-steel hover:text-navy transition-colors"
        >
          {showDetails ? '收起' : '展开'}校验
        </button>
      </div>

      <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs leading-relaxed ${
        consistencyInfo.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
      }`}>
        {consistencyInfo.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
        <span>{consistencyInfo.text}</span>
      </div>

      {showDetails && selectedRecord && (
        <div className="bg-surface rounded-lg p-3 space-y-2 text-xs">
          <div>
            <span className="font-medium text-steel">卡片场景标注：</span>
            <span className="text-navy ml-1">{selectedRecord.sceneLabel}</span>
          </div>
          <div>
            <span className="font-medium text-steel">侧边说明：</span>
            <span className="text-navy ml-1">当前场景：{selectedRecord.sceneLabel}。该标注与卡片列表和页面摘要保持一致...</span>
          </div>
          <div>
            <span className="font-medium text-steel">页面摘要：</span>
            <span className="text-navy ml-1">{buildExportContent(records, selectedRecord).summary}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleExport('csv')}
          disabled={records.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy text-white text-xs rounded-lg hover:bg-navy-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-3.5 h-3.5" />
          导出 CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={records.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-navy/20 text-navy text-xs rounded-lg hover:bg-navy/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileJson className="w-3.5 h-3.5" />
          导出 JSON
        </button>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          status === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {status === 'success'
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <XCircle className="w-3.5 h-3.5" />}
          <span>{statusMessage}</span>
        </div>
      )}

      <p className="text-xs text-steel/70 leading-relaxed">
        导出文件包含页面摘要、侧边说明、卡片场景标注，可验证三者措辞是否一致。
      </p>
    </div>
  )
}
