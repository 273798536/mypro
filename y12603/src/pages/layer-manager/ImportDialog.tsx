import { useState, useRef } from "react"
import { X, FileUp, CheckCircle, AlertTriangle } from "lucide-react"
import Papa from "papaparse"
import { useDefectStore } from "@/store/useDefectStore"
import type { ImportResult, AnomalyItem } from "@/types"

interface ImportDialogProps {
  workshopId: string
  onClose: () => void
}

type Phase = "select" | "preview" | "result"

export default function ImportDialog({ workshopId, onClose }: ImportDialogProps) {
  const [parsedData, setParsedData] = useState<Record<string, unknown>[] | null>(null)
  const [anomalyCount, setAnomalyCount] = useState(0)
  const [fileName, setFileName] = useState("")
  const [phase, setPhase] = useState<Phase>("select")
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const importData = useDefectStore((s) => s.importData)

  const handleParsed = (data: Record<string, unknown>[]) => {
    setParsedData(data)
    setAnomalyCount(data.filter((r) => !r.type).length)
    setPhase("preview")
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    if (f.name.endsWith(".csv")) {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => handleParsed(res.data as Record<string, unknown>[]),
      })
    } else if (f.name.endsWith(".json")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string)
          handleParsed(Array.isArray(json) ? json : [json])
        } catch {
          setParsedData(null)
        }
      }
      reader.readAsText(f)
    }
  }

  const handleImport = async () => {
    if (!parsedData) return
    const mapped = parsedData.map((r) => ({
      type: String(r.type ?? ""),
      colorRuleName: r.colorRuleName ? String(r.colorRuleName) : undefined,
      posX: Number(r.posX ?? r.x ?? 0),
      posY: Number(r.posY ?? r.y ?? 0),
      width: Number(r.width ?? r.w ?? 0),
      height: Number(r.height ?? r.h ?? 0),
      description: String(r.description ?? ""),
      isOfflineAsset: !!r.isOfflineAsset,
    }))
    try {
      const res = await importData(workshopId, { data: mapped })
      setResult(res)
    } catch {
      setResult({ batchId: "", total: parsedData.length, imported: 0, duplicates: 0, anomalies: [] })
    }
    setPhase("result")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-bold text-iron">导入数据</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-iron">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {phase === "select" && (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-10 transition-colors hover:border-warn hover:bg-warn/5"
            >
              <FileUp size={32} className="text-gray-400" />
              <p className="text-sm text-gray-500">点击选择 CSV 或 JSON 文件</p>
              <input ref={fileRef} type="file" accept=".csv,.json" onChange={handleFile} className="hidden" />
            </div>
          )}

          {phase === "preview" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  文件：<strong>{fileName}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  总行数：<strong>{parsedData?.length ?? 0}</strong>
                </p>
                <p className="text-sm text-warn">
                  检测到异常：<strong>{anomalyCount}</strong>
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setPhase("select")
                    setParsedData(null)
                    setFileName("")
                  }}
                  className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  重新选择
                </button>
                <button
                  onClick={handleImport}
                  className="rounded-md bg-warn px-4 py-2 text-sm font-medium text-white hover:bg-warn/90"
                >
                  确认导入
                </button>
              </div>
            </div>
          )}

          {phase === "result" && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-pass">
                <CheckCircle size={20} />
                <span className="font-medium">导入完成</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-pass/10 p-3">
                  <div className="text-xl font-bold text-pass">{result.imported}</div>
                  <div className="text-xs text-gray-500">成功</div>
                </div>
                <div className="rounded-lg bg-warn/10 p-3">
                  <div className="text-xl font-bold text-warn">{result.duplicates}</div>
                  <div className="text-xs text-gray-500">重复</div>
                </div>
                <div className="rounded-lg bg-danger/10 p-3">
                  <div className="text-xl font-bold text-danger">{result.anomalies.length}</div>
                  <div className="text-xs text-gray-500">异常</div>
                </div>
              </div>
              {result.anomalies.length > 0 && (
                <div className="max-h-32 overflow-auto rounded-lg border p-2 text-xs">
                  {result.anomalies.map((a: AnomalyItem, i: number) => (
                    <div key={i} className="flex items-center gap-1 py-0.5 text-danger">
                      <AlertTriangle size={10} />
                      行 {a.row}：{a.detail}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded-md bg-iron px-4 py-2 text-sm text-white hover:bg-iron/90"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
