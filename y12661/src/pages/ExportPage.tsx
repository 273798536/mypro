import { useEffect, useState } from "react"
import {
  Download,
  FileText,
  Layers,
  Timer,
  RefreshCw,
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
} from "lucide-react"
import { useAppStore } from "@/store/app"
import { api } from "@/lib/api"
import { StatusTag } from "@/components/ui/StatusTag"
import { formatDateTime, cn } from "@/lib/utils"
import { TASK_STATUS_LABEL } from "@/types"

export default function ExportPage() {
  const { tasks, fetchTasks, tasksLoading } = useAppStore()
  const [selectedId, setSelectedId] = useState<string>("")
  const [reportData, setReportData] = useState<any>(null)
  const [materialsData, setMaterialsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"report" | "materials" | "timetable">("report")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    if (!selectedId && tasks.length) {
      const conflict = tasks.find((t) => t.status === "conflict") || tasks[0]
      setSelectedId(conflict.id)
    }
  }, [tasks])

  async function handleGenerate() {
    if (!selectedId) return
    setLoading(true)
    try {
      const [report, materials] = await Promise.all([
        api.getReport(selectedId),
        api.getMaterialPackage(selectedId),
      ])
      setReportData(report)
      setMaterialsData(materials)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId) handleGenerate()
  }, [selectedId])

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleDownload(filename: string, content: string, mime = "application/json") {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const selectedTask = tasks.find((t) => t.id === selectedId)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-between px-6 pt-5 pb-4">
        <div>
          <h1 className="font-mono text-xl text-eng-text font-semibold tracking-wide flex items-center gap-2">
            <span className="text-eng-muted">[</span>
            下载导出中心
            <span className="text-eng-muted">]</span>
          </h1>
          <p className="text-xs text-eng-muted mt-1 font-mono">
            // EXPORT CENTER · 甲方报告 · 材料包 · 时间对照表
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="eng-input w-80 text-sm"
          >
            <option value="">选择复核任务...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.taskNo} · {t.bridgeName} · {TASK_STATUS_LABEL[t.status]}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedId}
            className="eng-btn"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            生成数据
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 px-6 pb-6 gap-6">
        {/* Export Type Cards */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-3">
          <ExportCard
            active={tab === "report"}
            onClick={() => setTab("report")}
            icon={FileText}
            title="复核报告"
            subtitle="完整复核结论 + 变更历史 + 材料来源定位 + 模型重叠说明"
            badge="甲方专用"
          />
          <ExportCard
            active={tab === "materials"}
            onClick={() => setTab("materials")}
            icon={Layers}
            title="材料清单包"
            subtitle="截图/模型/时间记录清单，含校准状态与提交人信息"
          />
          <ExportCard
            active={tab === "timetable"}
            onClick={() => setTab("timetable")}
            icon={Timer}
            title="时间参数对照表"
            subtitle="各裂缝采集/处理/复核时间横向对比，口径异常高亮"
          />

          {selectedTask && (
            <div className="eng-card p-4 mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-eng-muted font-mono uppercase tracking-wider">
                  当前任务
                </span>
                <StatusTag status={selectedTask.status} />
              </div>
              <div className="font-mono text-sm text-eng-text font-semibold">
                {selectedTask.taskNo}
              </div>
              <div className="text-sm text-eng-dim mt-0.5">{selectedTask.bridgeName}</div>
              <div className="text-[11px] text-eng-muted font-mono mt-1">
                {selectedTask.bridgeCode} · {selectedTask.crackCount} 条裂缝
              </div>
              <div className="mt-3 pt-3 border-t border-eng-border grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-eng-muted uppercase">提交人</div>
                  <div className="text-xs text-eng-text">{selectedTask.submitter}</div>
                </div>
                <div>
                  <div className="text-[10px] text-eng-muted uppercase">提交时间</div>
                  <div className="text-xs text-eng-text font-mono">
                    {formatDateTime(selectedTask.submittedAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Preview Panel */}
        <main className="flex-1 eng-panel flex flex-col overflow-hidden">
          {!reportData || !materialsData ? (
            <div className="flex-1 flex flex-col items-center justify-center text-eng-muted font-mono">
              <FileWarning className="w-10 h-10 mb-3 opacity-50" />
              <div>{loading ? "正在生成导出数据..." : "请选择任务并点击生成数据"}</div>
              {tasksLoading && (
                <div className="flex items-center gap-2 mt-3 text-xs text-eng-muted">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  加载任务列表
                </div>
              )}
            </div>
          ) : tab === "report" ? (
            <ReportTab
              report={reportData}
              onCopy={handleCopy}
              copied={copied}
              onDownload={() =>
                handleDownload(
                  `review-report-${reportData.task.taskNo}.json`,
                  JSON.stringify(reportData, null, 2),
                )
              }
            />
          ) : tab === "materials" ? (
            <MaterialsTab
              materials={materialsData}
              onCopy={handleCopy}
              copied={copied}
              onDownload={() =>
                handleDownload(
                  `materials-${materialsData.taskNo}.json`,
                  JSON.stringify(materialsData, null, 2),
                )
              }
            />
          ) : (
            <TimetableTab
              materials={materialsData}
              onCopy={handleCopy}
              copied={copied}
              onDownload={() =>
                handleDownload(
                  `timetable-${materialsData.taskNo}.csv`,
                  buildCsv(materialsData),
                  "text/csv",
                )
              }
            />
          )}
        </main>
      </div>
    </div>
  )
}

function ExportCard({
  active,
  onClick,
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: any
  title: string
  subtitle: string
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "eng-card p-4 text-left transition-all hover:shadow-eng",
        active ? "border-eng-primary bg-eng-primary/10 shadow-eng" : "",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 border-2 flex items-center justify-center flex-shrink-0",
            active ? "border-eng-primary bg-eng-primary/20 text-eng-primary" : "border-eng-border text-eng-muted",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", active ? "text-eng-text" : "text-eng-dim")}>
              {title}
            </span>
            {badge && (
              <span className="eng-tag border-eng-accent text-eng-accent bg-eng-accent/10 text-[10px]">
                {badge}
              </span>
            )}
          </div>
          <div className="text-[11px] text-eng-muted mt-1 leading-snug">{subtitle}</div>
        </div>
        <ArrowRight
          className={cn("w-4 h-4 flex-shrink-0 mt-1", active ? "text-eng-primary" : "text-eng-muted")}
        />
      </div>
    </button>
  )
}

function ReportTab({
  report,
  onCopy,
  copied,
  onDownload,
}: {
  report: any
  onCopy: (t: string) => void
  copied: boolean
  onDownload: () => void
}) {
  const text = JSON.stringify(report, null, 2)
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-eng-border bg-eng-card/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-eng-primary" />
          <span className="font-mono text-sm text-eng-text font-semibold">复核报告预览</span>
          <span className="text-[10px] text-eng-muted font-mono">
            生成于 {formatDateTime(report.generatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCopy(text)} className="eng-btn-ghost text-xs px-2.5 py-1">
            <Copy className="w-3.5 h-3.5" />
            {copied ? "已复制" : "复制 JSON"}
          </button>
          <button onClick={onDownload} className="eng-btn text-xs px-2.5 py-1">
            <Download className="w-3.5 h-3.5" />
            下载报告
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoCard title="任务信息" subtitle="TASK INFO">
            <InfoRow label="任务编号" value={report.task.taskNo} mono />
            <InfoRow label="桥梁名称" value={report.task.bridgeName} />
            <InfoRow label="桥梁编号" value={report.task.bridgeCode} mono />
            <InfoRow label="提交人" value={report.task.submitter} />
            <InfoRow label="提交时间" value={formatDateTime(report.task.submittedAt)} mono />
            <InfoRow label="复核状态" value={TASK_STATUS_LABEL[report.task.status]} />
          </InfoCard>
          <InfoCard title="统计摘要" subtitle="SUMMARY">
            <InfoRow label="裂缝总数" value={`${report.crackSummary.length} 条`} mono />
            <InfoRow label="变更记录" value={`${report.totalChanges} 条`} mono />
            <InfoRow label="材料总数" value={`${report.totalMaterials} 份`} mono />
            <InfoRow
              label="问题材料"
              value={`${report.problemMaterials} 份`}
              mono
              warn={report.problemMaterials > 0}
            />
          </InfoCard>
        </div>

        <InfoCard title="裂缝复核摘要" subtitle="CRACK SUMMARY" collapsible>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-eng-muted font-mono uppercase border-b border-eng-border">
                  <th className="text-left py-2 px-2 font-medium">裂缝ID</th>
                  <th className="text-left py-2 px-2 font-medium">尺寸(长×宽×深)</th>
                  <th className="text-left py-2 px-2 font-medium">碰撞</th>
                  <th className="text-left py-2 px-2 font-medium">重叠材料</th>
                  <th className="text-left py-2 px-2 font-medium">结论</th>
                </tr>
              </thead>
              <tbody>
                {report.crackSummary.map((c: any) => (
                  <tr key={c.crackId} className="border-b border-eng-border/50">
                    <td className="py-2 px-2 font-mono text-eng-primary">{c.crackId}</td>
                    <td className="py-2 px-2 font-mono text-eng-text">{c.size}</td>
                    <td className="py-2 px-2">
                      {c.collision === "是" ? (
                        <span className="eng-tag border-eng-warn text-eng-warn bg-eng-warn/10 gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> 是
                        </span>
                      ) : (
                        <span className="eng-tag border-eng-pass text-eng-pass bg-eng-pass/10 gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> 否
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono text-eng-dim">{c.overlapMaterial}</td>
                    <td className="py-2 px-2 text-eng-dim">{c.conclusion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InfoCard>

        {report.materialIssues.length > 0 && (
          <InfoCard title="材料问题清单（甲方重点关注）" subtitle="MATERIAL ISSUES" warn>
            <div className="space-y-2">
              {report.materialIssues.map((m: any, i: number) => (
                <div
                  key={i}
                  className="eng-card p-3 border-eng-warn/40 bg-eng-warn/5 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-eng-warn mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-eng-text font-medium">{m.name}</div>
                    <div className="text-[11px] text-eng-muted font-mono mt-0.5">
                      类型：{m.type} · 提交人：{m.submittedBy} · 状态：
                      <span className="text-eng-warn">{m.status}</span>
                    </div>
                    <div className="text-[11px] text-eng-warn mt-1">
                      → 模型重叠可能卡在这份材料，建议重新校准后再提交
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        <InfoCard title="变更历史" subtitle="CHANGE HISTORY">
          {report.changeHistory.length === 0 ? (
            <div className="text-xs text-eng-muted py-4 text-center font-mono">
              暂无变更记录
            </div>
          ) : (
            <div className="space-y-2">
              {report.changeHistory.map((h: any, i: number) => (
                <div key={i} className="eng-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-eng-primary">{h.field}</span>
                      {h.collisionChanged === "是" && (
                        <span className="eng-tag border-eng-warn text-eng-warn bg-eng-warn/10 text-[10px]">
                          影响碰撞判定
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-eng-muted font-mono">
                      {h.operator} · {formatDateTime(h.operatedAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-eng-bg p-2 text-xs font-mono text-eng-dim border border-eng-border">
                      旧：{h.oldValue}
                    </div>
                    <div className="bg-eng-primary/10 p-2 text-xs font-mono text-eng-text border border-eng-primary/30">
                      新：{h.newValue}
                    </div>
                  </div>
                  <div className="text-[11px] text-eng-muted mt-2">原因：{h.reason}</div>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      </div>
    </>
  )
}

function MaterialsTab({
  materials,
  onCopy,
  copied,
  onDownload,
}: {
  materials: any
  onCopy: (t: string) => void
  copied: boolean
  onDownload: () => void
}) {
  const text = JSON.stringify(materials, null, 2)
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-eng-border bg-eng-card/50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-eng-accent" />
          <span className="font-mono text-sm text-eng-text font-semibold">材料清单包</span>
          <span className="text-[10px] text-eng-muted font-mono">
            {materials.materials.length} 份材料 · {materials.timeTable.length} 条时间记录
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCopy(text)} className="eng-btn-ghost text-xs px-2.5 py-1">
            <Copy className="w-3.5 h-3.5" />
            {copied ? "已复制" : "复制 JSON"}
          </button>
          <button onClick={onDownload} className="eng-btn text-xs px-2.5 py-1">
            <Download className="w-3.5 h-3.5" />
            下载材料包
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          {materials.materials.map((m: any, i: number) => (
            <div key={i} className="eng-card p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 border border-eng-border bg-eng-bg flex items-center justify-center">
                  {m.type === "model" ? (
                    <Layers className="w-4 h-4 text-eng-muted" />
                  ) : m.type === "screenshot" ? (
                    <FileText className="w-4 h-4 text-eng-muted" />
                  ) : (
                    <Timer className="w-4 h-4 text-eng-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-eng-text truncate">{m.name}</div>
                  <div className="text-[10px] text-eng-muted font-mono">{m.sourceFile}</div>
                </div>
                <span
                  className={cn(
                    "eng-tag text-[10px]",
                    m.calibrationStatus === "calibrated"
                      ? "border-eng-pass text-eng-pass bg-eng-pass/10"
                      : m.calibrationStatus === "conflict"
                        ? "border-eng-warn text-eng-warn bg-eng-warn/10"
                        : "border-eng-muted text-eng-dim bg-eng-muted/10",
                  )}
                >
                  {m.calibrationStatus === "calibrated"
                    ? "已校准"
                    : m.calibrationStatus === "conflict"
                      ? "口径冲突"
                      : "未校准"}
                </span>
              </div>
              <div className="text-[11px] text-eng-muted mt-1">
                类型：{m.type} · 提交人：{m.submittedBy}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function TimetableTab({
  materials,
  onCopy,
  copied,
  onDownload,
}: {
  materials: any
  onCopy: (t: string) => void
  copied: boolean
  onDownload: () => void
}) {
  const csv = buildCsv(materials)
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-eng-border bg-eng-card/50">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-eng-warn" />
          <span className="font-mono text-sm text-eng-text font-semibold">时间参数对照表</span>
          <span className="text-[10px] text-eng-muted font-mono">
            时区口径异常已高亮
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onCopy(csv)} className="eng-btn-ghost text-xs px-2.5 py-1">
            <Copy className="w-3.5 h-3.5" />
            {copied ? "已复制" : "复制 CSV"}
          </button>
          <button onClick={onDownload} className="eng-btn text-xs px-2.5 py-1">
            <Download className="w-3.5 h-3.5" />
            下载 CSV
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-eng-card border-b border-eng-border z-10">
            <tr className="text-eng-muted font-mono uppercase">
              <th className="text-left py-2.5 px-4 font-medium">裂缝ID</th>
              <th className="text-left py-2.5 px-4 font-medium">采集时间</th>
              <th className="text-left py-2.5 px-4 font-medium">处理时间</th>
              <th className="text-left py-2.5 px-4 font-medium">复核时间</th>
              <th className="text-left py-2.5 px-4 font-medium">口径检查</th>
            </tr>
          </thead>
          <tbody>
            {materials.timeTable.map((t: any) => {
              const issue = detectIssue(t)
              return (
                <tr
                  key={t.crackId}
                  className={cn(
                    "border-b border-eng-border/50 hover:bg-eng-card/40",
                    issue && "bg-eng-warn/5",
                  )}
                >
                  <td className="py-2.5 px-4 font-mono text-eng-primary">{t.crackId}</td>
                  <TimeCell value={t.collectionTime} />
                  <TimeCell value={t.processTime} />
                  <TimeCell value={t.reviewTime} />
                  <td className="py-2.5 px-4">
                    {issue ? (
                      <span className="eng-tag border-eng-warn text-eng-warn bg-eng-warn/10 gap-1 text-[10px]">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {issue}
                      </span>
                    ) : (
                      <span className="eng-tag border-eng-pass text-eng-pass bg-eng-pass/10 gap-1 text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        口径一致
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TimeCell({ value }: { value: string }) {
  if (!value)
    return (
      <td className="py-2.5 px-4 font-mono text-eng-muted">—</td>
    )
  const isZ = value.includes("Z")
  const is8 = value.includes("+08")
  return (
    <td className="py-2.5 px-4">
      <div className="font-mono text-eng-text">{formatDateTime(value)}</div>
      <div
        className={cn(
          "text-[10px] font-mono mt-0.5",
          isZ ? "text-eng-warn" : is8 ? "text-eng-pass" : "text-eng-muted",
        )}
      >
        {isZ ? "UTC" : is8 ? "UTC+8" : "本地"}
      </div>
    </td>
  )
}

function InfoCard({
  title,
  subtitle,
  children,
  collapsible,
  warn,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  collapsible?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        "eng-card overflow-hidden",
        warn && "border-eng-warn/50 bg-eng-warn/5",
      )}
    >
      <div className="px-4 py-2.5 border-b border-eng-border flex items-center justify-between bg-eng-card/60">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              warn ? "text-eng-warn" : "text-eng-text",
            )}
          >
            {title}
          </span>
          <span className="text-[10px] text-eng-muted font-mono uppercase tracking-wider">
            {subtitle}
          </span>
        </div>
        {warn && <AlertTriangle className="w-3.5 h-3.5 text-eng-warn" />}
      </div>
      <div className={collapsible ? "p-0" : "p-4"}>{children}</div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
  warn,
}: {
  label: string
  value: string
  mono?: boolean
  warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-eng-border/40 last:border-0">
      <span className="text-[11px] text-eng-muted">{label}</span>
      <span
        className={cn(
          mono ? "font-mono" : "",
          warn ? "text-eng-warn" : "text-eng-text",
          "text-xs",
        )}
      >
        {value}
      </span>
    </div>
  )
}

function detectIssue(t: any): string | null {
  if (!t.collectionTime || !t.processTime) return null
  const z1 = t.collectionTime.includes("Z")
  const z2 = t.processTime.includes("Z")
  const p1 = t.collectionTime.includes("+08")
  const p2 = t.processTime.includes("+08")
  if (z1 !== z2 || p1 !== p2) return "时区口径不一致"
  return null
}

function buildCsv(materials: any): string {
  const header = ["裂缝ID", "采集时间", "处理时间", "复核时间", "口径检查"]
  const rows = materials.timeTable.map((t: any) => {
    const issue = detectIssue(t) || "口径一致"
    return [t.crackId, t.collectionTime, t.processTime, t.reviewTime || "", issue]
  })
  return [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
}
