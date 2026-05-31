import { useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { ArrowRight, Music, AlignLeft, Wind, ChevronLeft } from "lucide-react"
import { useStore } from "@/store/useStore"

export default function TracePage() {
  const { id } = useParams<{ id: string }>()
  const { results, breathingAdvices } = useStore()

  const result = results.find((r) => r.id === id)
  const advices = result ? breathingAdvices[result.id] ?? [] : []

  const melodyChartData = useMemo(() => {
    if (!result) return []
    return result.melodyLine.map((p) => ({
      timestamp: p.timestamp,
      pitch: p.pitch,
    }))
  }, [result])

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="mb-4 text-lg text-slate-300">未找到该分析结果</p>
        <Link
          to="/dashboard"
          className="rounded-lg bg-amber-500 px-6 py-2 font-semibold text-navy-900 transition-colors hover:bg-amber-400"
        >
          返回看板
        </Link>
      </div>
    )
  }

  const pitchSummary = result.melodyLine.slice(0, 5).map((p) => p.pitch)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-amber-500 transition-colors hover:text-amber-400"
        >
          <ChevronLeft className="h-5 w-5" />
          返回看板
        </Link>
        <h1 className="font-serif text-2xl font-bold text-white">追溯详情</h1>
      </div>

      <div className="flex items-center justify-center gap-0 overflow-x-auto py-4">
        <div className="flex shrink-0 flex-col items-center rounded-lg bg-navy-700 px-6 py-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <Music className="h-4 w-4 text-amber-500" />
            学生录音
          </div>
          <span className="text-sm text-slate-300">{result.studentName}</span>
        </div>

        <ArrowRight className="mx-3 h-5 w-5 shrink-0 text-slate-500" />

        <div className="flex shrink-0 flex-col items-center rounded-lg bg-navy-700 px-6 py-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <Music className="h-4 w-4 text-amber-500" />
            音频分析
          </div>
          <span className="font-mono text-xs text-slate-400">{result.traceLink.audioAnalysisRef}</span>
          <span className="mt-1 text-xs text-slate-300">换气点: <span className="font-mono">{result.breathingPoints.length}</span> · 静音段: <span className="font-mono">{result.silenceSegments.length}</span></span>
        </div>

        <ArrowRight className="mx-3 h-5 w-5 shrink-0 text-slate-500" />

        <div className="flex shrink-0 flex-col items-center rounded-lg bg-navy-700 px-6 py-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <AlignLeft className="h-4 w-4 text-sage-500" />
            歌词对齐
          </div>
          <span className="font-mono text-xs text-slate-400">{result.traceLink.lyricsAlignmentRef}</span>
          <span className="mt-1 text-xs text-slate-300">歌词段: <span className="font-mono">{result.lyricsAlignments.length}</span></span>
        </div>

        <ArrowRight className="mx-3 h-5 w-5 shrink-0 text-slate-500" />

        <div className="flex shrink-0 flex-col items-center rounded-lg bg-navy-700 px-6 py-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <Wind className="h-4 w-4 text-coral-500" />
            换气建议
          </div>
          <span className="font-mono text-xs text-slate-400">{result.traceLink.breathingAdviceRef}</span>
          <span className="mt-1 text-xs text-slate-300">建议数: <span className="font-mono">{advices.length}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-navy-700 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <Music className="h-5 w-5 text-amber-500" />
            音频分析
          </h2>
          <div className="mb-3 space-y-1 text-sm text-slate-300">
            <p>旋律前5音高: {pitchSummary.map((v) => (
              <span key={v} className="mr-1 font-mono">{v.toFixed(1)}</span>
            ))}</p>
            <p>换气点数: <span className="font-mono">{result.breathingPoints.length}</span></p>
            <p>静音段数: <span className="font-mono">{result.silenceSegments.length}</span></p>
          </div>
          {melodyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={melodyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D4D6F" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: "#9BAABF", fontSize: 10 }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <YAxis tick={{ fill: "#9BAABF", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1F324A", border: "1px solid #2D4D6F", borderRadius: 8 }}
                  labelFormatter={(v: number) => `时间: ${v.toFixed(2)}s`}
                  formatter={(value: number) => [`${value.toFixed(1)} Hz`, "音高"]}
                />
                <Line type="monotone" dataKey="pitch" stroke="#E8A838" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">暂无旋律数据</p>
          )}
        </div>

        <div className="rounded-lg bg-navy-700 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <AlignLeft className="h-5 w-5 text-sage-500" />
            歌词对齐
          </h2>
          {result.lyricsAlignments.length > 0 ? (
            <div className="overflow-auto max-h-[280px]">
              <table className="w-full text-sm text-slate-300">
                <thead className="sticky top-0 bg-navy-700">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-400">段</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-400">起始</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-400">结束</th>
                    <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-400">标记</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lyricsAlignments.map((la) => (
                    <tr key={la.id} className="border-t border-navy-600/40">
                      <td className="max-w-[80px] truncate px-2 py-1.5">{la.lyricsSegment}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{la.startTimestamp.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{la.endTimestamp.toFixed(2)}</td>
                      <td className="px-2 py-1.5">
                        {la.isMisaligned && (
                          <span className="mr-1 text-xs text-coral-500">偏移</span>
                        )}
                        {la.isOverLong && (
                          <span className="text-xs text-coral-500">过长</span>
                        )}
                        {!la.isMisaligned && !la.isOverLong && (
                          <span className="text-xs text-sage-500">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">暂无歌词对齐数据</p>
          )}
        </div>

        <div className="rounded-lg bg-navy-700 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
            <Wind className="h-5 w-5 text-coral-500" />
            换气建议
          </h2>
          {advices.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-300">
              {advices.map((advice, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">暂无换气建议</p>
          )}
        </div>
      </div>
    </div>
  )
}
