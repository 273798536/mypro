import { useState, useRef, type DragEvent } from 'react'
import { Upload, FileText, X, Link2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

export default function ContractUpload() {
  const { records, addRecord, updateRecord, openForm } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      setPreview({ url, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files)
  }

  const linkToRecord = () => {
    if (!preview || !selectedRecordId) return
    updateRecord(selectedRecordId, {
      contractScanUrl: preview.url,
      contractScanName: preview.name,
    })
    setPreview(null)
    setSelectedRecordId('')
  }

  const createFromScan = () => {
    if (!preview) return
    addRecord({
      songName: preview.name.replace(/\.[^.]+$/, ''),
      songAlias: [],
      timecodeStart: '',
      timecodeEnd: '',
      authPeriodStart: '',
      authPeriodEnd: '',
      status: 'pending',
      exceptionReason: '',
      contractScanUrl: preview.url,
      contractScanName: preview.name,
    })
    const newest = useStore.getState().records.at(-1)
    if (newest) openForm(newest)
    setPreview(null)
    setSelectedRecordId('')
  }

  return (
    <div className="rounded-xl bg-[#2d2d44] p-5">
      <h2 className="mb-4 text-lg font-semibold text-[#e8e8e8]">合同扫描件上传</h2>

      {!preview ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors',
            isDragging ? 'border-[#f0a500] bg-[#f0a500]/10' : 'border-[#555] hover:border-[#f0a500]/60',
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-[#f0a500]" />
          <p className="text-sm text-[#e8e8e8]">拖拽PDF或图片到此处，或点击选择文件</p>
          <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFileChange} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-[#1a1a2e] p-3">
            {preview.url.startsWith('data:image') ? (
              <img src={preview.url} alt={preview.name} className="h-20 w-20 rounded object-cover" />
            ) : (
              <FileText className="h-20 w-20 text-[#f0a500]" />
            )}
            <div className="flex-1">
              <p className="text-sm text-[#e8e8e8]">{preview.name}</p>
            </div>
            <button onClick={() => setPreview(null)} className="text-[#888] hover:text-[#e8e8e8]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-[#e8e8e8]/70">关联到已有记录</label>
              <div className="flex gap-2">
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="flex-1 rounded-lg border border-[#555] bg-[#1a1a2e] px-3 py-2 text-sm text-[#e8e8e8]"
                >
                  <option value="">选择记录...</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>{r.songName}</option>
                  ))}
                </select>
                <button
                  onClick={linkToRecord}
                  disabled={!selectedRecordId}
                  className="flex items-center gap-1 rounded-lg bg-[#f0a500] px-4 py-2 text-sm font-medium text-[#1a1a2e] shadow-[0_3px_0_#b37800] disabled:opacity-40"
                >
                  <Link2 className="h-4 w-4" />关联
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <span className="text-xs text-[#888]">— 或者 —</span>
            </div>

            <button
              onClick={createFromScan}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#f0a500] px-4 py-2 text-sm font-medium text-[#1a1a2e] shadow-[0_3px_0_#b37800]"
            >
              <Plus className="h-4 w-4" />从扫描件新建记录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
