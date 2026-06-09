import { useState } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'
import type { NormalRecord } from '@/types'

interface CorrectionFormProps {
  record: NormalRecord
  onSubmit: (data: CorrectionFormData) => void
  onCancel: () => void
}

export interface CorrectionFormData {
  misreadType: string
  description: string
  evidenceFiles: File[]
}

const misreadOptions = [
  { value: 'occlusion', label: '透明遮挡' },
  { value: 'angle', label: '角度偏差' },
  { value: 'device', label: '设备误差' },
  { value: 'other', label: '其他' },
]

function CorrectionForm({ record, onSubmit, onCancel }: CorrectionFormProps) {
  const [misreadType, setMisreadType] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<{ misreadType?: string; description?: string }>({})

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const newErrors: { misreadType?: string; description?: string } = {}
    if (!misreadType) newErrors.misreadType = '请选择误读类型'
    if (!description.trim()) newErrors.description = '请输入修正说明'
    else if (description.trim().length < 10) newErrors.description = '修正说明至少10个字符'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({
        misreadType,
        description: description.trim(),
        evidenceFiles: files,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-lg p-5 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-base font-medium text-text-primary">修正申请</h3>
        <span className="text-xs text-text-muted">记录 #{record.id.slice(0, 8)}</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          误读类型 <span className="text-danger">*</span>
        </label>
        <select
          value={misreadType}
          onChange={(e) => {
            setMisreadType(e.target.value)
            if (errors.misreadType) setErrors({ ...errors, misreadType: undefined })
          }}
          className={`w-full h-10 px-3 rounded-md bg-bg-dark text-text-primary text-sm focus:outline-none transition-colors ${
            errors.misreadType ? 'border-danger' : 'border-border hover:border-border-hover'
          } border`}
        >
          <option value="">请选择误读类型</option>
          {misreadOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.misreadType && (
          <div className="flex items-center gap-1 mt-1 text-xs text-danger">
            <AlertCircle size={12} />
            <span>{errors.misreadType}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          修正说明 <span className="text-danger">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (errors.description) setErrors({ ...errors, description: undefined })
          }}
          placeholder="请详细描述误读原因和修正依据..."
          className={`w-full px-3 py-2 rounded-md bg-bg-dark text-text-primary text-sm resize-none focus:outline-none transition-colors ${
            errors.description ? 'border-danger' : 'border-border hover:border-border-hover'
          } border`}
          style={{ height: '120px' }}
        />
        {errors.description && (
          <div className="flex items-center gap-1 mt-1 text-xs text-danger">
            <AlertCircle size={12} />
            <span>{errors.description}</span>
          </div>
        )}
        <div className="text-right text-xs text-text-muted mt-1">{description.length} 字符</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          补充证据 <span className="text-text-muted text-xs">(可选)</span>
        </label>
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/60 hover:bg-bg-hover transition-colors bg-bg-dark">
          <Upload size={20} className="text-text-muted mb-1" />
          <span className="text-xs text-text-muted">点击或拖拽文件到此处上传</span>
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 bg-bg-dark rounded-md border border-border"
              >
                <span className="text-sm text-text-secondary truncate flex-1">{file.name}</span>
                <span className="text-xs text-text-muted mx-2">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-bg-hover transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-md text-sm text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="h-9 px-5 rounded-md text-sm text-white bg-primary hover:bg-primary/90 transition-colors"
        >
          提交修正
        </button>
      </div>
    </form>
  )
}

export default CorrectionForm
