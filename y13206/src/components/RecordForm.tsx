import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { STATUS_LABELS } from '@/types'
import type { RecordStatus } from '@/types'

const EMPTY = {
  songName: '',
  songAlias: '',
  timecodeStart: '',
  timecodeEnd: '',
  authPeriodStart: '',
  authPeriodEnd: '',
  status: 'pending' as RecordStatus,
  exceptionReason: '',
  contractScanUrl: null as string | null,
  contractScanName: null as string | null,
}

export default function RecordForm() {
  const { isFormOpen, editingRecord, closeForm, addRecord, updateRecord } = useStore()
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (editingRecord) {
      setForm({
        songName: editingRecord.songName,
        songAlias: editingRecord.songAlias.join(', '),
        timecodeStart: editingRecord.timecodeStart,
        timecodeEnd: editingRecord.timecodeEnd,
        authPeriodStart: editingRecord.authPeriodStart,
        authPeriodEnd: editingRecord.authPeriodEnd,
        status: editingRecord.status,
        exceptionReason: editingRecord.exceptionReason,
        contractScanUrl: editingRecord.contractScanUrl,
        contractScanName: editingRecord.contractScanName,
      })
    } else {
      setForm(EMPTY)
    }
  }, [editingRecord, isFormOpen])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = () => {
    if (!form.songName.trim()) return
    const payload = {
      songName: form.songName.trim(),
      songAlias: form.songAlias.split(',').map((s) => s.trim()).filter(Boolean),
      timecodeStart: form.timecodeStart,
      timecodeEnd: form.timecodeEnd,
      authPeriodStart: form.authPeriodStart,
      authPeriodEnd: form.authPeriodEnd,
      status: form.status,
      exceptionReason: form.exceptionReason,
      contractScanUrl: form.contractScanUrl,
      contractScanName: form.contractScanName,
    }
    if (editingRecord) {
      updateRecord(editingRecord.id, payload)
    } else {
      addRecord(payload)
    }
    closeForm()
  }

  if (!isFormOpen) return null

  const inputCls = 'w-full rounded-lg border border-[#555] bg-[#1a1a2e] px-3 py-2 text-sm text-[#e8e8e8] placeholder:text-[#888] focus:border-[#f0a500] focus:outline-none'
  const labelCls = 'mb-1 block text-xs text-[#e8e8e8]/70'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={closeForm} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col bg-[#2d2d44] shadow-2xl transition-transform">
        <div className="flex items-center justify-between border-b border-[#555] px-5 py-4">
          <h3 className="text-lg font-semibold text-[#e8e8e8]">
            {editingRecord ? '编辑记录' : '新建记录'}
          </h3>
          <button onClick={closeForm} className="text-[#888] hover:text-[#e8e8e8]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>曲名 *</label>
            <input value={form.songName} onChange={(e) => set('songName', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>别名（逗号分隔）</label>
            <input value={form.songAlias} onChange={(e) => set('songAlias', e.target.value)} className={inputCls} placeholder="别名1, 别名2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>时码起点</label>
              <input value={form.timecodeStart} onChange={(e) => set('timecodeStart', e.target.value)} className={inputCls} placeholder="HH:MM:SS:FF" />
            </div>
            <div>
              <label className={labelCls}>时码终点</label>
              <input value={form.timecodeEnd} onChange={(e) => set('timecodeEnd', e.target.value)} className={inputCls} placeholder="HH:MM:SS:FF" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>授权起始</label>
              <input type="date" value={form.authPeriodStart} onChange={(e) => set('authPeriodStart', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>授权截止</label>
              <input type="date" value={form.authPeriodEnd} onChange={(e) => set('authPeriodEnd', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>状态</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              {(Object.entries(STATUS_LABELS) as [RecordStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>异常原因</label>
            <textarea value={form.exceptionReason} onChange={(e) => set('exceptionReason', e.target.value)} rows={3} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#555] px-5 py-4">
          <button onClick={handleSave} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#f0a500] py-2 text-sm font-medium text-[#1a1a2e] shadow-[0_3px_0_#b37800]">
            <Save className="h-4 w-4" />保存
          </button>
          <button onClick={closeForm} className="flex-1 rounded-lg border border-[#555] py-2 text-sm text-[#e8e8e8] hover:border-[#f0a500]/60">
            取消
          </button>
        </div>
      </div>
    </>
  )
}
