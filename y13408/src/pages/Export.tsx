import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { FileDown, FileText, ChevronRight, MapPin, AlertTriangle, Download } from "lucide-react"
import Papa from "papaparse"
import jsPDF from "jspdf"
import { useReviewStore } from "@/store/useReviewStore"

const boundaryTypeLabel: Record<string, string> = {
  normal: "正常",
  empty_set: "空集合",
  zero_value: "零值占位",
  extrapolation_overflow: "外推越界",
}

const severityLabel: Record<string, string> = {
  warning: "警告",
  critical: "严重",
}

export default function Export() {
  const store = useReviewStore()
  const stats = store.computedStats()
  const samples = store.filteredSamples()
  const unresolved = store.anomalies.filter((a) => !a.resolvedAt)
  const overrides = store.overrideRecords
  const [csvState, setCsvState] = useState<"idle" | "loading" | "done">("idle")
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "done">("idle")

  const handleCsvExport = () => {
    setCsvState("loading")
    setTimeout(() => {
      const data = samples.map((s) => ({
        ID: s.id,
        批次: s.batchId,
        参数名: s.parameterName,
        原始值: s.originalValue ?? "",
        换算值: s.convertedValue ?? "",
        单位: s.unit,
        换算因子: s.conversionFactor,
        边界类型: boundaryTypeLabel[s.boundaryType] ?? s.boundaryType,
        复核状态: s.reviewStatus,
        来源材料ID: s.sourceMaterialId,
        影响结论ID: s.affectedConclusionId,
        补录说明: s.supplementNote,
      }))
      const csv = "\uFEFF" + Papa.unparse(data)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "概率抽样边界复核_明细.csv"
      a.click()
      URL.revokeObjectURL(url)
      setCsvState("done")
      setTimeout(() => setCsvState("idle"), 2000)
    }, 600)
  }

  const handlePdfExport = () => {
    setPdfState("loading")
    setTimeout(() => {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
      let y = 20
      doc.setFontSize(18)
      doc.text("Boundary Review Report", 105, y, { align: "center" })
      y += 12
      doc.setFontSize(11)
      doc.text(`Total: ${stats.totalSamples}  |  Anomalies: ${stats.boundaryAnomalies}  |  Pending: ${stats.pendingReview}  |  Overridden: ${stats.overridden}`, 105, y, { align: "center" })
      y += 14
      doc.setFontSize(14)
      doc.text("Unresolved Anomalies", 15, y)
      y += 8
      doc.setFontSize(10)
      if (unresolved.length === 0) {
        doc.text("No unresolved anomalies.", 15, y)
        y += 8
      } else {
        unresolved.forEach((a) => {
          if (y > 270) { doc.addPage(); y = 20 }
          doc.text(`[${a.id}] ${a.type} (${a.severity})`, 15, y)
          y += 5
          doc.text(`Trigger: ${a.triggerMaterialId} - ${a.triggerMaterialDesc}`, 20, y)
          y += 5
          doc.text(`Impact: ${a.affectedConclusionId} - ${a.affectedConclusionDesc}`, 20, y)
          y += 5
          doc.text(`Suggestion: ${a.suggestion}`, 20, y)
          y += 8
        })
      }
      y += 4
      doc.setFontSize(14)
      doc.text("Override Records", 15, y)
      y += 8
      doc.setFontSize(10)
      if (overrides.length === 0) {
        doc.text("No override records.", 15, y)
      } else {
        overrides.forEach((o) => {
          if (y > 270) { doc.addPage(); y = 20 }
          doc.text(`[${o.id}] Sample: ${o.sampleId} | Operator: ${o.operator} | ${o.createdAt}`, 15, y)
          y += 5
          doc.text(`${o.previousValue ?? "null"} -> ${o.newValue ?? "null"} | Reason: ${o.reason}`, 20, y)
          y += 8
        })
      }
      doc.save("概率抽样边界复核_报告.pdf")
      setPdfState("done")
      setTimeout(() => setPdfState("idle"), 2000)
    }, 600)
  }

  const btnLabel = (state: "idle" | "loading" | "done", idle: string) =>
    state === "loading" ? "导出中..." : state === "done" ? "已导出 ✓" : idle

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-bold tracking-tight">导出与报告</h1>
          <p className="mt-1 text-gray-400">生成复核报告并导出数据文件</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            报告预览
          </h2>
          <div className="overflow-y-auto max-h-[70vh] rounded-lg shadow-2xl mx-auto" style={{ maxWidth: 820 }}>
            <div className="bg-white text-gray-900 p-10 sm:p-14" style={{ minHeight: 600 }}>
              <h3
                className="text-center text-2xl font-bold tracking-wide mb-8"
                style={{ fontFamily: "'Source Serif 4', 'Noto Serif SC', serif" }}
              >
                概率抽样边界复核报告
              </h3>

              <section className="mb-8">
                <h4 className="text-base font-semibold border-b border-gray-200 pb-1 mb-3">统计概要</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">总样本数</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">边界异常数</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">待复核数</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">已改判数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-3 py-2">{stats.totalSamples}</td>
                      <td className="border border-gray-200 px-3 py-2 text-red-600 font-medium">{stats.boundaryAnomalies}</td>
                      <td className="border border-gray-200 px-3 py-2 text-amber-600 font-medium">{stats.pendingReview}</td>
                      <td className="border border-gray-200 px-3 py-2 text-blue-600 font-medium">{stats.overridden}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8">
                <h4 className="text-base font-semibold border-b border-gray-200 pb-1 mb-3">异常溯源链</h4>
                {unresolved.length === 0 ? (
                  <p className="text-sm text-gray-500">无相关记录</p>
                ) : (
                  <div className="space-y-4">
                    {unresolved.map((a) => (
                      <div key={a.id} className="border border-gray-200 rounded p-3 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono font-semibold">{a.id}</span>
                          <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100">{boundaryTypeLabel[a.type]}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${a.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {severityLabel[a.severity]}
                          </span>
                        </div>
                        <div className="ml-2 space-y-1 text-gray-700">
                          <p><span className="font-medium text-gray-900">触发材料:</span> {a.triggerMaterialId} — {a.triggerMaterialDesc}</p>
                          <p><span className="font-medium text-gray-900">影响结论:</span> {a.affectedConclusionId} — {a.affectedConclusionDesc}</p>
                          <p><span className="font-medium text-gray-900">建议:</span> {a.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-base font-semibold border-b border-gray-200 pb-1 mb-3">改判记录</h4>
                {overrides.length === 0 ? (
                  <p className="text-sm text-gray-500">无相关记录</p>
                ) : (
                  <div className="space-y-3">
                    {overrides.map((o) => (
                      <div key={o.id} className="border border-gray-200 rounded p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold">{o.sampleId}</span>
                          <span className="text-gray-500">|</span>
                          <span>{o.operator}</span>
                          <span className="text-gray-400 text-xs">{new Date(o.createdAt).toLocaleString("zh-CN")}</span>
                        </div>
                        <p className="text-gray-700">
                          <span className="line-through text-red-500">{o.previousValue ?? "null"}</span>
                          <span className="mx-2">→</span>
                          <span className="text-blue-600 font-medium">{o.newValue ?? "null"}</span>
                        </p>
                        <p className="text-gray-600 mt-1">原因: {o.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            文件导出
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCsvExport}
              disabled={csvState === "loading"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <FileDown className="w-4 h-4" />
              {btnLabel(csvState, "导出 CSV")}
            </button>
            <button
              onClick={handlePdfExport}
              disabled={pdfState === "loading"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              {btnLabel(pdfState, "导出 PDF")}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4">快速指引</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/"
              className="flex items-center gap-3 p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500/50 transition-colors group"
            >
              <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="font-medium text-sm">数据入口</p>
                <p className="text-xs text-gray-500">复核看板</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-blue-400 transition-colors" />
            </Link>
            <Link
              to="/anomalies"
              className="flex items-center gap-3 p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-amber-500/50 transition-colors group"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-sm">异常列表</p>
                <p className="text-xs text-gray-500">异常溯源与处理</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-amber-400 transition-colors" />
            </Link>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-900 border border-emerald-500/30">
              <Download className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-medium text-sm">导出位置</p>
                <p className="text-xs text-emerald-400">您正在此处</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
