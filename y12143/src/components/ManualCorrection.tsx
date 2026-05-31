import { useState } from 'react'
import { Edit3, Save, RotateCcw, X } from 'lucide-react'
import { usePumpStore } from '@/store/usePumpStore'
import type { PipeParams, LengthUnit } from '@/types'

type FieldKey = 'pipeDiameter' | 'pipeLength' | 'staticHead' | 'hazenWilliamsC' | 'marginFactor'

interface FieldConfig {
  key: FieldKey
  label: string
  isUnitSpec: boolean
  units?: LengthUnit[]
}

const fields: FieldConfig[] = [
  { key: 'pipeDiameter', label: '管径', isUnitSpec: true, units: ['mm', 'cm', 'm'] },
  { key: 'pipeLength', label: '管长', isUnitSpec: true, units: ['m', 'cm', 'mm'] },
  { key: 'staticHead', label: '静扬程', isUnitSpec: true, units: ['m'] },
  { key: 'hazenWilliamsC', label: '海曾-威廉C', isUnitSpec: false },
  { key: 'marginFactor', label: '裕量系数', isUnitSpec: false },
]

export default function ManualCorrection() {
  const params = usePumpStore(s => s.params)
  const applyCorrection = usePumpStore(s => s.applyCorrection)
  const updateParam = usePumpStore(s => s.updateParam)
  const recalculate = usePumpStore(s => s.recalculate)

  const [directMode, setDirectMode] = useState(false)
  const [editingKey, setEditingKey] = useState<FieldKey | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editUnit, setEditUnit] = useState<LengthUnit>('m')
  const [reason, setReason] = useState('')

  const getDisplayValue = (key: FieldKey): string => {
    const p = params[key]
    if (key === 'marginFactor') return `${((p as number) * 100).toFixed(1)}%`
    if (key === 'hazenWilliamsC') return String(p)
    const spec = p as { value: number; unit: LengthUnit }
    return `${spec.value} ${spec.unit}`
  }

  const getRawValue = (key: FieldKey): string => {
    const p = params[key]
    if (key === 'marginFactor') return String((p as number) * 100)
    if (key === 'hazenWilliamsC') return String(p)
    return String((p as { value: number; unit: LengthUnit }).value)
  }

  const getCurrentUnit = (key: FieldKey): LengthUnit => {
    if (!fields.find(f => f.key === key)?.isUnitSpec) return 'm'
    return (params[key] as { value: number; unit: LengthUnit }).unit
  }

  const openCorrection = (key: FieldKey) => {
    setEditingKey(key)
    setEditValue(getRawValue(key))
    setEditUnit(getCurrentUnit(key))
    setReason('')
  }

  const confirmCorrection = () => {
    if (!editingKey) return
    const field = fields.find(f => f.key === editingKey)!

    let newDisplay: string
    let paramValue: PipeParams[FieldKey]

    if (field.isUnitSpec) {
      const numVal = parseFloat(editValue)
      paramValue = { value: isNaN(numVal) ? 0 : numVal, unit: editUnit } as PipeParams[FieldKey]
      newDisplay = `${editValue} ${editUnit}`
    } else if (editingKey === 'marginFactor') {
      const pct = parseFloat(editValue)
      paramValue = (isNaN(pct) ? 0 : pct / 100) as PipeParams[FieldKey]
      newDisplay = `${editValue}%`
    } else {
      const numVal = parseFloat(editValue)
      paramValue = (isNaN(numVal) ? 0 : numVal) as PipeParams[FieldKey]
      newDisplay = editValue
    }

    applyCorrection(editingKey, field.label, getDisplayValue(editingKey), newDisplay, reason)
    updateParam(editingKey, paramValue)
    setEditingKey(null)
  }

  const handleDirectChange = (key: FieldKey, raw: string, unit?: LengthUnit) => {
    const field = fields.find(f => f.key === key)!
    if (field.isUnitSpec) {
      const numVal = parseFloat(raw)
      updateParam(key, { value: isNaN(numVal) ? 0 : numVal, unit: unit ?? getCurrentUnit(key) } as unknown as PipeParams[typeof key])
    } else if (key === 'marginFactor') {
      const pct = parseFloat(raw)
      updateParam(key, (isNaN(pct) ? 0 : pct / 100) as unknown as PipeParams[typeof key])
    } else {
      const numVal = parseFloat(raw)
      updateParam(key, (isNaN(numVal) ? 0 : numVal) as unknown as PipeParams[typeof key])
    }
  }

  return (
    <div className="card p-4 space-y-4 bg-navy-900 text-white">
      <div className="flex items-center justify-between">
        <h3 className="label-text text-lg font-bold">手动修正</h3>
        <button
          className={`btn-${directMode ? 'amber' : 'secondary'} text-xs px-3 py-1 rounded`}
          onClick={() => setDirectMode(!directMode)}
        >
          {directMode ? '直接修改: 开' : '直接修改: 关'}
        </button>
      </div>

      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.key} className="flex items-center gap-2">
            <span className="label-text w-28 shrink-0">{field.label}</span>

            {directMode ? (
              <>
                <input
                  className="input-field w-24 text-center"
                  type="number"
                  value={getRawValue(field.key)}
                  onChange={e => handleDirectChange(field.key, e.target.value, editUnit)}
                />
                {field.isUnitSpec && field.units && (
                  <select
                    className="select-field w-16"
                    value={getCurrentUnit(field.key)}
                    onChange={e => handleDirectChange(field.key, getRawValue(field.key), e.target.value as LengthUnit)}
                  >
                    {field.units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
                {!field.isUnitSpec && field.key === 'marginFactor' && <span className="text-xs text-gray-400">%</span>}
              </>
            ) : (
              <>
                <span className="input-field w-32 text-center bg-navy-800 py-1 rounded">
                  {getDisplayValue(field.key)}
                </span>
                <button className="btn-primary text-xs px-2 py-1 rounded flex items-center gap-1" onClick={() => openCorrection(field.key)}>
                  <Edit3 size={12} /> 修正
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <button className="btn-amber w-full py-2 rounded flex items-center justify-center gap-2" onClick={() => recalculate('correction')}>
        <RotateCcw size={16} /> 重算
      </button>

      {editingKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingKey(null)}>
          <div className="card bg-navy-800 p-6 rounded-lg w-96 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold">修正 - {fields.find(f => f.key === editingKey)?.label}</h4>
              <button onClick={() => setEditingKey(null)}><X size={18} /></button>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">当前值：</span>
                <span>{getDisplayValue(editingKey)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">新值：</span>
                <input
                  className="input-field flex-1"
                  type="number"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                />
                {fields.find(f => f.key === editingKey)?.isUnitSpec && fields.find(f => f.key === editingKey)?.units && (
                  <select
                    className="select-field w-16"
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value as LengthUnit)}
                  >
                    {fields.find(f => f.key === editingKey)!.units!.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
                {editingKey === 'marginFactor' && <span>%</span>}
              </div>
            </div>

            <div>
              <span className="label-text text-sm">修正原因：</span>
              <textarea
                className="input-field w-full mt-1 h-20 resize-none"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="请输入修正原因…"
              />
            </div>

            <button
              className="btn-primary w-full py-2 rounded flex items-center justify-center gap-2"
              onClick={confirmCorrection}
              disabled={!reason.trim()}
            >
              <Save size={16} /> 确认修正
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
