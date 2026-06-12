import { useState, useMemo, useRef } from 'react'
import { Upload, FileText, Play, Eye } from 'lucide-react'
import { useActions } from '@/hooks/useAppStore'

const ImportPanel = () => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [pasteText, setPasteText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileText, setFileText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { importBatch } = useActions()

  const currentText = tab === 'upload' ? fileText : pasteText
  const hasContent = currentText.trim().length > 0

  const previewLines = useMemo(() => {
    if (!hasContent) return []
    return currentText.split(/\r?\n/).slice(0, 5)
  }, [currentText, hasContent])

  const handleFile = (f: File) => {
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => {
      setFileText(String(reader.result || ''))
    }
    reader.readAsText(f, 'utf-8')
  }

  const handleImport = () => {
    if (!hasContent) return
    const source = tab === 'upload'
      ? (fileName || 'CSV导入')
      : `文本粘贴 · ${new Date().toLocaleString('zh-CN')}`
    importBatch(source, currentText)
    setPasteText('')
    setFileText('')
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <div className="tabs px-4">
        <div
          className={'tab' + (tab === 'upload' ? ' active' : '')}
          onClick={() => setTab('upload')}
        >
          <Upload size={14} className="mr-2" /> CSV 上传
        </div>
        <div
          className={'tab' + (tab === 'paste' ? ' active' : '')}
          onClick={() => setTab('paste')}
        >
          <FileText size={14} className="mr-2" /> 文本粘贴
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="min-w-0">
          {tab === 'upload' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <label
                className="border-2 border-dashed rounded-md flex flex-col items-center justify-center py-10 px-4 cursor-pointer transition-all hover:border-primary"
                style={{ borderColor: hasContent ? 'var(--moss)' : 'var(--gray-300)', background: hasContent ? 'var(--moss-bg)' : 'var(--gray-50)' }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={32} className={hasContent ? 'text-moss' : 'text-gray-400'} />
                <div className={'mt-3 font-medium ' + (hasContent ? 'text-moss' : 'text-gray-600')}>
                  {fileName ? fileName : '点击选择 CSV 或 TXT 文件'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {hasContent ? '点击更换文件' : '支持 .csv / .txt，首行表头将被识别'}
                </div>
              </label>
            </div>
          ) : (
            <div>
              <label className="label">粘贴内容</label>
              <textarea
                className="textarea"
                rows={8}
                placeholder="按 CSV 格式粘贴，首行表头可包含：时间/Time、方向/Direction、混响/Reverb、单位/Unit，使用逗号或制表符分隔"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="form-help">粘贴后将在右侧预览前 5 行</div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button
              className="btn btn-primary"
              disabled={!hasContent}
              onClick={handleImport}
            >
              <Play size={15} /> 导入并启动方向预检
            </button>
            {hasContent && (
              <span className="chip chip-moss chip-sm">
                已就绪 · 约 {currentText.split(/\r?\n/).filter((l) => l.trim()).length} 行
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">前 5 行预览</span>
          </div>
          <div className="preview-box h-[calc(100%-34px)]">
            {previewLines.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                {tab === 'upload' ? '上传文件后将显示预览' : '粘贴内容后将显示预览'}
              </div>
            ) : (
              previewLines.map((line, i) => (
                <div key={i} className="preview-line text-gray-700">
                  <span className="text-gray-400 mr-3 select-none">{String(i + 1).padStart(2, '0')}</span>
                  {line || <span className="text-gray-300">(空行)</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportPanel
