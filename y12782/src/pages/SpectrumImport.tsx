import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useLabStore } from '../store'
import { SpectrumPeak } from '../types'

const PRESET_PEAKS: Record<string, SpectrumPeak[]> = {
  '六价铬-单峰': [
    { retentionTime: 2.31, height: 120, area: 3420, width: 0.12, compoundName: '六价铬' },
  ],
  '六价铬-重叠峰': [
    { retentionTime: 2.28, height: 115, area: 3300, width: 0.13, compoundName: '六价铬' },
    { retentionTime: 2.34, height: 40, area: 820, width: 0.11, compoundName: '杂质A' },
  ],
  '甲醛-单峰': [
    { retentionTime: 1.85, height: 95, area: 2600, width: 0.14, compoundName: '甲醛' },
  ],
  '总磷-单峰': [
    { retentionTime: 3.55, height: 88, area: 2450, width: 0.18, compoundName: '总磷' },
  ],
  '总磷-重叠峰': [
    { retentionTime: 3.52, height: 82, area: 2300, width: 0.20, compoundName: '总磷' },
    { retentionTime: 3.56, height: 35, area: 700, width: 0.15, compoundName: '未知杂质' },
  ],
}

export default function SpectrumImport() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const batches = useLabStore((s) => s.batches)
  const importSpectrum = useLabStore((s) => s.importSpectrum)

  const [form, setForm] = useState({
    batchId: params.get('batchId') || '',
    instrumentName: '',
    instrumentNo: '',
    analyst: '',
    analysisDate: '',
    operator: '',
  })

  const [peaks, setPeaks] = useState<SpectrumPeak[]>([])
  const [result, setResult] = useState<{
    id: string
    isDuplicate: boolean
  } | null>(null)

  const addPeak = () => {
    setPeaks((p) => [
      ...p,
      { retentionTime: 0, height: 0, area: 0, width: 0.1, compoundName: '' },
    ])
  }

  const updatePeak = (idx: number, field: keyof SpectrumPeak, value: string | number) => {
    setPeaks((p) =>
      p.map((pk, i) => (i === idx ? { ...pk, [field]: value } : pk)),
    )
  }

  const removePeak = (idx: number) => {
    setPeaks((p) => p.filter((_, i) => i !== idx))
  }

  const loadPreset = (key: string) => {
    const preset = PRESET_PEAKS[key]
    if (preset) setPeaks(preset.map((p) => ({ ...p })))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.batchId || !form.instrumentNo || !form.analyst || !form.analysisDate || !form.operator) {
      alert('请填写所有必填字段')
      return
    }
    if (peaks.length === 0) {
      alert('请至少添加一个谱峰')
      return
    }

    const res = importSpectrum(
      form.batchId,
      form.instrumentName,
      form.instrumentNo,
      form.analyst,
      form.analysisDate,
      peaks,
      form.operator,
    )
    setResult(res)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← 返回</button>
        <h2 className="text-2xl font-bold text-slate-800">导入谱图数据</h2>
      </div>

      {result && (
        <div className={`page-card border-l-4 ${result.isDuplicate ? 'border-l-amber-400 bg-amber-50' : 'border-l-green-400 bg-green-50'}`}>
          {result.isDuplicate ? (
            <div>
              <div className="font-semibold text-amber-800 mb-1">检测到重复导入</div>
              <p className="text-sm text-amber-700">
                同一批谱图数据已存在于系统中（ID: {result.id}），已跳过重复导入，保留原有结论。
                不会产生互相冲突的两份结论。
              </p>
              <Link to={`/batches/${form.batchId}`} className="btn-ghost mt-3 inline-block text-sm">查看批次详情</Link>
            </div>
          ) : (
            <div>
              <div className="font-semibold text-green-800 mb-1">导入成功</div>
              <p className="text-sm text-green-700">谱图数据已成功导入（ID: {result.id}），已自动执行谱峰重叠检测并记录到统一批处理记录中。</p>
              <Link to={`/batches/${form.batchId}`} className="btn-primary mt-3 inline-block text-sm">查看批次详情</Link>
            </div>
          )}
        </div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="page-card">
            <h3 className="font-semibold text-slate-800 mb-4">检测信息</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="label-field">所属批次 *</label>
                <select className="input-field" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
                  <option value="">请选择批次</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.batchNo} - {b.reagentName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">仪器名称</label>
                <input className="input-field" value={form.instrumentName} onChange={(e) => setForm((f) => ({ ...f, instrumentName: e.target.value }))} placeholder="如 高效液相色谱仪" />
              </div>
              <div>
                <label className="label-field">仪器编号 *</label>
                <input className="input-field" value={form.instrumentNo} onChange={(e) => setForm((f) => ({ ...f, instrumentNo: e.target.value }))} placeholder="如 HPLC-03" />
              </div>
              <div>
                <label className="label-field">分析人员 *</label>
                <input className="input-field" value={form.analyst} onChange={(e) => setForm((f) => ({ ...f, analyst: e.target.value }))} placeholder="如 李监测" />
              </div>
              <div>
                <label className="label-field">检测日期 *</label>
                <input type="date" className="input-field" value={form.analysisDate} onChange={(e) => setForm((f) => ({ ...f, analysisDate: e.target.value }))} />
              </div>
              <div>
                <label className="label-field">操作人 *</label>
                <input className="input-field" value={form.operator} onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))} placeholder="如 李监测" />
              </div>
            </div>
          </div>

          <div className="page-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">谱峰数据</h3>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-slate-400">快速填入样例：</span>
                {Object.keys(PRESET_PEAKS).map((key) => (
                  <button key={key} type="button" onClick={() => loadPreset(key)} className="btn-ghost text-xs py-1 px-2">
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {peaks.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-2 font-semibold text-slate-600">保留时间(min)</th>
                      <th className="pb-2 font-semibold text-slate-600">峰高</th>
                      <th className="pb-2 font-semibold text-slate-600">峰面积</th>
                      <th className="pb-2 font-semibold text-slate-600">峰宽</th>
                      <th className="pb-2 font-semibold text-slate-600">化合物名称</th>
                      <th className="pb-2 font-semibold text-slate-600"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {peaks.map((pk, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 pr-2"><input type="number" step="0.01" className="input-field" value={pk.retentionTime} onChange={(e) => updatePeak(idx, 'retentionTime', Number(e.target.value))} /></td>
                        <td className="py-2 pr-2"><input type="number" step="1" className="input-field" value={pk.height} onChange={(e) => updatePeak(idx, 'height', Number(e.target.value))} /></td>
                        <td className="py-2 pr-2"><input type="number" step="1" className="input-field" value={pk.area} onChange={(e) => updatePeak(idx, 'area', Number(e.target.value))} /></td>
                        <td className="py-2 pr-2"><input type="number" step="0.01" className="input-field" value={pk.width} onChange={(e) => updatePeak(idx, 'width', Number(e.target.value))} /></td>
                        <td className="py-2 pr-2"><input className="input-field" value={pk.compoundName || ''} onChange={(e) => updatePeak(idx, 'compoundName', e.target.value)} placeholder="选填" /></td>
                        <td className="py-2"><button type="button" onClick={() => removePeak(idx)} className="text-red-500 hover:text-red-700 text-xs">删除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button type="button" onClick={addPeak} className="btn-ghost text-sm">+ 添加谱峰</button>
            <p className="text-xs text-slate-400 mt-2">系统将自动检测谱峰重叠，重叠结果和异常记录将写入同一批处理记录，界面和报告共用。</p>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-ghost">取消</button>
            <button type="submit" className="btn-primary">导入并检测</button>
          </div>
        </form>
      )}
    </div>
  )
}
