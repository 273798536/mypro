import ReactECharts from "echarts-for-react"
import { useStore } from "@/store/useStore"
import type { CalibrationReview } from "@/types"

export default function DeviationStep({ review }: { review: CalibrationReview }) {
  const getReading = useStore((s) => s.getReading)
  const reading = getReading(review.readingRecordId)

  if (!reading) return <div className="text-slate-500 text-sm">无读数数据</div>

  const threshold = 2.0
  const isWithinThreshold = Math.abs(reading.deviationPercent) <= threshold

  const chartOption = {
    backgroundColor: "transparent",
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: "category",
      data: ["实测值", "期望值"],
      axisLine: { lineStyle: { color: "#475569" } },
      axisLabel: { color: "#94a3b8", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "dBm",
      nameTextStyle: { color: "#94a3b8", fontSize: 10 },
      axisLine: { lineStyle: { color: "#475569" } },
      splitLine: { lineStyle: { color: "#1e293b" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    series: [
      {
        type: "bar",
        data: [
          {
            value: reading.measuredValue,
            itemStyle: {
              color: isWithinThreshold ? "#818cf8" : "#f87171",
              borderRadius: [4, 4, 0, 0],
            },
          },
          {
            value: reading.expectedValue,
            itemStyle: {
              color: "#334155",
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
        barWidth: "40%",
        markArea: {
          silent: true,
          data: [
            [
              {
                yAxis: reading.expectedValue - threshold,
                itemStyle: { color: "rgba(52,211,153,0.08)" },
              },
              {
                yAxis: reading.expectedValue + threshold,
              },
            ],
          ],
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
    },
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/40">
          <p className="text-xs text-slate-500 mb-1">实测值</p>
          <p className="text-lg font-mono font-semibold text-slate-100">{reading.measuredValue} <span className="text-xs text-slate-400">dBm</span></p>
        </div>
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/40">
          <p className="text-xs text-slate-500 mb-1">期望值</p>
          <p className="text-lg font-mono font-semibold text-slate-100">{reading.expectedValue} <span className="text-xs text-slate-400">dBm</span></p>
        </div>
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/40">
          <p className="text-xs text-slate-500 mb-1">偏差</p>
          <p className={`text-lg font-mono font-semibold ${isWithinThreshold ? "text-emerald-400" : "text-red-400"}`}>
            {reading.deviation > 0 ? "+" : ""}{reading.deviation} <span className="text-xs">dBm</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/40">
          <p className="text-xs text-slate-500 mb-1">偏差百分比</p>
          <p className={`text-lg font-mono font-semibold ${isWithinThreshold ? "text-emerald-400" : "text-red-400"}`}>
            {reading.deviationPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-0.5">阈值: ±{threshold}%</p>
        </div>
      </div>
      <ReactECharts option={chartOption} style={{ height: 200 }} />
    </div>
  )
}
