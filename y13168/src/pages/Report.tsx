import { useState } from 'react'
import { Settings, Calculator, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useAttributionStore } from '@/store'

const DEFAULT_THRESHOLD = 5
const DEFAULT_COEFF = 1.0

export default function Report() {
  const { parameterSet, recalcResults, consistencyCheck, updateParameterSet, recalculateAll, runConsistencyCheck, exportCSVWithBOM, getFilteredRecords, filteredRecords } = useAttributionStore()
  const [localThreshold, setLocalThreshold] = useState(parameterSet.safetyThreshold)
  const [localCoeff, setLocalCoeff] = useState(parameterSet.calculationCoeff)

  const thresholdDelta = localThreshold - DEFAULT_THRESHOLD
  const coeffDelta = localCoeff - DEFAULT_COEFF

  const handleThresholdChange = (v: number) => {
    const clamped = Math.min(15, Math.max(1, v))
    setLocalThreshold(clamped)
    updateParameterSet({ ...parameterSet, safetyThreshold: clamped })
  }

  const handleCoeffChange = (v: number) => {
    const clamped = Math.min(2.0, Math.max(0.5, Math.round(v * 10) / 10))
    setLocalCoeff(clamped)
    updateParameterSet({ ...parameterSet, calculationCoeff: clamped })
  }

  const handleExport = () => {
    const blob = exportCSVWithBOM()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
    a.download = `扭矩误差明细_${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" style={{ background: '#0F1724' }}>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6 text-[#FF6B35]" />
        参数与报告
      </h1>

      <section className="rounded-xl p-5 space-y-4 border" style={{ background: '#1B2A4A', borderColor: '#2A3F6A' }}>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#FF6B35]" />
          参数调整器
        </h2>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-300">安全阈值 (safetyThreshold)</label>
              <span className="text-sm font-mono text-white">
                {localThreshold}
                {thresholdDelta !== 0 && (
                  <span className={thresholdDelta > 0 ? 'text-[#FF6B35] ml-1' : 'text-[#2ECC71] ml-1'}>
                    Δ{thresholdDelta > 0 ? '+' : ''}{thresholdDelta}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={15} step={0.5} value={localThreshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="flex-1 accent-[#FF6B35]" />
              <input type="number" min={1} max={15} step={0.5} value={localThreshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded text-sm font-mono text-white border text-center"
                style={{ background: '#0F1724', borderColor: '#2A3F6A' }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-300">计算系数 (calculationCoeff)</label>
              <span className="text-sm font-mono text-white">
                {localCoeff}
                {coeffDelta !== 0 && (
                  <span className={coeffDelta > 0 ? 'text-[#FF6B35] ml-1' : 'text-[#2ECC71] ml-1'}>
                    Δ{coeffDelta > 0 ? '+' : ''}{coeffDelta.toFixed(1)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input type="range" min={0.5} max={2.0} step={0.1} value={localCoeff}
                onChange={(e) => handleCoeffChange(Number(e.target.value))}
                className="flex-1 accent-[#FF6B35]" />
              <input type="number" min={0.5} max={2.0} step={0.1} value={localCoeff}
                onChange={(e) => handleCoeffChange(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded text-sm font-mono text-white border text-center"
                style={{ background: '#0F1724', borderColor: '#2A3F6A' }} />
            </div>
          </div>

          <button onClick={recalculateAll}
            className="px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition"
            style={{ background: '#FF6B35' }}>
            <Calculator className="w-4 h-4" />
            复算
          </button>
        </div>

        {recalcResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b" style={{ borderColor: '#2A3F6A' }}>
                  <th className="py-2 px-3 text-left font-mono">零部件</th>
                  <th className="py-2 px-3 text-right font-mono">旧值</th>
                  <th className="py-2 px-3 text-right font-mono">新值</th>
                  <th className="py-2 px-3 text-right font-mono">Δ</th>
                  <th className="py-2 px-3 text-left">说明</th>
                </tr>
              </thead>
              <tbody>
                {recalcResults.map((r) => (
                  <tr key={r.id} className="border-b" style={{ borderColor: '#2A3F6A' }}>
                    <td className="py-2 px-3 text-white font-mono">{r.componentName}</td>
                    <td className="py-2 px-3 text-right text-gray-300 font-mono">{r.oldValue.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-white font-mono">{r.newValue.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono" style={{ color: r.delta > 0 ? '#FF6B35' : '#2ECC71' }}>
                      {r.delta > 0 ? '+' : ''}{r.delta.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-gray-400">{r.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl p-5 space-y-4 border" style={{ background: '#1B2A4A', borderColor: '#2A3F6A' }}>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#FF6B35]" />
          公式与边界展示
        </h2>

        <div className="rounded-lg p-4" style={{ background: '#0F1724' }}>
          <p className="font-mono text-[#2ECC71] text-sm leading-relaxed">
            误差% = (实测扭矩 - 额定扭矩) / 额定扭矩 × 100%
          </p>
          <p className="text-gray-400 text-xs mt-2">
            单位说明: 扭矩单位为 N·m，误差为百分比(%)，阈值 {localThreshold}%
          </p>
        </div>

        {recalcResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-300 font-semibold">边界样本</p>
            {recalcResults.map((r) => (
              <div key={r.id} className="rounded-lg p-3 text-sm" style={{ background: '#0F1724' }}>
                <p className="text-white font-mono">{r.componentName}</p>
                <p className="text-gray-400 mt-1">{r.boundarySample}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg p-3 border" style={{ background: '#0F1724', borderColor: '#2A3F6A' }}>
          <p className="text-sm text-[#FF6B35] flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            当误差恰好等于阈值 ({localThreshold}%) 时的虚拟边界样本
          </p>
          <p className="text-gray-400 text-xs mt-1 font-mono">
            边界条件: error% = {localThreshold}% → 实测扭矩 = 额定扭矩 × (1 + {localThreshold / 100})
          </p>
        </div>
      </section>

      <section className="rounded-xl p-5 space-y-4 border" style={{ background: '#1B2A4A', borderColor: '#2A3F6A' }}>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-[#FF6B35]" />
          CSV 导出
        </h2>

        <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ background: '#0F1724', border: '1px solid #2A3F6A' }}>
          <p className="text-gray-400">
            当前筛选将导出 <span className="text-white font-mono font-semibold">{getFilteredRecords().length}</span> 条（页面状态 <span className="text-white font-mono">{filteredRecords.length}</span> 条）
          </p>
          <p className="text-gray-500">
            若两数不一致请先点"一致性校验"；导出文件包含：零部件名称 / 类型 / 实测扭矩 / 误差 / 严重等级 / 时间戳，字段用双引号包裹、UTF-8 BOM，Excel/WPS 双击正常打开中文。
          </p>
        </div>

        <button onClick={runConsistencyCheck}
          className="px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition border"
          style={{ background: '#2A3F6A', borderColor: '#2A3F6A' }}>
          <CheckCircle className="w-4 h-4" />
          一致性校验
        </button>

        {consistencyCheck && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {consistencyCheck.passed ? (
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-white flex items-center gap-1" style={{ background: '#2ECC71' }}>
                  <CheckCircle className="w-4 h-4" /> 校验通过
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-white flex items-center gap-1" style={{ background: '#FF6B35' }}>
                  <XCircle className="w-4 h-4" /> 校验未通过
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg p-3" style={{ background: '#0F1724' }}>
                <p className="text-gray-400">页面状态</p>
                <p className="text-white font-mono mt-1">{consistencyCheck.pageStatus}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0F1724' }}>
                <p className="text-gray-400">CSV 状态</p>
                <p className="text-white font-mono mt-1">{consistencyCheck.csvStatus}</p>
              </div>
            </div>

            {consistencyCheck.mismatches.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: '#0F1724' }}>
                <p className="text-[#FF6B35] text-sm flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  不一致项
                </p>
                <ul className="space-y-1">
                  {consistencyCheck.mismatches.map((m, i) => (
                    <li key={i} className="text-gray-300 text-sm font-mono">• {m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button onClick={handleExport}
          disabled={!consistencyCheck?.passed}
          className="px-4 py-2 rounded-lg font-semibold text-white flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: consistencyCheck?.passed ? '#2ECC71' : '#2A3F6A' }}>
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </section>
    </div>
  )
}
