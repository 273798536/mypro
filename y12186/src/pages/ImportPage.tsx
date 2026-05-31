import { useRef, useState } from "react"
import { Upload, FileText, AlertCircle, RotateCcw } from "lucide-react"
import { useStore } from "@/store/useStore"

const REASON_LABEL: Record<string, string> = {
  empty: "空行",
  comment: "备注",
  missing_column: "缺列",
}

export default function ImportPage() {
  const { fileLoaded, fileName, cleanedRows, badRows, loadCSV, loadMockData, recoverBadRow } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      loadCSV(text, file.name)
    }
    reader.readAsText(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".tsv"))) {
      handleFile(file)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => {
    setDragOver(false)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const previewRows = cleanedRows.slice(0, 20)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">数据导入与清洗</h1>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`mx-auto flex w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 transition-colors ${
          dragOver ? "border-amber-400 bg-amber-400/10" : "border-slate-500 bg-navy-700/40 hover:border-slate-400"
        }`}
      >
        <Upload className="mb-3 h-10 w-10 text-slate-400" />
        {fileLoaded ? (
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="h-5 w-5" />
            <span className="font-mono">{fileName}</span>
          </div>
        ) : (
          <p className="text-slate-400">拖拽 .csv / .tsv 文件到此处，或点击选择</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <div className="flex justify-center">
        <button
          onClick={loadMockData}
          className="rounded-lg bg-amber-500 px-6 py-2 font-semibold text-navy-900 transition-colors hover:bg-amber-400"
        >
          加载演示数据
        </button>
      </div>

      {fileLoaded && (
        <>
          <div className="rounded-xl bg-navy-700/50 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">数据预览（前 20 行）</h2>
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-sm text-slate-300">
                <thead className="sticky top-0 bg-navy-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">timestamp</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">pitch</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">amplitude</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">lyricsSegment</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">practiceCount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.id} className="border-t border-navy-600/40">
                      <td className="px-3 py-2 font-mono">{row.timestamp}</td>
                      <td className="px-3 py-2 font-mono">{row.pitch}</td>
                      <td className="px-3 py-2 font-mono">{row.amplitude}</td>
                      <td className="px-3 py-2 font-mono">{row.lyricsSegment}</td>
                      <td className="px-3 py-2 font-mono">{row.practiceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {badRows.length > 0 && (
            <div className="rounded-xl bg-navy-700/50 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <AlertCircle className="h-5 w-5 text-coral-500" />
                异常行（{badRows.length}）
              </h2>
              <div className="flex flex-col gap-2">
                {badRows.map((br) => (
                  <div
                    key={br.rowIndex}
                    className={`flex items-start gap-3 rounded-lg bg-navy-800/60 px-4 py-3 ${
                      br.recovered ? "opacity-50" : ""
                    }`}
                  >
                    <span className="shrink-0 font-mono text-xs text-slate-500">#{br.rowIndex}</span>
                    <span className="shrink-0 rounded bg-coral-500/20 px-2 py-0.5 text-xs font-medium text-coral-400">
                      {REASON_LABEL[br.reason] ?? br.reason}
                    </span>
                    {br.reason === "missing_column" && br.missingColumns.length > 0 && (
                      <span className="shrink-0 text-xs text-slate-500">
                        缺列: {br.missingColumns.join(", ")}
                      </span>
                    )}
                    <span className={`flex-1 truncate font-mono text-xs text-slate-400 ${br.recovered ? "line-through" : ""}`}>
                      {br.rawLine}
                    </span>
                    {br.recovered ? (
                      <span className="shrink-0 text-xs text-emerald-400">已恢复</span>
                    ) : (
                      <button
                        onClick={() => recoverBadRow(br.rowIndex)}
                        className="flex shrink-0 items-center gap-1 rounded bg-slate-600 px-2 py-0.5 text-xs text-white transition-colors hover:bg-slate-500"
                      >
                        <RotateCcw className="h-3 w-3" />
                        恢复
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
