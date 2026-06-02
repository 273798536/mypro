import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

export default function Import() {
  const { importState, uploadFile, clearImport, confirmImport } = useStore()
  const [fileType, setFileType] = useState('csv')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    uploadFile(file, fileType)
  }, [uploadFile, fileType])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-6">
      {!importState.preview ? (
        <>
          <div
            className={cn(
              'card flex flex-col items-center justify-center border-dashed py-16 transition-colors',
              dragOver && 'border-amber-gold'
            )}
            style={{ borderColor: dragOver ? 'var(--amber-gold)' : 'var(--border-color)' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <Upload size={40} style={{ color: 'var(--text-muted)' }} />
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>拖拽文件到此处上传</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>支持 CSV 和 Excel 文件</p>
            <div className="mt-4 flex items-center gap-3">
              <select
                className="input"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
              <label className="btn-primary cursor-pointer">
                <FileSpreadsheet size={14} className="mr-1.5 inline" />
                选择文件
                <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={onFileInput} />
              </label>
            </div>
          </div>
          {importState.uploading && (
            <div className="card flex items-center justify-center py-8">
              <div className="skeleton h-4 w-48" />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>数据预览</h3>
            <button className="btn-secondary text-xs" onClick={clearImport}>重新上传</button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <h4 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>原始材料</h4>
              <div className="card overflow-auto max-h-80 p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {Object.keys(importState.preview.original[0] || {}).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importState.preview.original.slice(0, 10).map((row, i) => (
                      <tr key={i} className="table-row">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>处理结果</h4>
              <div className="card overflow-auto max-h-80 p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {Object.keys(importState.preview.processed[0] || {}).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importState.preview.processed.slice(0, 10).map((row, i) => (
                      <tr key={i} className="table-row">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {importState.issues.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--coral)' }}>
                <AlertCircle size={16} /> 校验问题 ({importState.issues.length})
              </h4>
              <div className="card space-y-2">
                {importState.issues.map((issue, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="badge-red">行 {issue.row}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{issue.type}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={clearImport}>取消</button>
            <button className="btn-primary flex items-center gap-1.5" onClick={confirmImport}>
              <CheckCircle2 size={14} /> 确认导入
            </button>
          </div>
        </>
      )}
    </div>
  )
}
