import { useState } from 'react'
import { useAppStore } from '@/store'
import type { NoteSource } from '@/types'
import { Plus, History, X, AlertCircle, CheckCircle2 } from 'lucide-react'

type FormMode = 'normal' | 'backfill'

interface FormState {
  deviceId: string
  measuredValue: string
  threshold: string
  sceneLabel: string
  note: string
  noteSource: NoteSource
  isBackfilled: boolean
  originalTime: string
}

interface FormErrors {
  deviceId?: string
  measuredValue?: string
  threshold?: string
  sceneLabel?: string
  note?: string
  originalTime?: string
  submit?: string
}

const INITIAL_FORM: FormState = {
  deviceId: '',
  measuredValue: '',
  threshold: '10.0',
  sceneLabel: '',
  note: '',
  noteSource: 'manual',
  isBackfilled: false,
  originalTime: '',
}

const DEFAULT_THRESHOLD = 10.0

const validateForm = (form: FormState, mode: FormMode): FormErrors => {
  const errors: FormErrors = {}

  if (!form.deviceId.trim()) {
    errors.deviceId = '请填写设备编号'
  } else if (form.deviceId.trim().length > 40) {
    errors.deviceId = '设备编号过长（超过40字符）'
  }

  if (!form.measuredValue.trim()) {
    errors.measuredValue = '请填写实测值'
  } else {
    const mv = parseFloat(form.measuredValue)
    if (Number.isNaN(mv)) {
      errors.measuredValue = '实测值必须是数字'
    } else if (mv < 0) {
      errors.measuredValue = '实测值不能为负数'
    } else if (mv > 1000) {
      errors.measuredValue = '实测值超过合理范围（>1000mm）'
    }
  }

  if (form.threshold.trim() === '') {
    errors.threshold = '请填写阈值（默认10.0mm）'
  } else {
    const th = parseFloat(form.threshold)
    if (Number.isNaN(th)) {
      errors.threshold = '阈值必须是数字'
    } else if (th <= 0) {
      errors.threshold = '阈值必须大于0'
    } else if (th > 1000) {
      errors.threshold = '阈值超过合理范围（>1000mm）'
    }
  }

  if (!form.sceneLabel.trim()) {
    errors.sceneLabel = '请填写场景标注（将用于侧边说明和页面摘要）'
  } else if (form.sceneLabel.trim().length > 50) {
    errors.sceneLabel = '场景标注过长（超过50字符）'
  }

  if (!form.note.trim()) {
    errors.note = '请填写维修备注（与报警同层展示）'
  } else if (form.note.trim().length > 500) {
    errors.note = '维修备注过长（超过500字符）'
  }

  if (mode === 'backfill') {
    if (!form.originalTime) {
      errors.originalTime = '请填写原始事件时间'
    } else {
      const d = new Date(form.originalTime)
      if (Number.isNaN(d.getTime())) {
        errors.originalTime = '原始事件时间格式无效'
      } else if (d.getTime() > Date.now()) {
        errors.originalTime = '原始事件时间不能晚于当前时间'
      }
    }
  }

  return errors
}

export default function AddRecordPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<FormMode>('normal')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const addRecord = useAppStore((s) => s.addRecord)

  const setError = (key: keyof FormErrors, value: string | undefined) => {
    setErrors((prev) => ({ ...prev, [key]: value }))
  }

  const validateAndSubmit = (): boolean => {
    const found = validateForm(form, mode)
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const handleSubmit = () => {
    if (!validateAndSubmit()) {
      setResultMessage({ type: 'error', text: '提交失败：请检查并修正表单中的错误' })
      setTimeout(() => setResultMessage(null), 5000)
      return
    }

    const measuredValue = parseFloat(form.measuredValue)
    const threshold = parseFloat(form.threshold)
    const isBackfilled = mode === 'backfill'
    const now = new Date().toISOString()

    let originalTime: string | null = null
    if (isBackfilled && form.originalTime) {
      originalTime = new Date(form.originalTime).toISOString()
      if (Number.isNaN(new Date(originalTime).getTime())) {
        setError('originalTime', '原始事件时间格式无效')
        return
      }
    }

    const sourceTag = isBackfilled
      ? '补录自原始记录'
      : form.noteSource === 'sensor'
        ? '传感器实测'
        : '人工录入'

    try {
      const record = {
        deviceId: form.deviceId.trim(),
        measuredValue,
        threshold,
        sceneLabel: form.sceneLabel.trim(),
        note: form.note.trim(),
        noteSource: isBackfilled ? ('backfill' as NoteSource) : form.noteSource,
        isBackfilled,
        originalTime,
        recordTime: now,
        sourceTag,
      }

      const id = addRecord(record)
      const store = useAppStore.getState()
      const newRecord = store.records.find((r) => r.id === id)

      let text = ''
      if (newRecord?.status === 'suspended') {
        text = `设备编号 ${form.deviceId.trim()} 与已有预警记录重复，已自动挂起，需运营主管确认`
      } else if (newRecord?.status === 'warning') {
        text = `记录已添加，挠度 ${measuredValue.toFixed(1)}mm 超过阈值 ${threshold.toFixed(1)}mm，状态：预警`
      } else if (newRecord?.status === 'normal') {
        text = `记录已添加，挠度 ${measuredValue.toFixed(1)}mm 在安全范围内，状态：正常`
      } else {
        text = '记录已添加'
      }

      setResultMessage({ type: 'success', text })
      setForm(INITIAL_FORM)
      setErrors({})
      setTimeout(() => setResultMessage(null), 6000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      setResultMessage({ type: 'error', text: `提交失败：${msg}（请刷新页面后重试）` })
      setTimeout(() => setResultMessage(null), 6000)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setForm(INITIAL_FORM)
    setMode('normal')
    setErrors({})
    setResultMessage(null)
  }

  const isFormValid = Object.keys(validateForm(form, mode)).length === 0

  const ErrorLabel = ({ error }: { error?: string }) =>
    error ? (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0" />
        {error}
      </p>
    ) : null

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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-start gap-1.5">
          <History className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>补录模式：请填写原始事件时间，系统将自动标注"补录"标签</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-steel mb-1">设备编号 *</label>
          <input
            type="text"
            value={form.deviceId}
            onChange={(e) => {
              setForm({ ...form, deviceId: e.target.value })
              if (errors.deviceId) setError('deviceId', undefined)
            }}
            onBlur={() => setErrors(validateForm(form, mode))}
            placeholder="如 SB-DQ-0037"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 ${
              errors.deviceId ? 'border-red-400 bg-red-50/40' : 'border-surface-dark'
            }`}
          />
          <ErrorLabel error={errors.deviceId} />
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
            min="0"
            value={form.measuredValue}
            onChange={(e) => {
              setForm({ ...form, measuredValue: e.target.value })
              if (errors.measuredValue) setError('measuredValue', undefined)
            }}
            onBlur={() => setErrors(validateForm(form, mode))}
            placeholder="如 12.8"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 ${
              errors.measuredValue ? 'border-red-400 bg-red-50/40' : 'border-surface-dark'
            }`}
          />
          <ErrorLabel error={errors.measuredValue} />
        </div>

        <div>
          <label className="block text-xs text-steel mb-1">阈值 (mm) *（默认 {DEFAULT_THRESHOLD.toFixed(1)}）</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={form.threshold}
            onChange={(e) => {
              setForm({ ...form, threshold: e.target.value })
              if (errors.threshold) setError('threshold', undefined)
            }}
            onBlur={(e) => {
              if (e.target.value.trim() === '') {
                setForm({ ...form, threshold: String(DEFAULT_THRESHOLD) })
              }
              setErrors(validateForm(form, mode))
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 ${
              errors.threshold ? 'border-red-400 bg-red-50/40' : 'border-surface-dark'
            }`}
          />
          <ErrorLabel error={errors.threshold} />
        </div>
      </div>

      {mode === 'backfill' && (
        <div>
          <label className="block text-xs text-steel mb-1">原始事件时间 *</label>
          <input
            type="datetime-local"
            value={form.originalTime}
            onChange={(e) => {
              setForm({ ...form, originalTime: e.target.value })
              if (errors.originalTime) setError('originalTime', undefined)
            }}
            onBlur={() => setErrors(validateForm(form, mode))}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 ${
              errors.originalTime ? 'border-red-400 bg-red-50/40' : 'border-surface-dark'
            }`}
          />
          <ErrorLabel error={errors.originalTime} />
        </div>
      )}

      <div>
        <label className="block text-xs text-steel mb-1">场景标注 *（将用于侧边说明和页面摘要）</label>
        <input
          type="text"
          value={form.sceneLabel}
          onChange={(e) => {
            setForm({ ...form, sceneLabel: e.target.value })
            if (errors.sceneLabel) setError('sceneLabel', undefined)
          }}
          onBlur={() => setErrors(validateForm(form, mode))}
          placeholder="如：跨中挠度超限"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 ${
            errors.sceneLabel ? 'border-red-400 bg-red-50/40' : 'border-surface-dark'
          }`}
        />
        <ErrorLabel error={errors.sceneLabel} />
      </div>

      <div>
        <label className="block text-xs text-steel mb-1">维修备注 *（与报警同层展示）</label>
        <textarea
          value={form.note}
          onChange={(e) => {
            setForm({ ...form, note: e.target.value })
            if (errors.note) setError('note', undefined)
          }}
          onBlur={() => setErrors(validateForm(form, mode))}
          placeholder="如：巡检发现跨中下挠明显，已限速"
          rows={2}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 resize-none ${
            errors.note ? 'border-red-400 bg-red-50/40' : 'border-surface-dark'
          }`}
        />
        <ErrorLabel error={errors.note} />
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errors.submit}</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isFormValid}
        className="w-full py-2.5 bg-orange text-white rounded-lg text-sm font-medium hover:bg-orange-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {mode === 'backfill' ? '提交补录' : '提交记录'}
      </button>

      {resultMessage && (
        <div
          className={`rounded-lg p-3 text-xs leading-relaxed flex items-start gap-1.5 border ${
            resultMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {resultMessage.type === 'success'
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span>{resultMessage.text}</span>
        </div>
      )}
    </div>
  )
}
