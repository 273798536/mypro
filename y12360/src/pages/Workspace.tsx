import { useState } from "react"
import { Calculator, RotateCcw, Save, ChevronDown } from "lucide-react"
import { usePumpStore } from "@/hooks/usePumpStore"
import ResultCards from "@/components/ResultCards"
import WarningAlert from "@/components/WarningAlert"
import type { FlowUnit, HeadUnit, PowerUnit } from "@shared/types"

const flowUnits: FlowUnit[] = ["m3/h", "L/s", "gpm"]
const headUnits: HeadUnit[] = ["m", "ft", "kPa"]
const powerUnits: PowerUnit[] = ["kW", "hp"]

export default function Workspace() {
  const {
    currentRequest: req,
    currentRecord: record,
    loading,
    error,
    setCurrentRequest,
    resetCurrentRequest,
    submitCalculation,
  } = usePumpStore()

  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleFieldChange(field: string, value: string | number) {
    setCurrentRequest({ [field]: value })
  }

  function handleSubmit() {
    submitCalculation()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">计算工作台</h1>
          <p className="mt-1 text-sm text-slate-500">
            输入水泵参数与目标转速，实时计算相似律结果
          </p>
        </div>
        <button
          onClick={resetCurrentRequest}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重置
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">额定参数</h2>
          <div className="space-y-4">
            <ParamField
              label="额定流量"
              value={req.ratedFlow}
              unit={req.ratedFlowUnit}
              units={flowUnits}
              onValueChange={(v) => handleFieldChange("ratedFlow", v)}
              onUnitChange={(u) => handleFieldChange("ratedFlowUnit", u)}
            />
            <ParamField
              label="额定扬程"
              value={req.ratedHead}
              unit={req.ratedHeadUnit}
              units={headUnits}
              onValueChange={(v) => handleFieldChange("ratedHead", v)}
              onUnitChange={(u) => handleFieldChange("ratedHeadUnit", u)}
            />
            <ParamField
              label="额定功率"
              value={req.ratedPower}
              unit={req.ratedPowerUnit}
              units={powerUnits}
              onValueChange={(v) => handleFieldChange("ratedPower", v)}
              onUnitChange={(u) => handleFieldChange("ratedPowerUnit", u)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">额定转速</label>
                <div className="flex rounded-md border border-slate-300">
                  <input
                    type="number"
                    value={req.ratedSpeed}
                    onChange={(e) => handleFieldChange("ratedSpeed", Number(e.target.value))}
                    className="w-full rounded-l-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <span className="flex items-center rounded-r-md bg-slate-50 px-2 text-xs text-slate-400">
                    rpm
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">目标转速</label>
                <div className="flex rounded-md border border-slate-300">
                  <input
                    type="number"
                    value={req.targetSpeed}
                    onChange={(e) => handleFieldChange("targetSpeed", Number(e.target.value))}
                    className="w-full rounded-l-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <span className="flex items-center rounded-r-md bg-slate-50 px-2 text-xs text-slate-400">
                    rpm
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            来源与备注
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">数据来源</label>
                <input
                  type="text"
                  value={req.source}
                  onChange={(e) => handleFieldChange("source", e.target.value)}
                  placeholder="如：设备铭牌、设计文件"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">备注</label>
                <textarea
                  value={req.remark || ""}
                  onChange={(e) => handleFieldChange("remark", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            计算并保存
          </button>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {record && (
            <>
              <ResultCards record={record} />
              <WarningAlert warnings={record.warnings} />
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">效率估算</h3>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xl font-semibold text-slate-800">
                    {record.efficiencyEstimate != null ? (record.efficiencyEstimate * 100).toFixed(1) : "—"}
                  </span>
                  <span className="text-sm text-slate-400">%</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  基于相似律偏差的效率估算，偏离额定转速越多效率越低
                </p>
              </div>
            </>
          )}

          {!record && !error && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <Calculator className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">输入参数后点击"计算并保存"查看结果</p>
            </div>
          )}
        </div>
      </div>

      {record && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">相似律公式参考</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormulaCard
              title="流量定律"
              formula="Q₂ = Q₁ × (n₂/n₁)"
              result={record.targetFlow !== null ? `${record.targetFlow.toFixed(2)} ${record.ratedFlowUnit}` : "—"}
            />
            <FormulaCard
              title="扬程定律"
              formula="H₂ = H₁ × (n₂/n₁)²"
              result={record.targetHead !== null ? `${record.targetHead.toFixed(2)} ${record.ratedHeadUnit}` : "—"}
            />
            <FormulaCard
              title="功率定律"
              formula="P₂ = P₁ × (n₂/n₁)³"
              result={record.targetPower !== null ? `${record.targetPower.toFixed(2)} ${record.ratedPowerUnit}` : "—"}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ParamField({
  label,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
}: {
  label: string
  value: number
  unit: string
  units: string[]
  onValueChange: (v: number) => void
  onUnitChange: (u: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <div className="flex rounded-md border border-slate-300">
        <input
          type="number"
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className="w-full rounded-l-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="rounded-r-md border-l border-slate-300 bg-slate-50 px-2 text-xs text-slate-600 focus:outline-none"
        >
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function FormulaCard({ title, formula, result }: { title: string; formula: string; result: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-1 font-mono text-sm text-slate-700">{formula}</p>
      <p className="mt-1 font-mono text-xs text-sky-600">{result}</p>
    </div>
  )
}
