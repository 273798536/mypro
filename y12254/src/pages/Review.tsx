import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import type { ReviewReport, SimulationSnapshot } from '@/types'
import ReplayPlayer from '@/components/ReplayPlayer'
import WaitDistribution from '@/components/WaitDistribution'
import CorrelationTable from '@/components/CorrelationTable'
import { downloadJSON, downloadCSV, getWindowConclusion } from '@/utils/report'
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from 'lucide-react'

export default function Review() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReviewReport | null>(null)
  const [replayTick, setReplayTick] = useState(0)
  const [replaySnapshot, setReplaySnapshot] = useState<SimulationSnapshot | null>(null)

  useEffect(() => {
    if (!sessionId) return
    const stored = sessionStorage.getItem(`review_${sessionId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ReviewReport
        setReport(parsed)
        if (parsed.events.length > 0) {
          setReplayTick(0)
        }
      } catch {
        navigate('/')
      }
    } else {
      navigate('/')
    }
  }, [sessionId, navigate])

  const handleSeek = useCallback((tick: number) => {
    setReplayTick(tick)
    if (!report) return
    const snapIdx = Math.min(tick, report.events.length > 0 ? report.events[report.events.length - 1].tick : 0)
    const relevantEvents = report.events.filter(e => e.tick <= snapIdx)
    if (relevantEvents.length > 0) {
      setReplaySnapshot({
        tick: snapIdx,
        queue: [],
        windows: [],
        events: relevantEvents.filter(e => e.tick === snapIdx),
        metrics: report.metrics,
      })
    }
  }, [report])

  if (!report) {
    return (
      <div className="min-h-screen bg-milk-50 flex items-center justify-center">
        <div className="text-milk-400">加载复盘数据...</div>
      </div>
    )
  }

  const conclusion = getWindowConclusion(report)

  const configHistoryRows = report.configHistory.length > 0 ? report.configHistory : [
    { tick: 0, config: report.windowConfig }
  ]

  return (
    <div className="min-h-screen bg-milk-50">
      <header className="bg-gradient-to-r from-milk-700 via-milk-600 to-milk-400 text-white py-3 px-4">
        <div className="flex items-center justify-between container mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-lg">📊 复盘报告</h1>
              <span className="text-xs text-milk-200">{report.levelId} · 会话 {report.sessionId}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadJSON(report)}
              className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1 hover:bg-white/30 transition-all"
            >
              <FileJson size={14} /> JSON
            </button>
            <button
              onClick={() => downloadCSV(report)}
              className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1 hover:bg-white/30 transition-all"
            >
              <FileSpreadsheet size={14} /> CSV
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Download size={16} className="text-green-600" />
            <h3 className="font-bold text-green-700 text-sm">窗口结论（与导出文件一致）</h3>
          </div>
          <p className="text-sm text-green-700">{conclusion}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ReplayPlayer
              snapshots={[]}
              onSeek={handleSeek}
            />
            {replaySnapshot && (
              <div className="card mt-3">
                <h4 className="font-bold text-milk-700 text-xs mb-2">T={replayTick} 事件</h4>
                {replaySnapshot.events.length === 0 ? (
                  <div className="text-xs text-milk-400 italic">该时刻无事件</div>
                ) : (
                  replaySnapshot.events.map((e, i) => (
                    <div key={i} className="text-xs text-milk-600 py-0.5">
                      <span className="font-mono text-milk-400">T{e.tick}</span>{' '}
                      {e.detail}
                      <span className="text-milk-300 ml-1">[{e.triggerSource}]</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <WaitDistribution distribution={report.waitTimeDistribution} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-milk-700 text-sm mb-3">⚙️ 窗口配置变化</h3>
            <div className="space-y-2 text-xs max-h-[200px] overflow-y-auto">
              {configHistoryRows.map((ch, i) => (
                <div key={i} className="flex items-center gap-2 py-1 border-b border-milk-100 last:border-0">
                  <span className="font-mono text-milk-400 shrink-0">T{ch.tick}</span>
                  <span className="text-milk-600">
                    窗口 {ch.config.windowCount} 个
                    {ch.config.disabledWindows.length > 0 && (
                      <span className="text-window-disabled ml-1">
                        (停用: {ch.config.disabledWindows.map(w => w + 1).join(',')})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-milk-700 text-sm mb-3">📈 统计摘要</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-milk-50 rounded-lg p-2">
                <div className="text-milk-400">平均等待</div>
                <div className="font-bold text-milk-700 text-lg">{report.metrics.avgWaitTime}</div>
              </div>
              <div className="bg-milk-50 rounded-lg p-2">
                <div className="text-milk-400">最大等待</div>
                <div className="font-bold text-milk-700 text-lg">{report.metrics.maxWaitTime}</div>
              </div>
              <div className="bg-milk-50 rounded-lg p-2">
                <div className="text-milk-400">完成数</div>
                <div className="font-bold text-window-idle text-lg">{report.metrics.completedCount}</div>
              </div>
              <div className="bg-milk-50 rounded-lg p-2">
                <div className="text-milk-400">爽约数</div>
                <div className="font-bold text-window-disabled text-lg">{report.metrics.noShowCount}</div>
              </div>
              <div className="bg-milk-50 rounded-lg p-2">
                <div className="text-milk-400">放弃数</div>
                <div className="font-bold text-gray-500 text-lg">{report.metrics.abandonedCount}</div>
              </div>
              <div className="bg-milk-50 rounded-lg p-2">
                <div className="text-milk-400">顾客总数</div>
                <div className="font-bold text-milk-700 text-lg">{report.customerCards.length}</div>
              </div>
            </div>
          </div>
        </div>

        <CorrelationTable
          chain={report.correlationChain}
          onJumpToCustomer={(cid) => {
            const entry = report.correlationChain.find(e => e.customerId === cid)
            if (entry) {
              setReplayTick(entry.arrivalTime)
              handleSeek(entry.arrivalTime)
            }
          }}
        />
      </main>
    </div>
  )
}
