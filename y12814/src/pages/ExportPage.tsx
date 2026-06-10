import { useTiterStore } from "@/store"
import { useState } from "react"
import dayjs from "dayjs"
import * as XLSX from "xlsx"
import {
  Download,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import StatusBadge from "@/components/StatusBadge"

export default function ExportPage() {
  const {
    currentBatch,
    getSamplesByBatch,
    getBatchSummary,
    runHistory,
    createRun,
  } = useTiterStore()
  const samples = getSamplesByBatch(currentBatch)
  const summary = getBatchSummary(currentBatch)
  const [exported, setExported] = useState(false)
  const [lastRunId, setLastRunId] = useState<string | null>(null)

  const pendingSamples = samples.filter((s) => s.status === "pending")
  const badSamples = samples.filter((s) => s.status === "bad")
  const passSamples = samples.filter((s) => s.status === "pass")

  const handleExport = () => {
    const now = dayjs()
    const run = createRun(currentBatch)
    setLastRunId(run.runId)
    setExported(true)

    const header = [
      "样本ID",
      "物种名",
      "标准名",
      "滴度值",
      "批号",
      "状态",
      "是否同义名",
      "是否污染",
      "拦截原因",
      "运行ID",
      "导出时间",
    ]

    const rows = samples.map((s) => [
      s.id,
      s.speciesName,
      s.standardName || "",
      `1:${s.titerValue}`,
      s.batchNo,
      s.status === "pass" ? "通过" : s.status === "pending" ? "待确认" : "坏数据",
      s.isSynonym ? "是" : "否",
      s.isContaminated ? "是" : "否",
      s.blockReason || "",
      run.runId,
      now.format("YYYY-MM-DD HH:mm:ss"),
    ])

    const wsData = [header, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    ws["!cols"] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 20 },
      { wch: 10 },
      { wch: 14 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 50 },
      { wch: 24 },
      { wch: 20 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "复核结果")

    const summaryHeader = ["指标", "数值"]
    const summaryRows = [
      ["试剂批号", currentBatch],
      ["样本总数", String(summary.total)],
      ["通过数", String(summary.passCount)],
      ["待确认数", String(summary.pendingCount)],
      ["坏数据数", String(summary.badCount)],
      ["运行ID", run.runId],
      ["导出时间", now.format("YYYY-MM-DD HH:mm:ss")],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows])
    ws2["!cols"] = [{ wch: 14 }, { wch: 28 }]
    XLSX.utils.book_append_sheet(wb, ws2, "统计概要")

    const filename = `titer_review_${currentBatch}_${now.format("YYYYMMDD_HHmmss")}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          导出报告
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          试剂批号 {currentBatch} · 复核报告预览与下载
        </p>
      </div>

      <div
        className="rounded-lg p-8 mb-6"
        style={{
          background: "var(--color-slate-card)",
          border: "1px solid var(--color-slate-border)",
          maxWidth: "820px",
          margin: "0 auto",
        }}
      >
        <div className="text-center mb-8 pb-6 border-b" style={{ borderColor: "var(--color-slate-border)" }}>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            疫苗抗体滴度复核报告
          </h3>
          <p className="text-sm mt-2 font-mono" style={{ color: "var(--color-text-muted)" }}>
            试剂批号: {currentBatch}
          </p>
          <p className="text-xs mt-1 font-mono" style={{ color: "var(--color-text-muted)" }}>
            生成时间: {dayjs().format("YYYY-MM-DD HH:mm:ss")}
          </p>
        </div>

        <section className="mb-6">
          <h4 className="text-sm font-medium mb-3" style={{ color: "var(--color-amber-accent)" }}>
            一、统计概要
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <SummaryItem label="总数" value={summary.total} color="var(--color-amber-accent)" />
            <SummaryItem label="通过" value={summary.passCount} color="var(--color-emerald-pass)" />
            <SummaryItem label="待确认" value={summary.pendingCount} color="var(--color-amber-pending)" />
            <SummaryItem label="坏数据" value={summary.badCount} color="var(--color-red-bad)" />
          </div>
        </section>

        <section className="mb-6">
          <h4 className="text-sm font-medium mb-3" style={{ color: "var(--color-amber-accent)" }}>
            二、样本明细
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-slate-border)" }}>
                  <th className="text-left py-2 pr-3 font-medium" style={{ color: "var(--color-text-muted)" }}>样本ID</th>
                  <th className="text-left py-2 pr-3 font-medium" style={{ color: "var(--color-text-muted)" }}>物种名</th>
                  <th className="text-left py-2 pr-3 font-medium" style={{ color: "var(--color-text-muted)" }}>滴度值</th>
                  <th className="text-left py-2 pr-3 font-medium" style={{ color: "var(--color-text-muted)" }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--color-slate-border)" }}>
                    <td className="py-2 pr-3 font-mono" style={{ color: "var(--color-text-primary)" }}>{s.id}</td>
                    <td className="py-2 pr-3" style={{ color: s.isSynonym ? "var(--color-amber-pending)" : "var(--color-text-primary)" }}>
                      {s.speciesName}
                    </td>
                    <td className="py-2 pr-3 font-mono" style={{ color: "var(--color-text-primary)" }}>1:{s.titerValue}</td>
                    <td className="py-2 pr-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {pendingSamples.length > 0 && (
          <section className="mb-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-amber-pending)" }}>
              <AlertTriangle size={14} />
              三、同义名拦截说明
            </h4>
            <div className="space-y-2">
              {pendingSamples.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md p-3 text-xs"
                  style={{
                    background: "rgba(251,191,36,0.06)",
                    border: "1px solid rgba(251,191,36,0.15)",
                  }}
                >
                  <p className="font-medium mb-1" style={{ color: "var(--color-amber-pending)" }}>
                    样本 {s.id}：{s.speciesName}
                  </p>
                  <p style={{ color: "var(--color-text-secondary)" }}>
                    该样本录入的物种名 <span className="font-mono">{s.speciesName}</span> 命中了同义词表，
                    其标准名为 <span className="font-mono" style={{ color: "var(--color-emerald-pass)" }}>{s.standardName}</span>。
                    这意味着录入时使用了亚种名或历史同义名，而非 NCBI Taxonomy 标准物种名。
                    在疫苗抗体滴度复核中，不同亚种的免疫应答可能存在差异，因此需要人工确认该样本是否确实属于
                    <span className="font-mono" style={{ color: "var(--color-emerald-pass)" }}>{s.standardName}</span>。
                    如果确认是同一物种，系统将自动归并到标准名下。
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {badSamples.length > 0 && (
          <section className="mb-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-red-bad)" }}>
              <XCircle size={14} />
              {pendingSamples.length > 0 ? "四" : "三"}、污染样本说明
            </h4>
            <div className="space-y-2">
              {badSamples.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md p-3 text-xs"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                  }}
                >
                  <p className="font-medium mb-1" style={{ color: "var(--color-red-bad)" }}>
                    样本 {s.id}：{s.speciesName}
                  </p>
                  <p style={{ color: "var(--color-text-secondary)" }}>
                    该样本的物种名 <span className="font-mono">{s.speciesName}</span> 不在本批次预期物种范围内
                    （预期物种：{passSamples.map((p) => p.speciesName).join("、")}），
                    且滴度值 1:{s.titerValue} 明显低于正常水平。
                    这种情况通常由以下原因导致：(1) 样本标签错误，贴错了物种信息；
                    (2) 实验操作中发生了交叉污染，非目标物种的样本混入本批次；
                    (3) 物种鉴定错误。该样本已被标记为坏数据，不计入本批次统计。
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {passSamples.length > 0 && (
          <section>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: "var(--color-emerald-pass)" }}>
              <CheckCircle size={14} />
              {pendingSamples.length > 0 && badSamples.length > 0
                ? "五"
                : pendingSamples.length > 0 || badSamples.length > 0
                ? "四"
                : "三"}
              、通过样本说明
            </h4>
            <div className="rounded-md p-3 text-xs" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
              <p style={{ color: "var(--color-text-secondary)" }}>
                以下样本物种名与标准名一致，滴度值在正常范围内，已通过复核：
                {passSamples.map((s) => (
                  <span key={s.id} className="font-mono ml-1" style={{ color: "var(--color-emerald-pass)" }}>
                    {s.id}({s.speciesName}, 1:{s.titerValue})
                  </span>
                ))}
              </p>
            </div>
          </section>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between max-w-[820px] mx-auto">
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {lastRunId && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              上次导出运行ID: <span className="font-mono">{lastRunId}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {runHistory.length > 1 && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              已导出 {runHistory.length} 次，文件名含时间戳可区分
            </span>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors line-indicator"
            style={{
              background: "var(--color-amber-accent)",
              color: "var(--color-indigo-deep)",
            }}
          >
            <Download size={16} />
            下载 Excel 报告
          </button>
        </div>
      </div>

      {exported && (
        <div
          className="mt-4 max-w-[820px] mx-auto rounded-md p-4 flex items-center gap-3 animate-fade-in-up"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}
        >
          <FileSpreadsheet size={20} style={{ color: "var(--color-emerald-pass)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-emerald-pass)" }}>
              导出成功
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              文件名格式：titer_review_{currentBatch}_YYYYMMDD_HHmmss.xlsx，
              每次运行含唯一运行ID，可区分本次与上次结果
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryItem({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div
      className="rounded-md p-3 text-center"
      style={{ background: `${color}11`, border: `1px solid ${color}22` }}
    >
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="font-mono text-lg font-bold mt-0.5" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
