import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface FileUploadProps {
  accept: string
  label: string
  description: string
  onUpload: (file: File) => Promise<void>
  className?: string
}

export default function FileUpload({ accept, label, description, onUpload, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setResult(null)
    setErrorMsg('')
    setUploading(true)
    try {
      await onUpload(f)
      setResult('success')
    } catch (err) {
      setResult('error')
      setErrorMsg(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }, [onUpload])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleClear() {
    setFile(null)
    setResult(null)
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('card', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary-50/50 scale-[1.01]'
            : 'border-surface-border hover:border-primary/40 hover:bg-gray-50/50',
          uploading && 'pointer-events-none',
          result === 'success' && 'border-success/40 bg-green-50/30',
          result === 'error' && 'border-danger/40 bg-red-50/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <>
            <div className="w-10 h-10 mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-gray-600">正在上传...</p>
          </>
        ) : result === 'success' ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-success mb-3" />
            <p className="text-sm font-medium text-success-dark">上传成功</p>
            <p className="text-xs text-gray-500 mt-1">{file?.name}</p>
          </>
        ) : result === 'error' ? (
          <>
            <AlertCircle className="w-10 h-10 text-danger mb-3" />
            <p className="text-sm font-medium text-danger-dark">上传失败</p>
            <p className="text-xs text-gray-500 mt-1">{errorMsg}</p>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
            <div className="flex items-center gap-1 mt-3 text-xs text-primary">
              <Upload className="w-3.5 h-3.5" />
              <span>点击或拖拽上传</span>
            </div>
          </>
        )}
      </div>

      {file && !uploading && (
        <div className="flex items-center justify-between px-3 py-2 mt-2 bg-gray-50 rounded text-xs">
          <span className="text-gray-600 truncate">{file.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
