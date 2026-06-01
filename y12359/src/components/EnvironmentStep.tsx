import ReactECharts from "echarts-for-react"
import { useStore } from "@/store/useStore"
import type { CalibrationReview } from "@/types"

export default function EnvironmentStep({ review }: { review: CalibrationReview }) {
  const getEnvironment = useStore((s) => s.getEnvironment)
  const getReading = useStore((s) => s.getReading)
  const env = getEnvironment(review.environmentRecordId)
  const reading = getReading(review.readingRecordId)

  if (!env || !reading) return <div className="text-slate-500 text-sm">无环境数据</div>

  const tempOutOfRange = env.temperature < 21 || env.temperature > 25
  const humidityOutOfRange = env.humidity < 40 || env.humidity > 60

  const tempGaugeOption = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        center: ["50%", "60%"],
        radius: "85%",
        startAngle: 210,
        endAngle: -30,
        min: 15,
        max: 35,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.3, "#3b82f6"],
              [0.5, "#10b981"],
              [0.7, "#3b82f6"],
              [1, "#ef4444"],
            ],
          },
        },
        axisTick: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#94a3b8", fontSize: 9, distance: 8 },
        pointer: { width: 4, length: "60%", itemStyle: { color: tempOutOfRange ? "#f87171" : "#818cf8" } },
        detail: {
          formatter: "{value}°C",
          color: tempOutOfRange ? "#f87171" : "#e2e8f0",
          fontSize: 14,
          fontFamily: "JetBrains Mono",
          offsetCenter: [0, "30%"],
        },
        data: [{ value: env.temperature }],
      },
    ],
  }

  const humidityGaugeOption = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        center: ["50%", "60%"],
        radius: "85%",
        startAngle: 210,
        endAngle: -30,
        min: 20,
        max: 80,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.33, "#3b82f6"],
              [0.5, "#10b981"],
              [0.67, "#3b82f6"],
              [1, "#ef4444"],
            ],
          },
        },
        axisTick: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#94a3b8", fontSize: 9, distance: 8 },
        pointer: { width: 4, length: "60%", itemStyle: { color: humidityOutOfRange ? "#f87171" : "#818cf8" } },
        detail: {
          formatter: "{value}%",
          color: humidityOutOfRange ? "#f87171" : "#e2e8f0",
          fontSize: 14,
          fontFamily: "JetBrains Mono",
          offsetCenter: [0, "30%"],
        },
        data: [{ value: env.humidity }],
      },
    ],
  }

  const driftPieOption = {
    backgroundColor: "transparent",
    series: [
      {
        type: "pie",
        radius: ["50%", "70%"],
        center: ["50%", "50%"],
        data: [
          { value: env.tempDriftContribution, name: "温漂贡献", itemStyle: { color: "#fbbf24" } },
          { value: Math.max(0, Math.abs(reading.deviation) - env.tempDriftContribution), name: "其他因素", itemStyle: { color: "#334155" } },
        ],
        label: { color: "#cbd5e1", fontSize: 10 },
        labelLine: { lineStyle: { color: "#475569" } },
      },
    ],
    tooltip: {
      trigger: "item",
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
    },
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-slate-800/80 p-4 border border-slate-700/40">
          <h4 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">温度</h4>
          <ReactECharts option={tempGaugeOption} style={{ height: 160 }} />
          {tempOutOfRange && <p className="text-xs text-red-400 text-center mt-1">⚠ 超出推荐范围 23±2°C</p>}
        </div>
        <div className="rounded-lg bg-slate-800/80 p-4 border border-slate-700/40">
          <h4 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">湿度</h4>
          <ReactECharts option={humidityGaugeOption} style={{ height: 160 }} />
          {humidityOutOfRange && <p className="text-xs text-red-400 text-center mt-1">⚠ 超出推荐范围 40~60%</p>}
        </div>
        <div className="rounded-lg bg-slate-800/80 p-4 border border-slate-700/40">
          <h4 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">温漂贡献度</h4>
          <ReactECharts option={driftPieOption} style={{ height: 160 }} />
          <p className="text-xs text-center text-amber-400 mt-1 font-mono">
            {env.tempDriftContribution} dBm
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/80 border border-slate-700/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="text-left px-4 py-2 text-xs text-slate-500">项目</th>
              <th className="text-left px-4 py-2 text-xs text-slate-500">修正前</th>
              <th className="text-left px-4 py-2 text-xs text-slate-500">修正系数</th>
              <th className="text-left px-4 py-2 text-xs text-slate-500">修正后</th>
              <th className="text-left px-4 py-2 text-xs text-slate-500">变化</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700/20">
              <td className="px-4 py-2 text-slate-300">读数</td>
              <td className="px-4 py-2 font-mono text-slate-200">{reading.measuredValue}</td>
              <td className="px-4 py-2 font-mono text-cyan-400">×{env.correctionFactor}</td>
              <td className="px-4 py-2 font-mono text-emerald-400">{env.correctedValue}</td>
              <td className="px-4 py-2 font-mono text-amber-400">
                {(env.correctedValue - reading.measuredValue).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
