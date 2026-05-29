import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowLeft, GitCompare } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import RiverCanvas from '@/components/RiverCanvas'
import RainfallCards from '@/components/RainfallCards'

export default function Replay() {
  const navigate = useNavigate()
  const scenario = useGameStore((s) => s.scenario)
  const decisions = useGameStore((s) => s.decisions)
  const results = useGameStore((s) => s.results)
  const replayRound = useGameStore((s) => s.replayRound)
  const setReplayRound = useGameStore((s) => s.setReplayRound)

  useEffect(() => {
    if (!scenario) navigate('/')
  }, [scenario, navigate])

  if (!scenario) return null

  const totalRounds = scenario.totalRounds
  const round = replayRound || 1
  const result = results[round - 1]
  const decision = decisions[round - 1]

  const go = (r: number) => setReplayRound(Math.max(1, Math.min(totalRounds, r)))

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center gap-4 border-b border-slate-700 px-6 py-4">
        <button onClick={() => navigate('/result')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-serif-sc text-xl font-bold">复盘回放</h1>
        <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-white">
          首页
        </button>
      </header>

      <div className="flex items-center justify-center gap-2 px-4 py-4">
        <button onClick={() => go(round - 1)} disabled={round <= 1} className="text-slate-400 hover:text-white disabled:opacity-30">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
            <button
              key={r}
              onClick={() => go(r)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                r === round
                  ? 'ring-2 ring-blue-400 bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button onClick={() => go(round + 1)} disabled={round >= totalRounds} className="text-slate-400 hover:text-white disabled:opacity-30">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {result && decision && (
        <div className="flex flex-1 gap-4 px-6 pb-4">
          <div className="flex-1 min-w-0">
            <div className="h-64 rounded-lg border border-slate-700 bg-slate-800 sm:h-80">
              <RiverCanvas
                upstreamLevel={result.upstreamLevel}
                reservoirCapacity={scenario.initialState.reservoirCapacity}
                gateOpenPercent={decision.gateOpenPercent}
                downstreamFlow={result.downstreamFlow}
                downstreamSafeThreshold={scenario.initialState.downstreamSafeThreshold}
              />
            </div>
          </div>
          <div className="flex w-72 flex-col gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">降雨卡牌</h3>
              <RainfallCards cards={scenario.rainfallCards} currentRound={round} />
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">决策</h3>
              <div className="space-y-1 text-sm">
                <p>闸门开度: <span className="font-bold text-blue-300">{decision.gateOpenPercent}%</span></p>
                <p>预警发布: <span className={decision.warningIssued ? 'font-bold text-amber-300' : 'text-slate-500'}>{decision.warningIssued ? '是' : '否'}</span></p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">结果</h3>
              <div className="space-y-1 text-sm">
                <p>上游水位: <span className="font-bold">{result.upstreamLevel.toFixed(1)}</span></p>
                <p>下游流量: <span className="font-bold">{Math.round(result.downstreamFlow)}</span></p>
                <p>上游风险: <span className={result.upstreamRisk > 60 ? 'text-red-400' : 'text-green-400'}>{Math.round(result.upstreamRisk)}%</span></p>
                <p>下游风险: <span className={result.downstreamRisk > 60 ? 'text-red-400' : 'text-green-400'}>{Math.round(result.downstreamRisk)}%</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 px-6 py-4">
        <h2 className="mb-3 flex items-center gap-2 font-serif-sc text-base font-bold">
          <GitCompare className="h-4 w-4" /> 决策对比
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-2 pr-4">轮次</th>
              <th className="pb-2 pr-4">你的闸门</th>
              <th className="pb-2 pr-4">推荐闸门</th>
              <th className="pb-2 pr-4">你的预警</th>
              <th className="pb-2">推荐预警</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d, i) => {
              const rec = scenario.recommendedDecisions[i]
              const gateDiff = rec && d.gateOpenPercent !== rec.gateOpenPercent
              const warnDiff = rec && d.warningIssued !== rec.warningIssued
              return (
                <tr key={d.round} className={i % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800'}>
                  <td className={`py-1.5 pr-4 ${d.round === round ? 'font-bold text-blue-400' : ''}`}>{d.round}</td>
                  <td className={`py-1.5 pr-4 ${gateDiff ? 'text-amber-400' : ''}`}>{d.gateOpenPercent}%</td>
                  <td className="py-1.5 pr-4 text-slate-400">{rec?.gateOpenPercent ?? '-'}%</td>
                  <td className={`py-1.5 pr-4 ${warnDiff ? 'text-red-400' : ''}`}>{d.warningIssued ? '是' : '否'}</td>
                  <td className="py-1.5 text-slate-400">{rec ? (rec.warningIssued ? '是' : '否') : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
