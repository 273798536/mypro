import { useCallback, useRef, useState } from "react"
import { Database, List, Users, Upload, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { useAuditStore } from "@/store/useAuditStore"
import { parseFile } from "@/utils/dataParser"
import type { RawImportResult } from "@/types"

interface ImportCardProps {
  icon: React.ReactNode
  title: string
  raw: RawImportResult | null
  onFile: (raw: RawImportResult) => void
}

function ImportCard({ icon, title, raw, onFile }: ImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setLoading(true)
      try {
        const result = await parseFile(file)
        onFile(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : "解析失败")
      } finally {
        setLoading(false)
      }
    },
    [onFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e] flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        {icon}
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 cursor-pointer transition-colors ${
          dragging
            ? "border-amber-500 bg-amber-500/5"
            : "border-[#3a3a4e] hover:border-zinc-500 bg-[#12121f]"
        }`}
      >
        {loading ? (
          <span className="text-xs text-zinc-400">解析中...</span>
        ) : (
          <>
            <Upload size={20} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">拖拽或点击上传 .csv / .xlsx</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {raw && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#12121f] rounded-md px-3 py-2">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span>{raw.rowCount} 行</span>
          <span className="text-zinc-600">|</span>
          <span>{raw.headers.length} 列</span>
          <span className="text-zinc-600">|</span>
          <Clock size={12} className="shrink-0" />
          <span>{new Date(raw.importedAt).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  )
}

const sourceColor: Record<string, string> = {
  training: "bg-blue-500",
  feature: "bg-amber-500",
  group: "bg-emerald-500",
}

const severityStyle: Record<string, { badge: string; text: string }> = {
  high: { badge: "bg-red-500/15 text-red-400", text: "高" },
  medium: { badge: "bg-amber-500/15 text-amber-400", text: "中" },
  low: { badge: "bg-cyan-500/15 text-cyan-400", text: "低" },
}

export default function Workbench() {
  const {
    trainingRaw,
    featureRaw,
    groupRaw,
    versions,
    conflicts,
    importTraining,
    importFeature,
    importGroup,
    resolveConflict,
  } = useAuditStore()

  const [expanded, setExpanded] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState("")

  const unresolvedCount = conflicts.filter((c) => !c.resolvedAt).length

  const sortedVersions = [...versions].sort((a, b) => a.importedAt - b.importedAt)

  const handleResolve = (id: string) => {
    if (!resolutionText.trim()) return
    resolveConflict(id, resolutionText.trim())
    setResolvingId(null)
    setResolutionText("")
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {unresolvedCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <span className="text-sm font-medium text-amber-300">
                {unresolvedCount} 条未解决冲突
              </span>
            </div>
            {expanded ? (
              <ChevronUp size={16} className="text-amber-400" />
            ) : (
              <ChevronDown size={16} className="text-amber-400" />
            )}
          </button>

          {expanded && (
            <div className="mt-3 flex flex-col gap-2">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 bg-[#1a1a2e] rounded-md p-3 border border-[#2a2a3e]"
                >
                  <span
                    className={`shrink-0 mt-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      severityStyle[c.severity]?.badge
                    }`}
                  >
                    {severityStyle[c.severity]?.text}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300">{c.description}</p>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                      {c.type} · {new Date(c.detectedAt).toLocaleTimeString()}
                    </p>

                    {c.resolvedAt ? (
                      <span className="inline-block mt-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        已处理
                      </span>
                    ) : resolvingId === c.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleResolve(c.id)}
                          placeholder="输入处理说明..."
                          className="flex-1 bg-[#0f0f1a] border border-[#3a3a4e] rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-amber-500/50"
                          autoFocus
                        />
                        <button
                          onClick={() => handleResolve(c.id)}
                          className="text-[11px] px-2 py-1 bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/30"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => {
                            setResolvingId(null)
                            setResolutionText("")
                          }}
                          className="text-[11px] px-2 py-1 text-zinc-500 hover:text-zinc-300"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setResolvingId(c.id)
                          setResolutionText("")
                        }}
                        className="mt-1.5 text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2"
                      >
                        处理
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="text-base font-semibold text-zinc-200 mb-4">数据导入</h2>
        <div className="grid grid-cols-3 gap-4">
          <ImportCard
            icon={<Database size={18} className="text-blue-400" />}
            title="训练样本"
            raw={trainingRaw}
            onFile={importTraining}
          />
          <ImportCard
            icon={<List size={18} className="text-amber-400" />}
            title="特征列表"
            raw={featureRaw}
            onFile={importFeature}
          />
          <ImportCard
            icon={<Users size={18} className="text-emerald-400" />}
            title="客户分组"
            raw={groupRaw}
            onFile={importGroup}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-200 mb-4">版本时间线</h2>
        {sortedVersions.length === 0 ? (
          <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-8 flex flex-col items-center gap-2 text-zinc-500">
            <Clock size={24} />
            <span className="text-sm">暂无版本记录</span>
          </div>
        ) : (
          <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-5 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {sortedVersions.map((v, i) => (
                <div key={`${v.source}-${v.importedAt}`} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`h-3 w-3 rounded-full ${sourceColor[v.source]} ${
                        v.isLate ? "ring-2 ring-amber-500/40" : ""
                      }`}
                    />
                    <span
                      className={`text-[11px] font-mono ${
                        v.isLate ? "text-amber-400" : "text-zinc-400"
                      }`}
                    >
                      {v.version}
                    </span>
                    {v.isLate && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-dashed border-amber-500/40">
                        晚到
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(v.importedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {i < sortedVersions.length - 1 && (
                    <div className="w-12 h-px bg-[#3a3a4e] mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
