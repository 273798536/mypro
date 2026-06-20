import { Upload, AlertTriangle, ChevronDown, ChevronRight, Image } from 'lucide-react'
import { useReviewStore } from '../store'
import { useRef, useState } from 'react'

export default function MaterialPanel() {
  const materials = useReviewStore((s) => s.materials)
  const addMaterial = useReviewStore((s) => s.addMaterial)
  const expandedMaterial = useReviewStore((s) => s.expandedMaterial)
  const setExpandedMaterial = useReviewStore((s) => s.setExpandedMaterial)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showMetaForm, setShowMetaForm] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [metaSource, setMetaSource] = useState('第三季度排练群')
  const [metaSender, setMetaSender] = useState('')

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setPendingFiles(Array.from(files))
    setShowMetaForm(true)
  }

  const handleConfirmUpload = () => {
    if (!metaSource.trim() || !metaSender.trim()) return
    pendingFiles.forEach((file) => {
      addMaterial(file, {
        sourceGroup: metaSource.trim(),
        sender: metaSender.trim(),
      })
    })
    setPendingFiles([])
    setShowMetaForm(false)
    setMetaSender('')
  }

  const handleCancelUpload = () => {
    setPendingFiles([])
    setShowMetaForm(false)
    setMetaSender('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className="flex h-full w-60 flex-shrink-0 flex-col border-r border-white/5 bg-surface/40">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <Upload size={16} className="text-amber" />
        <h2 className="font-serif text-sm font-semibold tracking-wide">材料区</h2>
      </div>

      <div
        className={`mx-3 mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver ? 'border-amber bg-amber/10' : 'border-white/10 hover:border-amber/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={20} className="text-ivoryMuted" />
        <span className="text-xs text-ivoryMuted">拖拽或点击上传截图</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {showMetaForm && (
        <div className="mx-3 mt-3 rounded-lg border border-amber/30 bg-amber/5 p-3">
          <div className="mb-2 text-xs font-medium text-amber">
            已选 {pendingFiles.length} 个文件，请填写来源信息
          </div>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs text-ivoryMuted">来源群</label>
              <select
                value={metaSource}
                onChange={(e) => setMetaSource(e.target.value)}
                className="w-full text-xs"
              >
                <option value="第三季度排练群">第三季度排练群</option>
                <option value="琴房协调群">琴房协调群</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ivoryMuted">发送人</label>
              <input
                type="text"
                value={metaSender}
                onChange={(e) => setMetaSender(e.target.value)}
                placeholder="如：张指挥、王导、小温"
                className="w-full text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelUpload}
                className="flex-1 rounded px-2 py-1 text-xs text-ivoryMuted hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={!metaSource.trim() || !metaSender.trim()}
                className="flex-1 rounded bg-amber px-2 py-1 text-xs font-medium text-base hover:bg-amberDark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                确认上传
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex-1 overflow-y-auto px-3">
        {materials.map((mat) => (
          <div key={mat.id} className="mb-2">
            <div
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors ${
                mat.isDirty
                  ? 'border-coral/30 bg-coral/5 hover:bg-coral/10'
                  : 'border-white/5 hover:border-amber/30 hover:bg-amber/5'
              } ${expandedMaterial === mat.id ? 'border-amber/40 bg-amber/5' : ''}`}
              onClick={() =>
                setExpandedMaterial(expandedMaterial === mat.id ? null : mat.id)
              }
            >
              <div className="mt-0.5 flex-shrink-0">
                {expandedMaterial === mat.id ? (
                  <ChevronDown size={14} className="text-ivoryMuted" />
                ) : (
                  <ChevronRight size={14} className="text-ivoryMuted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <Image size={12} className="flex-shrink-0 text-ivoryMuted" />
                  <span className="truncate text-xs font-medium text-ivory">{mat.fileName}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-ivoryMuted">
                  <span>{mat.sourceGroup}</span>
                  <span>·</span>
                  <span>{new Date(mat.uploadedAt).toLocaleDateString('zh-CN')}</span>
                </div>
                {mat.isDirty && (
                  <div className="mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} className="text-coral" />
                    <span className="text-xs text-coral">{mat.dirtyTag}</span>
                  </div>
                )}
              </div>
            </div>

            {expandedMaterial === mat.id && (
              <div className="ml-5 mt-1 rounded border-l-2 border-amber/40 bg-surface/60 p-2 text-xs text-ivoryMuted">
                <div>发送人：{mat.sender}</div>
                <div>上传时间：{new Date(mat.uploadedAt).toLocaleString('zh-CN')}</div>
                <div>原始来源：{mat.sourceGroup}</div>
                {mat.isDirty && (
                  <div className="mt-1 text-coral">
                    脏数据标记：{mat.dirtyTag}（已保留原始痕迹）
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-white/5 px-4 py-2">
        <span className="text-xs text-ivoryMuted">
          共 {materials.length} 份材料 · {materials.filter((m) => m.isDirty).length} 份脏数据
        </span>
      </div>
    </div>
  )
}
