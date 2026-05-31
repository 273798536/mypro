import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Download, Music, Mic, BarChart3, ChevronRight } from "lucide-react"
import { useStore } from "@/store/useStore"
import { exportData } from "@/utils/exporter"
import type { ExportFormat } from "@/types"

export default function DashboardPage() {
  const { results } = useStore()
  const [selectedKey, setSelectedKey] = useState<string>("全部")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const comboKeys = useMemo(() => {
    const keys = Array.from(new Set(results.map((r) => `${r.studentName}::${r.songTitle}`)))
    return ["全部", ...keys]
  }, [results])

  const filteredResults = useMemo(() => {
    if (selectedKey === "全部") return results
    const [studentName, songTitle] = selectedKey.split("::")
    return results.filter((r) => r.studentName === studentName && r.songTitle === songTitle)
  }, [results, selectedKey])

  const activeResult = filteredResults.length > 0 ? filteredResults[0] : null

  const melodyChartData = useMemo(() => {
    if (!activeResult) return []
    return activeResult.melodyLine.map((p) => ({
      timestamp: p.timestamp,
      pitch: p.pitch,
    }))
  }, [activeResult])

  const breathingDots = useMemo(() => {
    if (!activeResult) return []
    return activeResult.breathingPoints.map((bp) => ({
      timestamp: bp.timestamp,
      pitch:
        activeResult.melodyLine.find(
          (m) => Math.abs(m.timestamp - bp.timestamp) < 0.05
        )?.pitch ?? 0,
    }))
  }, [activeResult])

  const silenceChartData = useMemo(() => {
    if (!activeResult) return []
    return activeResult.silenceSegments.map((s) => ({
      id: s.id,
      duration: Number(s.duration.toFixed(3)),
      isMisjudgment: s.isMisjudgment,
    }))
  }, [activeResult])

  const practiceChartData = useMemo(() => {
    const map = new Map<string, { studentName: string; songTitle: string; count: number }>()
    for (const r of filteredResults) {
      const key = `${r.studentName}::${r.songTitle}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, { studentName: r.studentName, songTitle: r.songTitle, count: 1 })
      }
    }
    return Array.from(map.values()).map((item) => ({
      label: `${item.studentName} - ${item.songTitle}`,
      count: item.count,
    }))
  }, [filteredResults])

  const handleExport = (format: ExportFormat) => {
    exportData(filteredResults, format)
    setDropdownOpen(false)
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BarChart3 className="mb-4 h-16 w-16 text-navy-400" />
        <p className="mb-4 text-lg text-slate-300">请先在数据导入页加载数据</p>
        <Link
          to="/"
          className="rounded-lg bg-amber-500 px-6 py-2 font-semibold text-navy-900 transition-colors hover:bg-amber-400"
        >
          前往导入
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-white">分析看板</h1>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-navy-600"
          >
            <Download className="h-4 w-4" />
            导出
            <ChevronRight className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-90" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-lg bg-navy-700 shadow-lg">
              <button
                onClick={() => handleExport("csv")}
                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-navy-600"
              >
                导出 CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-navy-600"
              >
                导出 JSON
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {comboKeys.map((key) => (
          <button
            key={key}
            onClick={() => setSelectedKey(key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              selectedKey === key
                ? "bg-amber-500 text-navy-900 font-semibold"
                : "bg-navy-700 text-slate-300 hover:bg-navy-600"
            }`}
          >
            {key === "全部" ? "全部" : key.replace("::", " · ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg bg-navy-700 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <Music className="h-5 w-5 text-amber-500" />
            旋律线与换气点
          </h2>
          {melodyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={melodyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D4D6F" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: "#9BAABF", fontSize: 12 }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <YAxis tick={{ fill: "#9BAABF", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1F324A", border: "1px solid #2D4D6F", borderRadius: 8 }}
                  labelFormatter={(v: number) => `时间: ${v.toFixed(2)}s`}
                  formatter={(value: number) => [`${value.toFixed(1)} Hz`, "音高"]}
                />
                <Line type="monotone" dataKey="pitch" stroke="#E8A838" dot={false} strokeWidth={2} />
                {breathingDots.map((dot, i) => (
                  <ReferenceDot
                    key={i}
                    x={dot.timestamp}
                    y={dot.pitch}
                    r={5}
                    fill="#F5C563"
                    stroke="#E8A838"
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">暂无旋律数据</p>
          )}
        </div>

        <div className="rounded-lg bg-navy-700 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <Mic className="h-5 w-5 text-sage-500" />
            静音段分析
          </h2>
          {silenceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={silenceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D4D6F" />
                <XAxis dataKey="id" tick={{ fill: "#9BAABF", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9BAABF", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1F324A", border: "1px solid #2D4D6F", borderRadius: 8 }}
                  formatter={(value: number, _name: string, props: { payload: { isMisjudgment: boolean } }) => [
                    `${value}s`,
                    props.payload.isMisjudgment ? "误判" : "正常",
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    value === "normal" ? "正常段" : value === "misjudgment" ? "误判段" : value
                  }
                />
                <Bar
                  dataKey="duration"
                  name="normal"
                  fill="#6B8F71"
                  stackId="a"
                />
                <Bar
                  dataKey="duration"
                  name="misjudgment"
                  fill="#E85D4A"
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">暂无静音段数据</p>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-navy-700 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          练习次数统计
        </h2>
        {practiceChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={practiceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D4D6F" />
              <XAxis dataKey="label" tick={{ fill: "#9BAABF", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9BAABF", fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1F324A", border: "1px solid #2D4D6F", borderRadius: 8 }}
                formatter={(value: number) => [`${value} 次`, "练习次数"]}
              />
              <Bar dataKey="count" fill="#E8A838" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">暂无练习数据</p>
        )}
      </div>

      <div className="rounded-lg bg-navy-700 p-4">
        <h2 className="mb-3 text-base font-semibold text-white">详细数据</h2>
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-sm text-slate-300">
            <thead className="sticky top-0 bg-navy-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-400">结果ID</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">学生</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">曲目</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">练习次数</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">换气点数</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">静音段数</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">歌词段数</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => (
                <tr key={r.id} className="border-t border-navy-600/40 hover:bg-navy-600/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2">{r.studentName}</td>
                  <td className="px-3 py-2">{r.songTitle}</td>
                  <td className="px-3 py-2 font-mono">{r.practiceIndex}</td>
                  <td className="px-3 py-2 font-mono">{r.breathingPoints.length}</td>
                  <td className="px-3 py-2 font-mono">{r.silenceSegments.length}</td>
                  <td className="px-3 py-2 font-mono">{r.lyricsAlignments.length}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/trace/${r.id}`}
                      className="flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      追溯
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
