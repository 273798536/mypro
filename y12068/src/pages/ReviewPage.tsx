import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileJson, FileSpreadsheet, AlertTriangle, Volume2, Clock } from 'lucide-react'
import { getLevelById } from '../data/levels'
import { useGameStore } from '../store/gameStore'
import { useState } from 'react'

export default function ReviewPage() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const level = levelId ? getLevelById(levelId) : undefined
  const { scoreReport } = useGameStore()
  const [showExport, setShowExport] = useState(false)

  if (!level || !scoreReport) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">暂无成绩数据</p>
          <button
            onClick={() => navigate('/')}
            className="text-accent hover:underline"
          >
            返回关卡选择
          </button>
        </div>
      </div>
    )
  }

  const { summary, judgments, criteria } = scoreReport
  const accuracy = summary.totalNotes > 0
    ? Math.round((summary.perfectCount / summary.totalNotes) * 100)
    : 0

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(scoreReport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rhythm-defense-${level.id}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const headers = ['声部', '拍位', '判定', '偏差ms', '音量', '延迟进入', '休止误判', '音量失衡']
    const rows = judgments.map((j) => [
      j.partTrackName,
      `第${j.tick + 1}拍(${j.beatLabel})`,
      j.judgment,
      j.offsetMs.toFixed(0),
      j.volume,
      j.isDelayedEntry ? '是' : '否',
      j.isRestViolation ? '是' : '否',
      j.isVolumeImbalance ? '是' : '否',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rhythm-defense-${level.id}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const judgmentColor: Record<string, string> = {
    perfect: 'bg-perfect/20 text-perfect',
    early: 'bg-early/20 text-early',
    late: 'bg-late/20 text-late',
    miss: 'bg-miss/20 text-miss',
  }

  const judgmentLabel: Record<string, string> = {
    perfect: '精准',
    early: '偏早',
    late: '偏晚',
    miss: '遗漏',
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-surfaceLight/30 px-8 py-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-700 text-white">成绩复盘</h1>
              <p className="text-xs text-gray-500">{level.name} · {scoreReport.timestamp}</p>
            </div>
          </div>

          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 bg-accent/20 text-accent px-5 py-2.5 rounded-lg 
              font-600 hover:bg-accent/30 transition-all hover:shadow-[0_0_20px_rgba(0,245,212,0.3)]"
          >
            <Download className="w-4 h-4" />
            导出成绩单
          </button>
        </div>
      </header>

      {showExport && (
        <div className="border-b border-surfaceLight/30 px-8 py-4 bg-surface/50">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 bg-surfaceLight/30 text-gray-300 px-4 py-2 rounded-lg 
                hover:bg-surfaceLight/50 transition-all"
            >
              <FileJson className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-surfaceLight/30 text-gray-300 px-4 py-2 rounded-lg 
                hover:bg-surfaceLight/50 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              导出 CSV
            </button>
            <span className="text-xs text-gray-500">导出文件含判定口径说明，可直接转交同事</span>
          </div>
        </div>
      )}

      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-surface rounded-xl p-5 border border-surfaceLight/30">
              <div className="text-xs text-gray-500 mb-1">总准确率</div>
              <div className="font-display text-3xl font-800 text-accent">{accuracy}%</div>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-perfect/20">
              <div className="text-xs text-perfect/70 mb-1">精准</div>
              <div className="font-display text-3xl font-800 text-perfect">{summary.perfectCount}</div>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-early/20">
              <div className="text-xs text-early/70 mb-1">偏早</div>
              <div className="font-display text-3xl font-800 text-early">{summary.earlyCount}</div>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-late/20">
              <div className="text-xs text-late/70 mb-1">偏晚</div>
              <div className="font-display text-3xl font-800 text-late">{summary.lateCount}</div>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-miss/20">
              <div className="text-xs text-miss/70 mb-1">遗漏</div>
              <div className="font-display text-3xl font-800 text-miss">{summary.missCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-5 border border-warning/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-600 text-warning">延迟进入</span>
              </div>
              <div className="font-display text-2xl font-800 text-warning">{summary.delayedEntryCount}</div>
              <p className="text-xs text-gray-500 mt-1">声部未在规定窗口内进入</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-rest/30">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-rest" />
                <span className="text-sm font-600 text-rest">休止误判</span>
              </div>
              <div className="font-display text-2xl font-800 text-rest">{summary.restViolationCount}</div>
              <p className="text-xs text-gray-500 mt-1">休止区间检测到发声</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-rest/30">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-rest" />
                <span className="text-sm font-600 text-rest">音量失衡</span>
              </div>
              <div className="font-display text-2xl font-800 text-rest">{summary.volumeImbalanceCount}</div>
              <p className="text-xs text-gray-500 mt-1">声部音量与均值偏差 &gt;{criteria.volumeImbalanceThreshold}%</p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl font-700 text-gray-200 mb-4">判定明细</h2>
            <div className="bg-surface rounded-xl border border-surfaceLight/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surfaceLight/30">
                      <th className="text-left px-4 py-3 text-gray-500 font-500">声部</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-500">拍位</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-500">判定</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-500">偏差</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-500">音量</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-500">标记</th>
                    </tr>
                  </thead>
                  <tbody>
                    {judgments.map((j, i) => {
                      const track = level.partTracks.find((t) => t.id === j.partTrackId)
                      const hasFlag = j.isDelayedEntry || j.isRestViolation || j.isVolumeImbalance

                      return (
                        <tr
                          key={i}
                          className={`border-b border-surfaceLight/10 ${hasFlag ? 'bg-warning/5' : ''}`}
                        >
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: track?.color }}
                              />
                              {j.partTrackName}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-300">
                            第{j.tick + 1}拍 ({j.beatLabel})
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-600 ${judgmentColor[j.judgment]}`}>
                              {judgmentLabel[j.judgment]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">
                            {j.offsetMs > 0 ? '+' : ''}{j.offsetMs.toFixed(0)}ms
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{j.volume}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {j.isDelayedEntry && (
                                <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                                  延迟进入
                                </span>
                              )}
                              {j.isRestViolation && (
                                <span className="text-xs bg-rest/20 text-rest px-1.5 py-0.5 rounded">
                                  休止误判
                                </span>
                              )}
                              {j.isVolumeImbalance && (
                                <span className="text-xs bg-rest/20 text-rest px-1.5 py-0.5 rounded">
                                  音量失衡
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-6 border border-surfaceLight/30">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-accent" />
              <h2 className="font-display text-lg font-600 text-gray-200">判定口径说明</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              以下为本次训练使用的节奏判定标准，导出的成绩单中将附带此口径，接收方无需再回问判定口径。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-perfect font-600 mb-1">精准窗口</div>
                <div className="text-gray-300">偏差 ≤ ±{criteria.perfectWindowMs}ms</div>
              </div>
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-early font-600 mb-1">偏早窗口</div>
                <div className="text-gray-300">-{criteria.perfectWindowMs} ~ -{criteria.earlyWindowMs}ms</div>
              </div>
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-late font-600 mb-1">偏晚窗口</div>
                <div className="text-gray-300">+{criteria.perfectWindowMs} ~ +{criteria.lateWindowMs}ms</div>
              </div>
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-miss font-600 mb-1">遗漏阈值</div>
                <div className="text-gray-300">偏差 &gt; {criteria.earlyWindowMs}ms</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-warning font-600 mb-1">延迟进入</div>
                <div className="text-gray-300">进入时刻偏差 &gt; {criteria.lateWindowMs}ms</div>
              </div>
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-rest font-600 mb-1">音量失衡阈值</div>
                <div className="text-gray-300">偏差 &gt; {criteria.volumeImbalanceThreshold}%</div>
              </div>
              <div className="bg-surfaceLight/20 rounded-lg p-3">
                <div className="text-rest font-600 mb-1">休止误判阈值</div>
                <div className="text-gray-300">休止区音量 &gt; {criteria.restVolumeThreshold}%</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
