import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, VolumeX, AlignLeft, Clock, CheckCircle } from "lucide-react"
import { useStore } from "@/store/useStore"

type TabKey = "silence" | "misaligned" | "overlong"

const TABS: { key: TabKey; label: string }[] = [
  { key: "silence", label: "静音误判" },
  { key: "misaligned", label: "歌词错位" },
  { key: "overlong", label: "长句超限" },
]

function formatTime(ts: number) {
  return ts.toFixed(2) + "s"
}

export default function ReviewPage() {
  const { results, markSilenceMisjudgment, markLyricsReviewed } = useStore()
  const [activeTab, setActiveTab] = useState<TabKey>("silence")

  const misjudgments = useMemo(() => {
    const items: { resultId: string; segment: typeof results[number]["silenceSegments"][number] }[] = []
    for (const r of results) {
      for (const s of r.silenceSegments) {
        if (s.isMisjudgment) items.push({ resultId: r.id, segment: s })
      }
    }
    return items
  }, [results])

  const misalignments = useMemo(() => {
    const items: { resultId: string; alignment: typeof results[number]["lyricsAlignments"][number] }[] = []
    for (const r of results) {
      for (const l of r.lyricsAlignments) {
        if (l.isMisaligned) items.push({ resultId: r.id, alignment: l })
      }
    }
    return items
  }, [results])

  const overLongs = useMemo(() => {
    const items: { resultId: string; alignment: typeof results[number]["lyricsAlignments"][number] }[] = []
    for (const r of results) {
      for (const l of r.lyricsAlignments) {
        if (l.isOverLong) items.push({ resultId: r.id, alignment: l })
      }
    }
    return items
  }, [results])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">异常复核</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-navy-700/50 px-4 py-3">
          <VolumeX className="h-5 w-5 text-coral-500" />
          <div>
            <p className="text-xs text-navy-300">静音误判</p>
            <p className="text-lg font-bold text-coral-500">{misjudgments.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-navy-700/50 px-4 py-3">
          <AlignLeft className="h-5 w-5 text-coral-500" />
          <div>
            <p className="text-xs text-navy-300">歌词错位</p>
            <p className="text-lg font-bold text-coral-500">{misalignments.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-navy-700/50 px-4 py-3">
          <Clock className="h-5 w-5 text-coral-500" />
          <div>
            <p className="text-xs text-navy-300">长句超限</p>
            <p className="text-lg font-bold text-coral-500">{overLongs.length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-amber-500 text-navy-900"
                : "bg-navy-700/50 text-navy-300 hover:bg-navy-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "silence" && (
        misjudgments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-navy-300">
            <AlertTriangle className="mb-3 h-10 w-10" />
            <p>当前无异常数据</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {misjudgments.map(({ resultId, segment }) => (
              <div key={segment.id} className="flex flex-col gap-3 rounded-xl bg-navy-700/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VolumeX className="h-4 w-4 text-coral-500" />
                    <span className="font-mono text-sm text-slate-300">
                      {formatTime(segment.startTimestamp)} – {formatTime(segment.endTimestamp)}
                    </span>
                    <span className="font-mono text-xs text-navy-300">
                      时长 {segment.duration.toFixed(3)}s
                    </span>
                  </div>
                  <Link
                    to={`/trace/${resultId}`}
                    className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    查看追踪
                  </Link>
                </div>
                {segment.misjudgmentReason && (
                  <p className="text-sm text-slate-400">{segment.misjudgmentReason}</p>
                )}
                {segment.reviewed ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded bg-sage-500/20 px-2 py-0.5 text-xs font-medium text-sage-500">
                    <CheckCircle className="h-3 w-3" />
                    已复核
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => markSilenceMisjudgment(resultId, segment.id, true)}
                      className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-coral-600"
                    >
                      确认误判
                    </button>
                    <button
                      onClick={() => markSilenceMisjudgment(resultId, segment.id, false)}
                      className="rounded-lg bg-navy-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-navy-500"
                    >
                      保留
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "misaligned" && (
        misalignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-navy-300">
            <AlertTriangle className="mb-3 h-10 w-10" />
            <p>当前无异常数据</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {misalignments.map(({ resultId, alignment }) => (
              <div key={alignment.id} className="flex flex-col gap-3 rounded-xl bg-navy-700/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-coral-500" />
                    <span className="text-sm text-slate-300">{alignment.lyricsSegment}</span>
                  </div>
                  <Link
                    to={`/trace/${resultId}`}
                    className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    查看追踪
                  </Link>
                </div>
                <span className="font-mono text-xs text-navy-300">
                  {formatTime(alignment.startTimestamp)} – {formatTime(alignment.endTimestamp)}
                </span>
                {alignment.misalignmentDetail && (
                  <p className="text-sm text-slate-400">{alignment.misalignmentDetail}</p>
                )}
                {alignment.reviewed ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded bg-sage-500/20 px-2 py-0.5 text-xs font-medium text-sage-500">
                    <CheckCircle className="h-3 w-3" />
                    已复核
                  </span>
                ) : (
                  <button
                    onClick={() => markLyricsReviewed(resultId, alignment.id)}
                    className="w-fit rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-navy-900 transition-colors hover:bg-amber-400"
                  >
                    标记复核
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "overlong" && (
        overLongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-navy-300">
            <AlertTriangle className="mb-3 h-10 w-10" />
            <p>当前无异常数据</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {overLongs.map(({ resultId, alignment }) => {
              const duration = alignment.endTimestamp - alignment.startTimestamp
              const ratio = Math.min(duration / alignment.durationThreshold, 2)
              const normalRatio = Math.min(ratio, 1)
              const overRatio = ratio > 1 ? ratio - 1 : 0

              return (
                <div key={alignment.id} className="flex flex-col gap-3 rounded-xl bg-navy-700/50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-coral-500" />
                      <span className="text-sm text-slate-300">{alignment.lyricsSegment}</span>
                    </div>
                    <Link
                      to={`/trace/${resultId}`}
                      className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      查看追踪
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-coral-400">
                      {duration.toFixed(2)}s
                    </span>
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-navy-800">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${normalRatio * 50}%` }}
                      />
                      {overRatio > 0 && (
                        <div
                          className="h-full bg-coral-500"
                          style={{ width: `${overRatio * 50}%` }}
                        />
                      )}
                    </div>
                    <span className="text-xs text-navy-300">
                      阈值 {alignment.durationThreshold}s
                    </span>
                  </div>
                  {alignment.reviewed ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded bg-sage-500/20 px-2 py-0.5 text-xs font-medium text-sage-500">
                      <CheckCircle className="h-3 w-3" />
                      已复核
                    </span>
                  ) : (
                    <button
                      onClick={() => markLyricsReviewed(resultId, alignment.id)}
                      className="w-fit rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-navy-900 transition-colors hover:bg-amber-400"
                    >
                      标记复核
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
