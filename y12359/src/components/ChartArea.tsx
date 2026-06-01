import { useMemo } from "react"
import ReactECharts from "echarts-for-react"
import { useStore } from "@/store/useStore"
import { anomalyExplanations } from "@/data/mock"

export default function ChartArea() {
  const getFilteredReviews = useStore((s) => s.getFilteredReviews)
  const getSignal = useStore((s) => s.getSignal)
  const getReading = useStore((s) => s.getReading)
  const getDevice = useStore((s) => s.getDevice)
  const reviews = getFilteredReviews()

  const deviationChart = useMemo(() => {
    const batches = [...new Set(reviews.map((r) => r.batchId))].sort()
    const data = batches.map((batch) => {
      const batchReviews = reviews.filter((r) => r.batchId === batch)
      const avgDeviation =
        batchReviews.reduce((sum, r) => {
          const reading = getReading(r.readingRecordId)
          return sum + (reading?.deviationPercent ?? 0)
        }, 0) / batchReviews.length
      return { batch, value: Number(avgDeviation.toFixed(2)) }
    })

    return {
      backgroundColor: "transparent",
      grid: { top: 30, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: "category",
        data: data.map((d) => d.batch),
        axisLine: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "偏差 %",
        nameTextStyle: { color: "#94a3b8", fontSize: 10 },
        axisLine: { lineStyle: { color: "#475569" } },
        splitLine: { lineStyle: { color: "#1e293b" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      series: [
        {
          type: "line",
          data: data.map((d) => d.value),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { color: "#818cf8", width: 2 },
          itemStyle: { color: "#818cf8" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(129,140,248,0.25)" },
                { offset: 1, color: "rgba(129,140,248,0.02)" },
              ],
            },
          },
          markLine: {
            silent: true,
            lineStyle: { color: "#f59e0b", type: "dashed" },
            data: [{ yAxis: 2.0, label: { formatter: "阈值 2%", color: "#f59e0b", fontSize: 10 } }],
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
  }, [reviews, getReading])

  const categoryChart = useMemo(() => {
    const cats = [
      { name: "标准过期", value: 0, color: "#f87171" },
      { name: "温漂异常", value: 0, color: "#fbbf24" },
      { name: "读数缺口", value: 0, color: "#94a3b8" },
    ]
    for (const rev of reviews) {
      const anomalies = anomalyExplanations.filter((a) => rev.anomalyExplanationIds.includes(a.id))
      for (const a of anomalies) {
        if (a.category === "standard_expired") cats[0].value++
        else if (a.category === "temp_drift") cats[1].value++
        else if (a.category === "reading_gap") cats[2].value++
      }
    }

    return {
      backgroundColor: "transparent",
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          center: ["50%", "50%"],
          data: cats,
          label: { color: "#cbd5e1", fontSize: 11 },
          labelLine: { lineStyle: { color: "#475569" } },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" },
          },
        },
      ],
      tooltip: {
        trigger: "item",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
      },
    }
  }, [reviews])

  const correctionChart = useMemo(() => {
    const data = reviews.map((rev) => {
      const reading = getReading(rev.readingRecordId)
      const signal = getSignal(rev.standardSignalId)
      const device = getDevice(rev.deviceRecordId)
      return {
        label: device ? `${device.deviceNumber.slice(-3)}` : rev.id,
        signalName: signal?.name ?? "",
        value: reading ? Number((reading.deviation * (1 / 0.995 - 1) * 100).toFixed(2)) : 0,
      }
    })

    return {
      backgroundColor: "transparent",
      grid: { top: 30, right: 20, bottom: 30, left: 60 },
      xAxis: {
        type: "category",
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#94a3b8", fontSize: 9, rotate: 30 },
      },
      yAxis: {
        type: "value",
        name: "修正幅度",
        nameTextStyle: { color: "#94a3b8", fontSize: 10 },
        axisLine: { lineStyle: { color: "#475569" } },
        splitLine: { lineStyle: { color: "#1e293b" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => ({
            value: d.value,
            itemStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: "#67e8f9" },
                  { offset: 1, color: "#0891b2" },
                ],
              },
              borderRadius: [3, 3, 0, 0],
            },
          })),
          barWidth: "50%",
        },
      ],
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
      },
    }
  }, [reviews, getReading, getSignal, getDevice])

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">偏差趋势（按批次）</h3>
        <ReactECharts option={deviationChart} style={{ height: 220 }} />
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">异常类别分布</h3>
        <ReactECharts option={categoryChart} style={{ height: 220 }} />
      </div>
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">环境修正幅度</h3>
        <ReactECharts option={correctionChart} style={{ height: 220 }} />
      </div>
    </div>
  )
}
