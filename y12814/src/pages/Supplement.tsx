import { useState } from "react"
import { useTiterStore } from "@/store"
import { SYNONYM_RULES, EXPECTED_SPECIES, computeSampleStatus } from "@/types"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  RotateCcw,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Sample } from "@/types"

interface SupplementResult {
  sample: Sample
  isNew: boolean
}

export default function Supplement() {
  const { currentBatch, batches, addSample } = useTiterStore()
  const [speciesName, setSpeciesName] = useState("")
  const [titerValue, setTiterValue] = useState("")
  const [batchNo, setBatchNo] = useState(currentBatch)
  const [lastResult, setLastResult] = useState<SupplementResult | null>(null)
  const [supplementHistory, setSupplementHistory] = useState<SupplementResult[]>([])
  const navigate = useNavigate()

  const allSpeciesNames = EXPECTED_SPECIES.flatMap((s) => {
    const rule = SYNONYM_RULES.find((r) => r.standardName === s)
    return rule ? [s, ...rule.synonyms] : [s]
  })

  const suggestions = speciesName.length > 0
    ? allSpeciesNames.filter((n) =>
        n.toLowerCase().includes(speciesName.toLowerCase())
      )
    : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!speciesName || !titerValue) return

    const value = parseInt(titerValue, 10)
    if (isNaN(value) || value <= 0) return

    const sample = addSample(speciesName, value, batchNo)
    const result: SupplementResult = { sample, isNew: true }
    setLastResult(result)
    setSupplementHistory((prev) => [result, ...prev])
    setSpeciesName("")
    setTiterValue("")
  }

  const handleSuggestionClick = (name: string) => {
    setSpeciesName(name)
  }

  const handlePreview = () => {
    if (!speciesName) return null
    return computeSampleStatus(speciesName)
  }

  const preview = handlePreview()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          样本补录
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          追加样本记录，系统自动检测同义名与污染
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg p-6 space-y-5"
            style={{
              background: "var(--color-slate-card)",
              border: "1px solid var(--color-slate-border)",
            }}
          >
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "var(--color-text-muted)" }}
              >
                物种名
              </label>
              <input
                type="text"
                value={speciesName}
                onChange={(e) => setSpeciesName(e.target.value)}
                placeholder="输入物种名，如 Mus musculus"
                className="w-full rounded-md px-3 py-2.5 text-sm font-mono outline-none transition-colors"
                style={{
                  background: "var(--color-indigo-deep)",
                  border: "1px solid var(--color-slate-border)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-amber-accent)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--color-slate-border)")
                }
              />
              {suggestions.length > 0 && speciesName.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {suggestions.map((name) => {
                    const isStandard = EXPECTED_SPECIES.includes(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSuggestionClick(name)}
                        className="px-2 py-1 rounded text-xs font-mono transition-colors"
                        style={{
                          background: isStandard
                            ? "rgba(52,211,153,0.1)"
                            : "rgba(251,191,36,0.1)",
                          color: isStandard
                            ? "var(--color-emerald-pass)"
                            : "var(--color-amber-pending)",
                          border: `1px solid ${
                            isStandard
                              ? "rgba(52,211,153,0.2)"
                              : "rgba(251,191,36,0.2)"
                          }`,
                        }}
                      >
                        {name}
                        {!isStandard && " (同义名)"}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "var(--color-text-muted)" }}
              >
                滴度值（稀释倍数，如 640）
              </label>
              <input
                type="number"
                value={titerValue}
                onChange={(e) => setTiterValue(e.target.value)}
                placeholder="如 640, 320, 160..."
                min="1"
                className="w-full rounded-md px-3 py-2.5 text-sm font-mono outline-none transition-colors"
                style={{
                  background: "var(--color-indigo-deep)",
                  border: "1px solid var(--color-slate-border)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-amber-accent)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--color-slate-border)")
                }
              />
            </div>

            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "var(--color-text-muted)" }}
              >
                试剂批号
              </label>
              <select
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-sm font-mono outline-none"
                style={{
                  background: "var(--color-indigo-deep)",
                  border: "1px solid var(--color-slate-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors line-indicator"
                style={{
                  background: "var(--color-amber-accent)",
                  color: "var(--color-indigo-deep)",
                }}
              >
                <Plus size={16} />
                提交补录
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpeciesName("")
                  setTiterValue("")
                  setLastResult(null)
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm transition-colors"
                style={{
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-slate-border)",
                }}
              >
                <RotateCcw size={14} />
                重置
              </button>
            </div>
          </form>

          {preview && speciesName.length > 2 && (
            <div
              className="rounded-lg p-5 mt-4"
              style={{
                background: "var(--color-slate-card)",
                border: "1px solid var(--color-slate-border)",
              }}
            >
              <h4 className="text-xs font-medium mb-3" style={{ color: "var(--color-text-muted)" }}>
                实时检测预览
              </h4>
              <div className="flex items-center gap-3">
                {preview.status === "pass" && (
                  <CheckCircle size={20} style={{ color: "var(--color-emerald-pass)" }} />
                )}
                {preview.status === "pending" && (
                  <AlertTriangle size={20} style={{ color: "var(--color-amber-pending)" }} />
                )}
                {preview.status === "bad" && (
                  <XCircle size={20} style={{ color: "var(--color-red-bad)" }} />
                )}
                <div>
                  <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {preview.status === "pass" && "预计通过"}
                    {preview.status === "pending" && "预计待确认 — 同义名"}
                    {preview.status === "bad" && "预计坏数据 — 污染样本"}
                  </p>
                  {preview.blockReason && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {preview.blockReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          {lastResult && (
            <div
              className="rounded-lg p-5 animate-fade-in-up"
              style={{
                background: "var(--color-slate-card)",
                border:
                  lastResult.sample.status === "pass"
                    ? "1px solid rgba(52,211,153,0.3)"
                    : lastResult.sample.status === "pending"
                    ? "1px solid rgba(251,191,36,0.3)"
                    : "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <h4 className="text-xs font-medium mb-3" style={{ color: "var(--color-text-muted)" }}>
                最近补录结果
              </h4>
              <div className="flex items-center gap-3 mb-3">
                {lastResult.sample.status === "pass" && (
                  <CheckCircle size={24} style={{ color: "var(--color-emerald-pass)" }} />
                )}
                {lastResult.sample.status === "pending" && (
                  <AlertTriangle size={24} style={{ color: "var(--color-amber-pending)" }} />
                )}
                {lastResult.sample.status === "bad" && (
                  <XCircle size={24} style={{ color: "var(--color-red-bad)" }} />
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {lastResult.sample.id}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                    {lastResult.sample.speciesName} · 1:{lastResult.sample.titerValue}
                  </p>
                </div>
              </div>
              {lastResult.sample.blockReason && (
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {lastResult.sample.blockReason}
                </p>
              )}
              <button
                onClick={() => navigate("/")}
                className="mt-3 text-xs font-medium line-indicator"
                style={{ color: "var(--color-amber-accent)" }}
              >
                查看看板 →
              </button>
            </div>
          )}

          {supplementHistory.length > 0 && (
            <div
              className="rounded-lg p-5"
              style={{
                background: "var(--color-slate-card)",
                border: "1px solid var(--color-slate-border)",
              }}
            >
              <h4 className="text-xs font-medium mb-3" style={{ color: "var(--color-text-muted)" }}>
                本次会话补录记录
              </h4>
              <div className="space-y-2">
                {supplementHistory.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs"
                  >
                    {r.sample.status === "pass" && (
                      <CheckCircle size={12} style={{ color: "var(--color-emerald-pass)" }} />
                    )}
                    {r.sample.status === "pending" && (
                      <AlertTriangle size={12} style={{ color: "var(--color-amber-pending)" }} />
                    )}
                    {r.sample.status === "bad" && (
                      <XCircle size={12} style={{ color: "var(--color-red-bad)" }} />
                    )}
                    <span className="font-mono" style={{ color: "var(--color-text-primary)" }}>
                      {r.sample.id}
                    </span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {r.sample.speciesName}
                    </span>
                    <span className="font-mono" style={{ color: "var(--color-text-muted)" }}>
                      1:{r.sample.titerValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
