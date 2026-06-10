import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { useTiterStore } from "@/store"
import { Sample, SampleStatus } from "@/types"
import { useState } from "react"
import { ArrowRight, Info } from "lucide-react"

const STATUS_COLORS: Record<SampleStatus, string> = {
  pass: "var(--color-emerald-pass)",
  pending: "var(--color-amber-pending)",
  bad: "var(--color-red-bad)",
}

const STATUS_LABELS: Record<SampleStatus, string> = {
  pass: "通过 — 滴度值在正常范围，物种名无歧义",
  pending: "待确认 — 物种名命中同义词表，需人工确认",
  bad: "坏数据 — 物种不在预期范围，疑似污染混入",
}

const THRESHOLD = 40

export default function TiterChart() {
  const { currentBatch, getSamplesByBatch, selectSample, selectedSampleId } =
    useTiterStore()
  const samples = getSamplesByBatch(currentBatch)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const chartData = samples.map((s) => ({
    id: s.id,
    speciesName: s.speciesName,
    titerValue: s.titerValue,
    status: s.status,
    label: s.id,
  }))

  const selectedSample = samples.find((s) => s.id === selectedSampleId)
  const hoveredSample = samples.find((s) => s.id === hoveredId)
  const detailSample = selectedSample || hoveredSample

  const anomalySamples = samples.filter(
    (s) => s.status === "pending" || s.status === "bad"
  )

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <div
          className="rounded-lg p-5"
          style={{
            background: "var(--color-slate-card)",
            border: "1px solid var(--color-slate-border)",
          }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>
            滴度分布图
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-border)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-slate-border)" }}
              />
              <YAxis
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-slate-border)" }}
                label={{
                  value: "滴度值",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--color-text-muted)",
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-indigo-deep)",
                  border: "1px solid var(--color-slate-border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--color-text-primary)",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, _name: any, props: any) => {
                  const speciesName = props?.payload?.speciesName ?? ""
                  return [`1:${value}  (${speciesName})`, "滴度"]
                }}
              />
              <ReferenceLine
                y={THRESHOLD}
                stroke="var(--color-red-bad)"
                strokeDasharray="6 3"
                label={{
                  value: "污染阈值 1:40",
                  position: "right",
                  fill: "var(--color-red-bad)",
                  fontSize: 10,
                }}
              />
              <Bar
                dataKey="titerValue"
                radius={[4, 4, 0, 0]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(data: any) => {
                  if (data?.id) selectSample(data.id)
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onMouseEnter={(data: any) => {
                  if (data?.id) setHoveredId(data.id)
                }}
                onMouseLeave={() => setHoveredId(null)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={STATUS_COLORS[entry.status]}
                    opacity={
                      selectedSampleId === entry.id || hoveredId === entry.id
                        ? 1
                        : 0.8
                    }
                    stroke={
                      selectedSampleId === entry.id
                        ? "#fff"
                        : "transparent"
                    }
                    strokeWidth={selectedSampleId === entry.id ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="flex gap-4 mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "var(--color-emerald-pass)" }} />
              通过
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "var(--color-amber-pending)" }} />
              待确认
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "var(--color-red-bad)" }} />
              坏数据
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 border-t-2 border-dashed inline-block" style={{ borderColor: "var(--color-red-bad)" }} />
              污染阈值
            </span>
          </div>
        </div>
      </div>

      <div className="w-80 flex-shrink-0">
        <div
          className="rounded-lg p-5 h-full"
          style={{
            background: "var(--color-slate-card)",
            border: "1px solid var(--color-slate-border)",
          }}
        >
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
            <Info size={14} />
            明细解释
          </h3>

          {detailSample ? (
            <div className="animate-slide-in-right">
              <DetailPanel sample={detailSample} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                点击图表柱或悬停查看样本明细
              </p>

              {anomalySamples.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--color-amber-accent)" }}>
                    本批次异常样本
                  </p>
                  {anomalySamples.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start gap-2 mb-2 text-xs cursor-pointer"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => selectSample(s.id)}
                    >
                      <ArrowRight
                        size={12}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: STATUS_COLORS[s.status] }}
                      />
                      <div>
                        <span className="font-mono">{s.id}</span>{" "}
                        <span style={{ color: STATUS_COLORS[s.status] }}>
                          {s.status === "pending" ? "同义名" : "污染"}
                        </span>
                        <br />
                        <span style={{ color: "var(--color-text-muted)" }}>
                          {s.speciesName} (1:{s.titerValue})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t" style={{ borderColor: "var(--color-slate-border)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
                  状态含义
                </p>
                {(Object.keys(STATUS_LABELS) as SampleStatus[]).map((status) => (
                  <div key={status} className="flex items-start gap-2 mb-1.5 text-xs">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: STATUS_COLORS[status] }}
                    />
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {STATUS_LABELS[status]}
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

function DetailPanel({ sample }: { sample: Sample }) {
  const { confirmSynonym, rejectSample } = useTiterStore()
  const STATUS_COLORS_LOCAL: Record<SampleStatus, string> = {
    pass: "var(--color-emerald-pass)",
    pending: "var(--color-amber-pending)",
    bad: "var(--color-red-bad)",
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
            {sample.id}
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: STATUS_COLORS_LOCAL[sample.status] }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          创建时间: {new Date(sample.createdAt).toLocaleString("zh-CN")}
        </p>
      </div>

      <div className="space-y-2">
        <DetailRow label="物种名" value={sample.speciesName} highlight={sample.isSynonym} />
        {sample.standardName && (
          <DetailRow label="标准名" value={sample.standardName} highlight={false} />
        )}
        <DetailRow
          label="滴度值"
          value={`1:${sample.titerValue}`}
          highlight={sample.titerValue < THRESHOLD}
        />
        <DetailRow label="批号" value={sample.batchNo} highlight={false} />
      </div>

      {sample.blockReason && (
        <div
          className="rounded-md p-3 text-xs"
          style={{
            background: sample.status === "bad" ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.1)",
            border: `1px solid ${sample.status === "bad" ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)"}`,
            color: sample.status === "bad" ? "var(--color-red-bad)" : "var(--color-amber-pending)",
          }}
        >
          <p className="font-medium mb-1">拦截原因</p>
          <p>{sample.blockReason}</p>
        </div>
      )}

      {sample.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => confirmSynonym(sample.id)}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors"
            style={{
              background: "rgba(52,211,153,0.15)",
              color: "var(--color-emerald-pass)",
              border: "1px solid rgba(52,211,153,0.3)",
            }}
          >
            确认同义，改为通过
          </button>
          <button
            onClick={() => rejectSample(sample.id)}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors"
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "var(--color-red-bad)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            拒绝，标记坏数据
          </button>
        </div>
      )}

      {sample.status === "bad" && !sample.isContaminated && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          此样本已被确认拒绝
        </p>
      )}

      {!sample.blockReason && (
        <div
          className="rounded-md p-3 text-xs"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
            color: "var(--color-emerald-pass)",
          }}
        >
          该样本物种名无歧义，滴度值正常，已通过复核。
        </div>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span
        className={`font-mono ${highlight ? "font-semibold" : ""}`}
        style={{
          color: highlight ? "var(--color-amber-accent)" : "var(--color-text-primary)",
        }}
      >
        {value}
        {highlight && (
          <span className="ml-1.5 text-xs font-sans" style={{ color: "var(--color-amber-pending)" }}>
            ← 注意
          </span>
        )}
      </span>
    </div>
  )
}
