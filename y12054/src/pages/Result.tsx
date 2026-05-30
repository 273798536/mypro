import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import ScoreDetail from '@/components/ScoreDetail'
import TrackTimeline from '@/components/TrackTimeline'
import VolumeAnalysis from '@/components/VolumeAnalysis'

const TABS = [
  { key: 'score', label: '扣分明细' },
  { key: 'track', label: '声部轨道' },
  { key: 'volume', label: '音量分析' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function Result() {
  const { sceneId } = useParams<{ sceneId: string }>()
  const navigate = useNavigate()
  const getGameResult = useGameStore((s) => s.getGameResult)
  const musicians = useGameStore((s) => s.musicians)
  const result = getGameResult()
  const [activeTab, setActiveTab] = useState<TabKey>('score')

  const hasData = result && result.deductions !== undefined && result.totalScore !== undefined

  if (!hasData) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center gap-6">
        <div className="text-gray-400 text-lg">无排练数据</div>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg px-6 py-2 font-display text-sm bg-[#1a1a2e] border border-[#00ff88]/30 text-[#00ff88] hover:shadow-[0_0_10px_#00ff88] transition-all duration-200"
        >
          返回选择
        </button>
      </div>
    )
  }

  function buildTrackConclusion() {
    return result.trackSnapshots.length > 0
      ? result.trackSnapshots
          .reduce<
            Array<{
              musicianId: string
              enterBeats: number[]
              exitBeats: number[]
              volumes: number[]
              maxVolume: number
              avgVolume: number
              issues: number
            }>
          >((acc, snap) => {
            let entry = acc.find((a) => a.musicianId === snap.musicianId)
            if (!entry) {
              entry = { musicianId: snap.musicianId, enterBeats: [], exitBeats: [], volumes: [], maxVolume: 0, avgVolume: 0, issues: 0 }
              acc.push(entry)
            }
            if (snap.isPlaying) {
              entry.volumes.push(snap.volume)
              if (entry.volumes.length === 1 || !result.trackSnapshots.find(
                (s) => s.musicianId === snap.musicianId && s.beat === snap.beat - 1 && s.isPlaying
              )) {
                entry.enterBeats.push(snap.beat)
              }
            } else {
              const prevSnap = result.trackSnapshots.find(
                (s) => s.musicianId === snap.musicianId && s.beat === snap.beat - 1 && s.isPlaying
              )
              if (prevSnap) {
                entry.exitBeats.push(snap.beat)
              }
            }
            entry.issues = result.deductions.filter((d) => d.affectedMusicianId === snap.musicianId).length
            return acc
          }, [])
          .map((entry) => {
            entry.maxVolume = entry.volumes.length > 0 ? Math.max(...entry.volumes) : 0
            entry.avgVolume = entry.volumes.length > 0 ? Math.round(entry.volumes.reduce((a, b) => a + b, 0) / entry.volumes.length) : 0
            return entry
          })
      : []
  }

  function handleDownload() {
    const trackConclusion = buildTrackConclusion()
    const musiciansMap = new Map(musicians.map((m) => [m.id, m]))
    const trackConclusionSummary = trackConclusion.map((t) => {
      const m = musiciansMap.get(t.musicianId)
      return {
        musicianName: m?.name ?? t.musicianId,
        role: m?.role ?? 'unknown',
        enterBeats: t.enterBeats,
        exitBeats: t.exitBeats,
        avgVolume: t.avgVolume,
        maxVolume: t.maxVolume,
        issues: t.issues,
        conclusion: t.enterBeats.length === 0
          ? '该乐手未进入演奏'
          : t.issues > 0
            ? `存在 ${t.issues} 个问题，建议调整进入时机或音量`
            : '演奏状态正常',
      }
    })
    const report = {
      sceneId: result.sceneId,
      sceneName: result.sceneName,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      deductions: result.deductions,
      categorySummary: result.categorySummary,
      trackConclusion,
      trackConclusionSummary,
    }
    console.log('=== 排练报告 - 声部轨道结论 ===')
    console.log(`场景: ${result.sceneName}`)
    console.log(`总分: ${result.totalScore}/${result.maxScore}`)
    console.log('声部轨道结论:')
    trackConclusionSummary.forEach((t) => {
      console.log(`  ${t.musicianName} (${t.role}): 进入=${t.enterBeats.join(',') || '无'}, 平均音量=${t.avgVolume}%, 最大音量=${t.maxVolume}%, 问题数=${t.issues} → ${t.conclusion}`)
    })
    console.log('================================')
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `排练报告_${result.sceneName}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-white tracking-wider">排练复盘</h1>
          <p className="text-gray-400 text-sm mt-2">{result.sceneName}</p>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 font-display text-sm transition-all duration-200"
              style={{
                color: activeTab === tab.key ? '#00ff88' : '#888',
                borderBottom: activeTab === tab.key ? '2px solid #00ff88' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          {activeTab === 'score' && (
            <ScoreDetail
              deductions={result.deductions}
              categorySummary={result.categorySummary}
              totalScore={result.totalScore}
              maxScore={result.maxScore}
            />
          )}
          {activeTab === 'track' && (
            <TrackTimeline
              snapshots={result.trackSnapshots}
              musicians={musicians.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
              totalBeats={useGameStore.getState().totalBeats}
            />
          )}
          {activeTab === 'volume' && (
            <VolumeAnalysis
              deductions={result.deductions}
              musicians={musicians.map((m) => ({ id: m.id, name: m.name, color: m.color, volume: m.volume }))}
              snapshots={result.trackSnapshots}
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg px-5 py-2 font-display text-sm bg-[#1a1a2e] border border-white/10 text-gray-300 hover:border-white/30 transition-all duration-200"
            >
              返回选择
            </button>
            <button
              onClick={() => navigate(`/rehearsal/${sceneId}`)}
              className="rounded-lg px-5 py-2 font-display text-sm bg-[#1a1a2e] border border-[#00ff88]/30 text-[#00ff88] hover:shadow-[0_0_10px_#00ff88] transition-all duration-200"
            >
              重新排练
            </button>
          </div>
          <button
            onClick={handleDownload}
            className="rounded-lg px-5 py-2 font-display text-sm bg-[#1a1a2e] border border-[#00bbff]/30 text-[#00bbff] hover:shadow-[0_0_10px_#00bbff] transition-all duration-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            下载报告
          </button>
        </div>
      </div>
    </div>
  )
}
