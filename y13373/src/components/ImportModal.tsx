import { useState } from "react"
import { useQueueStore } from "@/store/queueStore"
import { parseImportJSON } from "@/utils/export"
import { X, Upload, AlertCircle } from "lucide-react"
import type { QueueRecord } from "@/types"

export function ImportModal() {
  const importModalOpen = useQueueStore(s => s.importModalOpen)
  const setImportModalOpen = useQueueStore(s => s.setImportModalOpen)
  const importRecords = useQueueStore(s => s.importRecords)

  const [jsonText, setJsonText] = useState("")
  const [preview, setPreview] = useState<QueueRecord[]>([])
  const [error, setError] = useState("")

  if (!importModalOpen) return null

  const handleParse = () => {
    setError("")
    setPreview([])
    try {
      const records = parseImportJSON(jsonText)
      setPreview(records)
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
    }
  }

  const handleImport = () => {
    if (preview.length === 0) return
    importRecords(preview)
    setJsonText("")
    setPreview([])
    setError("")
    setImportModalOpen(false)
  }

  const handleClose = () => {
    setJsonText("")
    setPreview([])
    setError("")
    setImportModalOpen(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setJsonText(text)
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100">导入队列数据</h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-zinc-300">粘贴 JSON 数据</label>
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                上传文件
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='[{"taskId":"T-001","taskName":"示例任务","type":"failure",...}]'
              rows={8}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none transition-colors"
            />
          </div>

          <button
            onClick={handleParse}
            disabled={!jsonText.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            预览解析结果
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <h4 className="text-sm text-zinc-300 mb-2">预览（{preview.length} 条记录）</h4>
              <div className="max-h-48 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="px-2 py-2 text-left">任务ID</th>
                      <th className="px-2 py-2 text-left">名称</th>
                      <th className="px-2 py-2 text-left">类型</th>
                      <th className="px-2 py-2 text-left">模型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(r => (
                      <tr key={r.id} className="border-b border-zinc-800/60">
                        <td className="px-2 py-2 font-mono text-zinc-300">{r.taskId}</td>
                        <td className="px-2 py-2 text-zinc-300">{r.taskName}</td>
                        <td className="px-2 py-2 text-zinc-300">{r.type}</td>
                        <td className="px-2 py-2 text-zinc-300">{r.model}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            确认导入 ({preview.length})
          </button>
        </div>
      </div>
    </div>
  )
}
