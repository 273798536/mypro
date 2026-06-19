import { useEffect, useState, useRef, useCallback } from 'react'
import { Upload, FileCode, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'

export default function MigrationScripts() {
  const navigate = useNavigate()
  const { migrationScripts, fetchMigrationScripts, conflicts, fetchConflicts, slowQueryLogs } = useStore()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMigrationScripts()
    fetchConflicts()
  }, [fetchMigrationScripts, fetchConflicts])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      await fetch('/api/migration-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.name,
          version: parsed.version ?? 1,
          content: parsed.content,
        }),
      })
      fetchMigrationScripts()
    } catch { /* ignore */ } finally {
      setUploading(false)
    }
  }, [fetchMigrationScripts])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const getScriptStats = (scriptId: string) => {
    const relatedConflicts = conflicts.filter((c) => c.script_id === scriptId)
    const relatedLogs = slowQueryLogs.filter((l) =>
      relatedConflicts.some((c) => c.log_id === l.id)
    )
    return { logCount: relatedLogs.length, conflictCount: relatedConflicts.length, conflicts: relatedConflicts }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">迁移脚本管理</h1>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-amber-500 bg-amber-500/5' : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".json,.sql" onChange={handleFileChange} className="hidden" />
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-amber-500' : 'text-slate-500'}`} />
        <p className="text-slate-300 mb-1">{uploading ? '上传中...' : '拖拽脚本文件到此处或点击上传'}</p>
        <p className="text-xs text-slate-500">支持 JSON / SQL 文件</p>
      </div>

      <div className="space-y-4">
        {migrationScripts.map((script) => {
          const stats = getScriptStats(script.id)
          return (
            <div key={script.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <FileCode className="w-5 h-5 text-amber-500 mr-3" />
                  <div>
                    <h3 className="text-white font-medium">{script.name}</h3>
                    <span className="text-xs text-slate-400">版本 {script.version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{stats.logCount} 关联日志</span>
                  {stats.conflictCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-rose-400">
                      <AlertTriangle className="w-3 h-3" />
                      {stats.conflictCount} 冲突
                    </span>
                  )}
                </div>
              </div>
              <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-32">
                {script.content}
              </pre>
              {stats.conflicts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stats.conflicts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/conflict-analysis/${c.id}`)}
                      className="px-2 py-0.5 rounded text-xs bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors"
                    >
                      {c.type} - {c.severity}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
