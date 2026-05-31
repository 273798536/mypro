import { useStore } from '@/store/useStore'
import { presetTemplates, presetUnits } from '@/utils/templates'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, ArrowLeft, Plus, Download, Upload } from 'lucide-react'
import { useState } from 'react'
import type { Measurement } from '@/store/useStore'

export default function Experiments() {
  const navigate = useNavigate()
  const { currentTemplateId, variables, formulas, instruments, measurements, errorPropagation, unitCheckResult, loadTemplate, addMeasurement, removeMeasurement, setMeasurementValues, computeFromMeasurements } = useStore()
  const [csvInputKey, setCsvInputKey] = useState(0)

  const handleTemplateClick = (id: string) => {
    loadTemplate(id, presetTemplates)
    navigate('/')
  }

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.trim().split('\n')
      if (lines.length < 2) return
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        const symbol = cols[0].trim()
        const variable = variables.find(v => v.symbol === symbol)
        if (!variable) continue
        const values = cols.slice(1).map(Number).filter(n => !isNaN(n))
        const instrumentId = instruments.find(inst => inst.unitId === variable.unitId)?.id ?? instruments[0]?.id ?? ''
        addMeasurement(variable.id, instrumentId)
        const newMeasurements = useStore.getState().measurements
        const last = newMeasurements.filter(m => m.variableId === variable.id).pop()
        if (last) setMeasurementValues(last.id, values)
      }
    }
    reader.readAsText(file)
    setCsvInputKey(k => k + 1)
  }

  const handleExport = () => {
    const template = presetTemplates.find(t => t.id === currentTemplateId)
    let report = `实验名称: ${template?.name ?? ''}\n\n`
    report += '=== 变量数据 ===\n'
    for (const v of variables) {
      const unit = presetUnits.find(u => u.id === v.unitId)
      report += `${v.name}(${v.symbol}): ${v.currentValue} ± ${v.uncertainty} ${unit?.symbol ?? ''}\n`
    }
    report += '\n=== 公式 ===\n'
    for (const f of formulas) {
      const rv = variables.find(v => v.id === f.resultVariableId)
      report += `${rv?.symbol ?? ''} = ${f.expression}\n`
    }
    if (errorPropagation) {
      report += '\n=== 误差传播结果 ===\n'
      report += `合成不确定度: ${errorPropagation.combinedUncertainty}\n`
      for (const s of errorPropagation.steps) {
        report += `  ${s.variableSymbol}: 贡献=${s.contribution}, 占比=${s.percentage.toFixed(2)}%\n`
      }
    }
    if (unitCheckResult) {
      report += '\n=== 量纲检验 ===\n'
      report += `结果: ${unitCheckResult.passed ? '通过' : '未通过'}\n`
      for (const c of unitCheckResult.conflicts) {
        report += `  冲突: ${c.leftUnit} vs ${c.rightUnit} - ${c.suggestion}\n`
      }
    }
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template?.name ?? 'experiment'}_报告.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputVars = variables.filter(v => v.uncertainty > 0)

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-[#00ff88] hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <FlaskConical size={24} className="text-[#00ff88]" />
        <h1 className="text-2xl font-bold">实验管理</h1>
      </div>

      <h2 className="text-lg font-semibold mb-3">实验模板</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {presetTemplates.map(t => (
          <div
            key={t.id}
            onClick={() => handleTemplateClick(t.id)}
            className={`bg-[#1a1a2e] rounded-lg p-4 border transition-colors cursor-pointer ${
              currentTemplateId === t.id ? 'border-[#00ff88]' : 'border-[#2d2d44] hover:border-[#00ff88]'
            }`}
          >
            <h3 className="font-semibold text-[#00ff88] mb-1">{t.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{t.description}</p>
            <p className="text-xs text-gray-500 font-mono">{t.formulas[0]?.expression}</p>
            <p className="text-xs text-gray-500 mt-1">变量数: {t.variables.length}</p>
          </div>
        ))}
      </div>

      {currentTemplateId && (
        <>
          <h2 className="text-lg font-semibold mb-3">测量数据</h2>
          {inputVars.map(v => {
            const unit = presetUnits.find(u => u.id === v.unitId)
            const rows = measurements.filter(m => m.variableId === v.id)
            const varInstruments = instruments.filter(i => i.unitId === v.unitId)
            return (
              <div key={v.id} className="mb-6 bg-[#1a1a2e] rounded-lg p-4 border border-[#2d2d44]">
                <h3 className="font-semibold mb-2">{v.name} ({v.symbol}) [{unit?.symbol}]</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2d2d44]">
                      <th className="py-1 text-left w-12">序号</th>
                      <th className="py-1 text-left">测量值</th>
                      <th className="py-1 text-left w-28">仪器</th>
                      <th className="py-1 text-left w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="border-b border-[#2d2d44]/50">
                        <td className="py-1">{idx + 1}</td>
                        <td className="py-1">
                          <input
                            value={row.values.join(',')}
                            onChange={e => setMeasurementValues(row.id, e.target.value.split(',').map(Number).filter(n => !isNaN(n)))}
                            className="bg-[#0f0f1a] border border-[#2d2d44] rounded px-2 py-1 w-full text-white text-sm"
                          />
                        </td>
                        <td className="py-1">
                          <select
                            value={row.instrumentId}
                            onChange={e => {
                              const newRows = measurements.map(m => m.id === row.id ? { ...m, instrumentId: e.target.value } : m)
                              useStore.setState({ measurements: newRows })
                            }}
                            className="bg-[#0f0f1a] border border-[#2d2d44] rounded px-2 py-1 text-white text-sm w-full"
                          >
                            {varInstruments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </td>
                        <td className="py-1">
                          <button onClick={() => removeMeasurement(row.id)} className="text-red-400 hover:text-red-300 text-xs">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => addMeasurement(v.id, varInstruments[0]?.id ?? instruments[0]?.id ?? '')}
                  className="mt-2 flex items-center gap-1 text-[#00ff88] text-sm hover:underline"
                >
                  <Plus size={14} /> 添加行
                </button>
              </div>
            )
          })}
          <div className="flex gap-3 mt-4">
            <button onClick={() => computeFromMeasurements()} className="bg-[#00ff88] text-black px-4 py-2 rounded font-semibold text-sm hover:bg-[#00dd77] transition-colors">
              从测量数据计算
            </button>
            <label className="flex items-center gap-1 bg-[#2d2d44] px-4 py-2 rounded text-sm cursor-pointer hover:bg-[#3d3d54] transition-colors">
              <Upload size={14} /> 导入CSV
              <input key={csvInputKey} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="flex items-center gap-1 bg-[#2d2d44] px-4 py-2 rounded text-sm hover:bg-[#3d3d54] transition-colors">
              <Download size={14} /> 导出报告
            </button>
          </div>
        </>
      )}
    </div>
  )
}
