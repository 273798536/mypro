import { useEffect, useState, useCallback, useRef } from 'react'
import { Upload, AlertCircle, FileSearch } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function SlowQueryLogs() {
  const { slowQueryLogs, fetchSlowQueryLogs } = useStore()
  const [dragOver, setDragOver] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; duplicates: number } | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSlowQueryLogs()
  }, [fetchSlowQueryLogs])

  const groupedLogs = slowQueryLogs.reduce<Record<string, typeof slowQueryLogs>>((acc, log) => {
    if (!acc[log.batch_id]) acc[log.batch_id] = []
    acc[log.batch_id].push(log)
    return acc
  }, {})

  const handleImport = useCallback(async (file: File) => {
    setUploading(true)
    setShowDuplicateWarning(false)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const batchId = parsed.batch_id || `batch-${Date.now()}`
      const logs = parsed.logs || []
      const res = await fetch('/api/slow-query-logs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId, logs }),
      })
      const json = await res.json()
      if (json.success) {
        const results = json.data as { is_duplicate: boolean }[]
        const dupCount = results.filter((r) => r.is_duplicate).length
        setImportResult({ total: results.length, duplicates: dupCount })
        if (dupCount > 0) setShowDuplicateWarning(true)
        fetchSlowQueryLogs()
      }
    } catch {
      setImportResult(null)
    } finally {
      setUploading(false)
    }
  }, [fetchSlowQueryLogs])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImport(file)
  }, [handleImport])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImport(file)
  }, [handleImport])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">慢查询日志管理</h1>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-amber-500 bg-amber-500/5' : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-amber-500' : 'text-slate-500'}`} />
        <p className="text-slate-300 mb-1">{uploading ? '导入中...' : '拖拽 JSON 文件到此处或点击上传'}</p>
        <p className="text-xs text-slate-500">支持包含 batch_id 和 logs 数组的 JSON 文件</p>
      </div>

      {importResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-emerald-400">
          成功导入 {importResult.total} 条日志{importResult.duplicates > 0 ? `，其中 ${importResult.duplicates} 条为重复补录` : ''}
        </div>
      )}

      {showDuplicateWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-400">本次导入包含重复查询，已标记为补录记录，不影响原有数据分析</div>
        </div>
      )}

      {Object.entries(groupedLogs).map(([batchId, logs]) => (
        <div key={batchId} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center">
            <FileSearch className="w-4 h-4 text-amber-500 mr-2" />
            <span className="text-white font-medium">{batchId}</span>
            <span className="ml-2 text-xs text-slate-400">{logs.length} 条</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-5 py-2 font-medium">查询语句</th>
                <th className="text-left px-5 py-2 font-medium">耗时(ms)</th>
                <th className="text-left px-5 py-2 font-medium">来源</th>
                <th className="text-left px-5 py-2 font-medium">标记</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-5 py-2.5">
                    <code className="font-mono text-xs text-slate-300 line-clamp-1">{log.query_text}</code>
                  </td>
                  <td className="px-5 py-2.5 text-slate-300">{log.execution_time_ms}</td>
                  <td className="px-5 py-2.5 text-slate-400 text-xs">{log.source_file}</td>
                  <td className="px-5 py-2.5">
                    {log.is_duplicate ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">补录</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
