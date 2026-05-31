import { useState } from 'react'
import { Upload, Plus, Trash2, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { usePumpStore } from '@/store/usePumpStore'
import type { LocalResistanceItem, ImportBatch } from '@/types'

type Step = 1 | 2

const FLOW_UNITS: { value: string; label: string }[] = [
  { value: 'L/s', label: 'L/s' },
  { value: 'm3/h', label: 'm³/h' },
  { value: 'm3/s', label: 'm³/s' },
]
const LENGTH_UNITS: { value: string; label: string }[] = [
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
]

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyItem(): LocalResistanceItem {
  return { id: genId(), name: '', coefficient: 0, quantity: 1 }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function BatchRecord({ batch }: { batch: ImportBatch }) {
  const label = batch.batchType === 'flow_and_diameter' ? '流量与管径' : '局部阻力'
  return (
    <div className="card p-3 mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="badge-warning text-xs px-2 py-0.5 rounded">{label}</span>
        <span className="value-text text-xs opacity-70">{formatTime(batch.importedAt)}</span>
      </div>
      {batch.changes.length === 0 && (
        <div className="value-text text-xs opacity-50">无变更</div>
      )}
      {batch.changes.map((c, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <span className="label-text">{c.fieldLabel}:</span>
          <span className="value-text line-through opacity-50">{String(c.oldValue)}</span>
          <ArrowRight className="w-3 h-3 text-amber-500" />
          <span className="value-unit text-amber-400 font-semibold">{String(c.newValue)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ImportPanel() {
  const { importBatch1, importBatch2, importBatches } = usePumpStore()
  const [step, setStep] = useState<Step>(1)
  const [batch1Done, setBatch1Done] = useState(false)

  const [flowValue, setFlowValue] = useState('')
  const [flowUnit, setFlowUnit] = useState<string>('L/s')
  const [diameterValue, setDiameterValue] = useState('')
  const [diameterUnit, setDiameterUnit] = useState<string>('mm')
  const [lengthValue, setLengthValue] = useState('')
  const [lengthUnit, setLengthUnit] = useState<string>('m')
  const [headValue, setHeadValue] = useState('')
  const [headUnit, setHeadUnit] = useState<string>('m')
  const [hazenWilliamsC, setHazenWilliamsC] = useState(130)
  const [marginFactor, setMarginFactor] = useState(10)

  const [items, setItems] = useState<LocalResistanceItem[]>([emptyItem()])

  function handleBatch1() {
    if (!flowValue || !diameterValue) return
    const df = { value: Number(flowValue), unit: flowUnit }
    const pd = { value: Number(diameterValue), unit: diameterUnit }
    const pl = lengthValue ? { value: Number(lengthValue), unit: lengthUnit } : undefined
    const sh = headValue ? { value: Number(headValue), unit: headUnit } : undefined
    importBatch1(df, pd, pl, sh)
    setBatch1Done(true)
    setStep(2)
  }

  function handleBatch2() {
    const valid = items.filter(it => it.name && it.coefficient > 0)
    if (valid.length === 0) return
    importBatch2(valid)
  }

  function handleSample() {
    setFlowValue('25')
    setFlowUnit('m3/h')
    setDiameterValue('150')
    setDiameterUnit('mm')
    setLengthValue('200')
    setLengthUnit('m')
    setHeadValue('15')
    setHeadUnit('m')
    setHazenWilliamsC(130)
    setMarginFactor(10)
    setItems([
      { id: genId(), name: '弯头 90°', coefficient: 0.9, quantity: 4 },
      { id: genId(), name: '闸阀', coefficient: 0.2, quantity: 2 },
      { id: genId(), name: '止回阀', coefficient: 2.5, quantity: 1 },
    ])
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  function updateItem(id: string, field: keyof LocalResistanceItem, value: string | number) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-text text-lg font-bold">参数导入</h2>
        <button className="btn-amber text-xs px-3 py-1.5 rounded flex items-center gap-1" onClick={handleSample}>
          <Upload className="w-3.5 h-3.5" />
          样例导入
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${step === 1 ? 'bg-amber-500 text-navy-900' : batch1Done ? 'bg-green-600 text-white' : 'bg-navy-700 text-navy-300'}`}>
          {batch1Done ? <CheckCircle className="w-4 h-4" /> : <span>1</span>}
          <span>流量与管径</span>
        </div>
        <div className="w-8 h-px bg-navy-600" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${step === 2 ? 'bg-amber-500 text-navy-900' : 'bg-navy-700 text-navy-300'}`}>
          <span>2</span>
          <span>局部阻力</span>
        </div>
      </div>

      {step === 1 && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text text-xs block mb-1">设计流量 *</label>
              <div className="flex gap-1">
                <input className="input-field flex-1" type="number" value={flowValue} onChange={e => setFlowValue(e.target.value)} placeholder="0" />
                <select className="select-field w-20" value={flowUnit} onChange={e => setFlowUnit(e.target.value)}>
                  {FLOW_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label-text text-xs block mb-1">管径 *</label>
              <div className="flex gap-1">
                <input className="input-field flex-1" type="number" value={diameterValue} onChange={e => setDiameterValue(e.target.value)} placeholder="0" />
                <select className="select-field w-20" value={diameterUnit} onChange={e => setDiameterUnit(e.target.value)}>
                  {LENGTH_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text text-xs block mb-1">管长</label>
              <div className="flex gap-1">
                <input className="input-field flex-1" type="number" value={lengthValue} onChange={e => setLengthValue(e.target.value)} placeholder="0" />
                <select className="select-field w-20" value={lengthUnit} onChange={e => setLengthUnit(e.target.value)}>
                  {LENGTH_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label-text text-xs block mb-1">静扬程</label>
              <div className="flex gap-1">
                <input className="input-field flex-1" type="number" value={headValue} onChange={e => setHeadValue(e.target.value)} placeholder="0" />
                <select className="select-field w-20" value={headUnit} onChange={e => setHeadUnit(e.target.value)}>
                  <option value="m">m</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text text-xs block mb-1">Hazen-Williams C</label>
              <input className="input-field w-full" type="number" value={hazenWilliamsC} onChange={e => setHazenWilliamsC(Number(e.target.value))} />
            </div>
            <div>
              <label className="label-text text-xs block mb-1">裕度系数 (%)</label>
              <input className="input-field w-full" type="number" value={marginFactor} onChange={e => setMarginFactor(Number(e.target.value))} />
            </div>
          </div>

          {!flowValue || !diameterValue ? (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>设计流量和管径为必填项</span>
            </div>
          ) : null}

          <button className="btn-primary w-full py-2 rounded flex items-center justify-center gap-2" onClick={handleBatch1} disabled={!flowValue || !diameterValue}>
            <Upload className="w-4 h-4" />
            导入 Batch 1
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="label-text text-sm font-semibold">局部阻力系数</span>
            <button className="btn-amber text-xs px-2 py-1 rounded flex items-center gap-1" onClick={addItem}>
              <Plus className="w-3.5 h-3.5" />
              添加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-navy-600">
                  <th className="label-text text-left py-1.5 px-1">名称</th>
                  <th className="label-text text-left py-1.5 px-1">系数 ξ</th>
                  <th className="label-text text-left py-1.5 px-1">数量</th>
                  <th className="py-1.5 px-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-b border-navy-700">
                    <td className="py-1 px-1">
                      <input className="input-field w-full text-xs" value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)} placeholder="弯头" />
                    </td>
                    <td className="py-1 px-1">
                      <input className="input-field w-full text-xs" type="number" step="0.1" value={it.coefficient || ''} onChange={e => updateItem(it.id, 'coefficient', Number(e.target.value))} placeholder="0.9" />
                    </td>
                    <td className="py-1 px-1">
                      <input className="input-field w-16 text-xs" type="number" min="1" value={it.quantity} onChange={e => updateItem(it.id, 'quantity', Number(e.target.value))} />
                    </td>
                    <td className="py-1 px-1">
                      <button className="text-red-400 hover:text-red-300" onClick={() => removeItem(it.id)} disabled={items.length <= 1}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-1.5 rounded text-sm bg-navy-700 text-navy-300 hover:bg-navy-600" onClick={() => setStep(1)}>
              返回
            </button>
            <button className="btn-primary flex-1 py-1.5 rounded flex items-center justify-center gap-2" onClick={handleBatch2} disabled={items.filter(it => it.name && it.coefficient > 0).length === 0}>
              <Upload className="w-4 h-4" />
              导入 Batch 2
            </button>
          </div>
        </div>
      )}

      {importBatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="label-text text-sm font-semibold">导入记录</h3>
          {[...importBatches].reverse().map(batch => (
            <BatchRecord key={batch.id} batch={batch} />
          ))}
        </div>
      )}
    </div>
  )
}
