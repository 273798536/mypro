import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLabStore } from '../store'

export default function BatchForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addBatch = useLabStore((s) => s.addBatch)
  const getBatch = useLabStore((s) => s.getBatchById)
  const existing = id ? getBatch(id) : null

  const [form, setForm] = useState({
    batchNo: existing?.batchNo || '',
    reagentName: existing?.reagentName || '',
    reagentCasNo: existing?.reagentCasNo || '',
    nominalConcentration: existing?.nominalConcentration ?? 0,
    nominalConcentrationUnit: existing?.nominalConcentrationUnit || 'mg/L',
    actualConcentration: existing?.actualConcentration ?? undefined as number | undefined,
    concentrationErrorCause: existing?.concentrationErrorCause || '',
    preparationDate: existing?.preparationDate || '',
    validUntilDate: existing?.validUntilDate || '',
    preparator: existing?.preparator || '',
    remark: existing?.remark || '',
    status: existing?.status || 'prepared' as const,
  })

  const handleChange = (field: string, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const batchNo = form.batchNo.trim()
    const reagentName = form.reagentName.trim()
    const preparator = form.preparator.trim()
    if (!batchNo || !reagentName || !form.preparationDate || !form.validUntilDate || !preparator) {
      alert('请填写批次号、试剂名称、配制日期、有效期和配制人')
      return
    }

    if (existing) {
      useLabStore.getState().updateBatch(existing.id, {
        ...form,
        actualConcentration: form.actualConcentration || undefined,
        concentrationErrorCause: form.concentrationErrorCause || undefined,
        reagentCasNo: form.reagentCasNo || undefined,
        remark: form.remark || undefined,
      })
      navigate(`/batches/${existing.id}`)
    } else {
      const newId = addBatch({
        ...form,
        actualConcentration: form.actualConcentration || undefined,
        concentrationErrorCause: form.concentrationErrorCause || undefined,
        reagentCasNo: form.reagentCasNo || undefined,
        remark: form.remark || undefined,
      })
      navigate(`/batches/${newId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← 返回</button>
        <h2 className="text-2xl font-bold text-slate-800">{existing ? '编辑批次' : '新建标准液批次'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="page-card space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="label-field">批次号 *</label>
            <input className="input-field" value={form.batchNo} onChange={(e) => handleChange('batchNo', e.target.value)} placeholder="如 STD-2026-0610-001" />
          </div>
          <div>
            <label className="label-field">试剂名称 *</label>
            <input className="input-field" value={form.reagentName} onChange={(e) => handleChange('reagentName', e.target.value)} placeholder="如 六价铬标准溶液" />
          </div>
          <div>
            <label className="label-field">CAS 编号</label>
            <input className="input-field" value={form.reagentCasNo} onChange={(e) => handleChange('reagentCasNo', e.target.value)} placeholder="如 18540-29-9" />
          </div>
          <div>
            <label className="label-field">标称浓度 *</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" className="input-field flex-1" value={form.nominalConcentration} onChange={(e) => handleChange('nominalConcentration', Number(e.target.value))} />
              <select className="input-field w-24" value={form.nominalConcentrationUnit} onChange={(e) => handleChange('nominalConcentrationUnit', e.target.value)}>
                <option>mg/L</option>
                <option>μg/mL</option>
                <option>mol/L</option>
                <option>mmol/L</option>
                <option>%</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">实际浓度（选填）</label>
            <input type="number" step="0.01" className="input-field" value={form.actualConcentration ?? ''} onChange={(e) => handleChange('actualConcentration', e.target.value ? Number(e.target.value) : undefined)} placeholder="留空表示未测" />
          </div>
          <div>
            <label className="label-field">浓度偏差原因（通俗说明，选填）</label>
            <input className="input-field" value={form.concentrationErrorCause} onChange={(e) => handleChange('concentrationErrorCause', e.target.value)} placeholder="如：配制时温度偏高导致体积膨胀..." />
            <p className="text-xs text-slate-400 mt-1">请用通俗语言填写，报告中直接展示，不用缩写和字段名</p>
          </div>
          <div>
            <label className="label-field">配制日期 *</label>
            <input type="date" className="input-field" value={form.preparationDate} onChange={(e) => handleChange('preparationDate', e.target.value)} />
          </div>
          <div>
            <label className="label-field">有效期至 *</label>
            <input type="date" className="input-field" value={form.validUntilDate} onChange={(e) => handleChange('validUntilDate', e.target.value)} />
          </div>
          <div>
            <label className="label-field">配制人 *</label>
            <input className="input-field" value={form.preparator} onChange={(e) => handleChange('preparator', e.target.value)} placeholder="如 李监测" />
          </div>
        </div>
        <div>
          <label className="label-field">备注</label>
          <textarea className="input-field" rows={3} value={form.remark} onChange={(e) => handleChange('remark', e.target.value)} placeholder="保存条件、用途等" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">取消</button>
          <button type="submit" className="btn-primary">{existing ? '保存修改' : '创建批次'}</button>
        </div>
      </form>
    </div>
  )
}
