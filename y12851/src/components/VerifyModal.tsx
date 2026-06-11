import { useState } from 'react'
import type { BuoyRecord } from '@/types'
import { useStore } from '@/store/useStore'
import { METRIC_DEFS } from '@/utils/calcEngine'
import { X, Save } from 'lucide-react'

interface VerifyModalProps {
  record: BuoyRecord
  onClose: () => void
}

const METRIC_KEYS = ['dissolved_oxygen', 'ph', 'turbidity', 'conductivity', 'water_temp', 'chlorophyll_a'] as const

export default function VerifyModal({ record, onClose }: VerifyModalProps) {
  const updateBuoyRecord = useStore((s) => s.updateBuoyRecord)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const k of METRIC_KEYS) {
      init[k] = record[k] !== null ? String(record[k]) : ''
    }
    return init
  })
  const [note, setNote] = useState('')

  const handleSave = () => {
    const patch: Partial<BuoyRecord> = {
      verified: true,
      verifiedBy: '当前助理',
      verifiedAt: new Date().toISOString(),
      verifyNote: note || null,
    }
    for (const k of METRIC_KEYS) {
      const v = values[k]
      if (v === '') {
        (patch as Record<string, unknown>)[k] = null
      } else {
        const num = Number(v)
        if (!isNaN(num)) {
          (patch as Record<string, unknown>)[k] = num
        }
      }
    }
    updateBuoyRecord(record.id, patch)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ocean-700/50">
          <div>
            <h3 className="text-lg font-semibold text-ocean-50">复核修正</h3>
            <p className="text-sm text-ocean-400 mt-0.5">
              {record.stationName} · {new Date(record.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
          <button onClick={onClose} className="text-ocean-400 hover:text-ocean-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {METRIC_DEFS.map((def) => {
            const k = def.key
            const original = record[k]
            return (
              <div key={k} className="flex items-center gap-4">
                <div className="w-28 shrink-0">
                  <span className="text-sm text-ocean-300">{def.label}</span>
                  <span className="text-xs text-ocean-500 ml-1">({def.unit || '无量纲'})</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm font-mono text-ocean-400 w-20 text-right">
                    {original !== null ? String(original) : '—'}
                  </span>
                  <span className="text-ocean-500">→</span>
                  <input
                    type="number"
                    step="any"
                    className="input-field flex-1 font-mono text-sm"
                    value={values[k]}
                    onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="留空表示缺失"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-ocean-700/50">
          <label className="text-sm text-ocean-300 block mb-2">修正原因（必填）</label>
          <textarea
            className="input-field w-full text-sm resize-none"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="说明修正原因，如：传感器校准后更正值"
          />
        </div>

        <div className="px-6 py-4 border-t border-ocean-700/50 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            保存修正
          </button>
        </div>
      </div>
    </div>
  )
}
