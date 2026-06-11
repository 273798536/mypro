import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, AlertTriangle } from 'lucide-react'
import type { ReagentBatch, CryoRecord, CreateRecordResponse } from '../../api/types'

interface FormState {
  type: 'freeze' | 'thaw'
  cell_line: string
  passage_number: string
  operator: string
  date: string
  freezing_medium: string
  reagent_batch_id: string
  storage_location: string
  viability_rate: string
  parent_record_id: string
  notes: string
}

const init: FormState = {
  type: 'freeze', cell_line: '', passage_number: '', operator: '', date: '',
  freezing_medium: '', reagent_batch_id: '', storage_location: '', viability_rate: '',
  parent_record_id: '', notes: '',
}

export default function RecordForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(init)
  const [batches, setBatches] = useState<ReagentBatch[]>([])
  const [parentOptions, setParentOptions] = useState<CryoRecord[]>([])
  const [parentSearch, setParentSearch] = useState('')
  const [showParentDrop, setShowParentDrop] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoType, setPhotoType] = useState<'pre_freeze' | 'post_thaw' | 'observation'>('pre_freeze')
  const [photoLabel, setPhotoLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [anomalyAlert, setAnomalyAlert] = useState<CreateRecordResponse | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/records?limit=200').then((r) => r.json()).then((j) => { if (j.success) setParentOptions(j.data) }).catch(() => {})
  }, [])

  const filteredParents = parentOptions.filter(
    (r) => r.type === 'freeze' && (r.cell_line.includes(parentSearch) || r.id.includes(parentSearch))
  )

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'type' && value === 'freeze') {
      setForm((prev) => ({ ...prev, viability_rate: '', parent_record_id: '' }))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    setPhotos((prev) => [...prev, ...files])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const body = {
        type: form.type,
        cell_line: form.cell_line,
        passage_number: Number(form.passage_number) || 0,
        operator: form.operator,
        date: form.date,
        freezing_medium: form.freezing_medium,
        reagent_batch_id: form.reagent_batch_id,
        storage_location: form.storage_location,
        viability_rate: form.type === 'thaw' && form.viability_rate ? Number(form.viability_rate) : undefined,
        parent_record_id: form.type === 'thaw' && form.parent_record_id ? form.parent_record_id : undefined,
        notes: form.notes || undefined,
      }
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error || '创建失败'); return }

      const created: CreateRecordResponse = json.data

      if (photos.length > 0 && created.record?.id) {
        for (const file of photos) {
          const fd = new FormData()
          fd.append('photo', file)
          fd.append('photo_type', photoType)
          fd.append('label', photoLabel)
          await fetch(`/api/records/${created.record.id}/photos`, { method: 'POST', body: fd })
        }
      }

      if (created.warnings?.length > 0 || created.anomaly_ids?.length > 0) {
        setAnomalyAlert(created)
      } else {
        navigate(`/records/${created.record.id}`)
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{form.type === 'freeze' ? '新增冻存记录' : '新增复苏记录'}</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {anomalyAlert && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">系统检测到异常</p>
              {anomalyAlert.warnings.map((w, i) => <p key={i} className="mt-1 text-xs text-amber-700">{w}</p>)}
              <button onClick={() => navigate(`/records/${anomalyAlert.record.id}`)} className="mt-2 text-sm text-teal-700 hover:underline">查看记录详情</button>
            </div>
            <button onClick={() => setAnomalyAlert(null)} className="ml-auto"><X size={16} className="text-amber-600" /></button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="type" checked={form.type === 'freeze'} onChange={() => handleChange('type', 'freeze')} className="accent-teal-700" />
            <span className="text-sm">冻存</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="type" checked={form.type === 'thaw'} onChange={() => handleChange('type', 'thaw')} className="accent-teal-700" />
            <span className="text-sm">复苏</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: '细胞系 *', key: 'cell_line' as const },
            { label: '代次 *', key: 'passage_number' as const },
            { label: '操作者 *', key: 'operator' as const },
            { label: '日期 *', key: 'date' as const, type: 'date' },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{f.label}</label>
              <input type={f.type || 'text'} value={form[f.key]} onChange={(e) => handleChange(f.key, e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" required />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">冻存液</label>
            <input type="text" value={form.freezing_medium} onChange={(e) => handleChange('freezing_medium', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">试剂批号 *</label>
            <input type="text" value={form.reagent_batch_id} onChange={(e) => handleChange('reagent_batch_id', e.target.value)} placeholder="输入试剂批次ID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">存储位置</label>
            <input type="text" value={form.storage_location} onChange={(e) => handleChange('storage_location', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {form.type === 'thaw' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">存活率 (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.viability_rate} onChange={(e) => handleChange('viability_rate', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        {form.type === 'thaw' && (
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-600">关联冻存记录（父记录）</label>
            <input type="text" value={parentSearch || form.parent_record_id.slice(0, 8)} onChange={(e) => { setParentSearch(e.target.value); setShowParentDrop(true) }}
              onFocus={() => setShowParentDrop(true)} placeholder="搜索细胞系或ID" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            {showParentDrop && filteredParents.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {filteredParents.slice(0, 10).map((r) => (
                  <button key={r.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50"
                    onClick={() => { setForm((p) => ({ ...p, parent_record_id: r.id })); setParentSearch(r.cell_line); setShowParentDrop(false) }}>
                    {r.cell_line} P{r.passage_number} — {r.date}
                  </button>
                ))}
              </div>
            )}
            {form.parent_record_id && (
              <button type="button" onClick={() => { setForm((p) => ({ ...p, parent_record_id: '' })); setParentSearch('') }}
                className="mt-1 text-xs text-red-500 hover:underline">清除选择</button>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">备注</label>
          <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">显微照片</label>
          <div className="flex items-center gap-3 mb-2">
            <select value={photoType} onChange={(e) => setPhotoType(e.target.value as 'pre_freeze' | 'post_thaw' | 'observation')}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs">
              <option value="pre_freeze">冻存前</option>
              <option value="post_thaw">复苏后</option>
              <option value="observation">观察</option>
            </select>
            <input type="text" value={photoLabel} onChange={(e) => setPhotoLabel(e.target.value)} placeholder="照片标注"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:border-teal-400"
            onClick={() => fileRef.current?.click()}>
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">拖拽照片到此处或点击上传</p>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
              const files = Array.from(e.target.files || [])
              setPhotos((prev) => [...prev, ...files])
            }} />
          </div>
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                  {f.name}
                  <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
          <button type="submit" disabled={submitting}
            className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50">
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </form>
    </div>
  )
}
