import { useState, useRef, type DragEvent } from 'react'
import { Upload, FileText, X, Link2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import type { RecordStatus } from '@/types'

interface ScanForm {
  songName: string
  songAlias: string
  timecodeStart: string
  timecodeEnd: string
  authPeriodStart: string
  authPeriodEnd: string
  status: RecordStatus
  exceptionReason: string
  remark: string
}

const EMPTY_FORM: ScanForm = {
  songName: '',
  songAlias: '',
  timecodeStart: '',
  timecodeEnd: '',
  authPeriodStart: '',
  authPeriodEnd: '',
  status: 'pending',
  exceptionReason: '',
  remark: '',
}

export default function ContractUpload() {
  const { records, addRecord, updateRecord, addRemark } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [form, setForm] = useState<ScanForm>(EMPTY_FORM)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      const defaultName = file.name.replace(/\.[^.]+$/, '')
      setPreview({ url, name: file.name })
      setForm({ ...EMPTY_FORM, songName: defaultName })
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

  const clearAll = () => {
    setPreview(null)
    setSelectedRecordId('')
    setForm(EMPTY_FORM)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const linkToRecord = () => {
    if (!preview || !selectedRecordId) return
    updateRecord(selectedRecordId, {
      contractScanUrl: preview.url,
      contractScanName: preview.name,
    })
    clearAll()
  }

  const createFromScan = () => {
    if (!preview || !form.songName.trim()) return
    addRecord({
      songName: form.songName.trim(),
      songAlias: form.songAlias.split(',').map((s) => s.trim()).filter(Boolean),
      timecodeStart: form.timecodeStart.trim(),
      timecodeEnd: form.timecodeEnd.trim(),
      authPeriodStart: form.authPeriodStart,
      authPeriodEnd: form.authPeriodEnd,
      status: form.status,
      exceptionReason: form.exceptionReason.trim(),
      contractScanUrl: preview.url,
      contractScanName: preview.name,
    })
    const newest = useStore.getState().records.at(-1)
    if (newest && form.remark.trim()) {
      addRemark(newest.id, form.remark.trim())
    }
    clearAll()
  }

  const setField = (key: keyof ScanForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const inputCls = 'w-full rounded-lg border border-[#555] bg-[#1a1a2e] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#888] focus:border-[#f0a500] focus:outline-none'
  const labelCls = 'mb-1 block text-xs text-[#e8e8e8]/70'

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
          <p className="mt-1 text-xs text-[#888]">支持从合同扫描件中提取并录入曲名、时码、授权期限等信息</p>
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
              <p className="mt-1 text-xs text-[#888]">请从扫描件中提取并录入以下信息</p>
            </div>
            <button onClick={clearAll} className="text-[#888] hover:text-[#e8e8e8]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>曲名 *</label>
              <input
                value={form.songName}
                onChange={(e) => setField('songName', e.target.value)}
                className={inputCls}
                placeholder="合同上的曲目名称"
              />
            </div>
            <div>
              <label className={labelCls}>别名（逗号分隔）</label>
              <input
                value={form.songAlias}
                onChange={(e) => setField('songAlias', e.target.value)}
                className={inputCls}
                placeholder="别名1, 别名2"
              />
            </div>
            <div>
              <label className={labelCls}>时码起点</label>
              <input
                value={form.timecodeStart}
                onChange={(e) => setField('timecodeStart', e.target.value)}
                className={inputCls}
                placeholder="HH:MM:SS:FF"
              />
            </div>
            <div>
              <label className={labelCls}>时码终点</label>
              <input
                value={form.timecodeEnd}
                onChange={(e) => setField('timecodeEnd', e.target.value)}
                className={inputCls}
                placeholder="HH:MM:SS:FF"
              />
            </div>
            <div>
              <label className={labelCls}>授权起始</label>
              <input
                type="date"
                value={form.authPeriodStart}
                onChange={(e) => setField('authPeriodStart', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>授权截止</label>
              <input
                type="date"
                value={form.authPeriodEnd}
                onChange={(e) => setField('authPeriodEnd', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>状态</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value as RecordStatus)}
                className={inputCls}
              >
                {(Object.entries(STATUS_LABELS) as [RecordStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>异常原因</label>
              <textarea
                value={form.exceptionReason}
                onChange={(e) => setField('exceptionReason', e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="如有时码重叠、授权异常等，请在此说明"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>备注（从合同扫描件中提取的说明）</label>
              <textarea
                value={form.remark}
                onChange={(e) => setField('remark', e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="授权期限、排期约束等藏在合同备注里的信息"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#3a3a55]">
            <div>
              <label className={labelCls}>关联到已有记录</label>
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
              disabled={!form.songName.trim()}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#f0a500] px-4 py-2 text-sm font-medium text-[#1a1a2e] shadow-[0_3px_0_#b37800] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />保存录入信息并创建记录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
