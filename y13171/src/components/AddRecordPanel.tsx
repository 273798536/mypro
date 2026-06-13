import { useState } from 'react'
import { useAppStore } from '@/store'
import type { NoteSource } from '@/types'
import { Plus, History, X } from 'lucide-react'

type FormMode = 'normal' | 'backfill'

const INITIAL_FORM = {
  deviceId: '',
  measuredValue: '',
  threshold: '10.0',
  sceneLabel: '',
  note: '',
  noteSource: 'manual' as NoteSource,
  isBackfilled: false,
  originalTime: '',
}

export default function AddRecordPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<FormMode>('normal')
  const [form, setForm] = useState(INITIAL_FORM)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const addRecord = useAppStore((s) => s.addRecord)

  const handleSubmit = () => {
    if (!form.deviceId || !form.measuredValue || !form.sceneLabel || !form.note) return

    const measuredValue = parseFloat(form.measuredValue)
    const threshold = parseFloat(form.threshold)
    const isBackfilled = mode === 'backfill'
    const now = new Date().toISOString()

    const sourceTag = isBackfilled ? '补录自原始记录' : form.noteSource === 'sensor' ? '传感器实测' : '人工录入'

    const record = {
      deviceId: form.deviceId.trim(),
      measuredValue,
      threshold,
      sceneLabel: form.sceneLabel.trim(),
      note: form.note.trim(),
      noteSource: isBackfilled ? 'backfill' as NoteSource : form.noteSource,
      isBackfilled,
      originalTime: isBackfilled && form.originalTime ? new Date(form.originalTime).toISOString() : null,
      recordTime: now,
      sourceTag,
    }

    const id = addRecord(record)
    const store = useAppStore.getState()
    const newRecord = store.records.find((r) => r.id === id)

    if (newRecord?.status === 'suspended') {
      setResultMessage(`设备编号 ${form.deviceId} 与已有预警记录重复，已自动挂起，需运营主管确认`)
    } else if (newRecord?.status === 'warning') {
      setResultMessage(`记录已添加，挠度 ${measuredValue.toFixed(1)}mm 超过阈值 ${threshold.toFixed(1)}mm，状态：预警`)
    } else {
      setResultMessage(`记录已添加，挠度 ${measuredValue.toFixed(1)}mm 在安全范围内，状态：正常`)
    }

    setForm(INITIAL_FORM)
    setTimeout(() => setResultMessage(null), 5000)
  }

  const handleClose = () => {
    setIsOpen(false)
    setForm(INITIAL_FORM)
    setMode('normal')
    setResultMessage(null)
  }

  if (!isOpen) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => { setIsOpen(true); setMode('normal') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange text-white rounded-lg text-sm font-medium hover:bg-orange-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          记录预警
        </button>
        <button
          onClick={() => { setIsOpen(true); setMode('backfill') }}
          className="flex items-center gap-2 px-4 py-2.5 border border-navy/20 text-navy rounded-lg text-sm font-medium hover:bg-navy/5 transition-colors"
        >
          <History className="w-4 h-4" />
          补录记录
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-surface-dark p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-navy text-sm">
          {mode === 'backfill' ? '补录记录' : '记录预警'}
        </h3>
        <button onClick={handleClose} className="text-steel hover:text-navy transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {mode === 'backfill' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
          补录模式：请填写原始事件时间，系统将自动标注"补录"标签
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-steel mb-1">设备编号 *</label>
          <input
            type="text"
            value={form.deviceId}
            onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
            placeholder="如 SB-DQ-0037"
            className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
          />
        </div>
        <div>
          <label className="block text-xs text-steel mb-1">数据来源</label>
          <select
            value={form.noteSource}
            onChange={(e) => setForm({ ...form, noteSource: e.target.value as NoteSource })}
            disabled={mode === 'backfill'}
            className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 disabled:bg-surface"
          >
            <option value="manual">人工录入</option>
            <option value="sensor">传感器实测</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-steel mb-1">实测值 (mm) *</label>
          <input
            type="number"
            step="0.1"
            value={form.measuredValue}
            onChange={(e) => setForm({ ...form, measuredValue: e.target.value })}
            placeholder="如 12.8"
            className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
          />
        </div>
        <div>
          <label className="block text-xs text-steel mb-1">阈值 (mm)</label>
          <input
            type="number"
            step="0.1"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
          />
        </div>
      </div>

      {mode === 'backfill' && (
        <div>
          <label className="block text-xs text-steel mb-1">原始事件时间 *</label>
          <input
            type="datetime-local"
            value={form.originalTime}
            onChange={(e) => setForm({ ...form, originalTime: e.target.value })}
            className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
          />
        </div>
      )}

      <div>
        <label className="block text-xs text-steel mb-1">场景标注 *（将用于侧边说明和页面摘要）</label>
        <input
          type="text"
          value={form.sceneLabel}
          onChange={(e) => setForm({ ...form, sceneLabel: e.target.value })}
          placeholder="如：跨中挠度超限"
          className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
        />
      </div>

      <div>
        <label className="block text-xs text-steel mb-1">维修备注 *（与报警同层展示）</label>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="如：巡检发现跨中下挠明显，已限速"
          rows={2}
          className="w-full px-3 py-2 border border-surface-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!form.deviceId || !form.measuredValue || !form.sceneLabel || !form.note}
        className="w-full py-2.5 bg-orange text-white rounded-lg text-sm font-medium hover:bg-orange-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {mode === 'backfill' ? '提交补录' : '提交记录'}
      </button>

      {resultMessage && (
        <div className="bg-navy/5 border border-navy/10 rounded-lg p-3 text-xs text-navy leading-relaxed">
          {resultMessage}
        </div>
      )}
    </div>
  )
}
