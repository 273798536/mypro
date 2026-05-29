import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { FAIL_REASON_LABELS, FAIL_REASON_COLORS, minutesToTime, type FailReason } from '@/types'

const FAIL_TYPES: FailReason[] = ['tide_missed', 'tug_conflict', 'fuel_shortage', 'berth_occupied']

export default function Report() {
  const navigate = useNavigate()
  const getScores = useGameStore(s => s.getScores)
  const getFailuresByType = useGameStore(s => s.getFailuresByType)
  const ships = useGameStore(s => s.ships)
  const dispatches = useGameStore(s => s.dispatches)
  const resetGame = useGameStore(s => s.resetGame)

  const scores = getScores()
  const failuresByType = getFailuresByType()
  const completedCount = ships.filter(s => s.status === 'completed').length
  const failedCount = ships.filter(s => s.status === 'failed').length
  const totalFailures = Object.values(failuresByType).flat().length

  const handleRestart = () => {
    resetGame()
    navigate('/')
  }

  const radarSize = 200
  const radarCenter = radarSize / 2
  const radarRadius = 75
  const axes = [
    { label: '潮汐管理', value: scores.tideManagement },
    { label: '拖轮利用率', value: scores.tugUtilization },
    { label: '燃油管理', value: scores.fuelManagement },
    { label: '泊位周转', value: scores.berthTurnover },
  ]
  const radarPoints = axes.map((a, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2
    const r = (a.value / 100) * radarRadius
    return `${radarCenter + r * Math.cos(angle)},${radarCenter + r * Math.sin(angle)}`
  }).join(' ')

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <header className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 text-xl">
            ⚓
          </div>
          <div>
            <h1 className="text-2xl font-bold">调度报告</h1>
            <p className="text-sm text-slate-400">港口拖轮潮汐战 · 本轮复盘</p>
          </div>
        </div>
        <button
          onClick={handleRestart}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-black transition hover:bg-amber-400"
        >
          重新开始
        </button>
      </header>

      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard label="完成船舶" value={`${completedCount}/${ships.length}`} color="text-green-400" />
          <SummaryCard label="失败船舶" value={`${failedCount}`} color="text-red-400" />
          <SummaryCard label="总调度次数" value={`${dispatches.length}`} color="text-cyan-400" />
          <SummaryCard label="失败事件" value={`${totalFailures}`} color="text-amber-400" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-700/50 bg-[#0E1A2E] p-6">
            <h2 className="mb-4 text-lg font-bold">维度评分</h2>
            <div className="flex items-center justify-center">
              <svg width={radarSize} height={radarSize} className="overflow-visible">
                {[0.25, 0.5, 0.75, 1].map(scale => (
                  <polygon
                    key={scale}
                    points={axes.map((_, i) => {
                      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2
                      const r = radarRadius * scale
                      return `${radarCenter + r * Math.cos(angle)},${radarCenter + r * Math.sin(angle)}`
                    }).join(' ')}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                ))}
                {axes.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2
                  return (
                    <line
                      key={i}
                      x1={radarCenter}
                      y1={radarCenter}
                      x2={radarCenter + radarRadius * Math.cos(angle)}
                      y2={radarCenter + radarRadius * Math.sin(angle)}
                      stroke="#334155"
                      strokeWidth="1"
                    />
                  )
                })}
                <polygon
                  points={radarPoints}
                  fill="rgba(245, 158, 11, 0.2)"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                {axes.map((a, i) => {
                  const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2
                  const r = (a.value / 100) * radarRadius
                  return (
                    <circle
                      key={i}
                      cx={radarCenter + r * Math.cos(angle)}
                      cy={radarCenter + r * Math.sin(angle)}
                      r="3"
                      fill="#F59E0B"
                    />
                  )
                })}
                {axes.map((a, i) => {
                  const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2
                  const labelR = radarRadius + 20
                  return (
                    <text
                      key={i}
                      x={radarCenter + labelR * Math.cos(angle)}
                      y={radarCenter + labelR * Math.sin(angle)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#94A3B8"
                      fontSize="11"
                    >
                      {a.label} {a.value}
                    </text>
                  )
                })}
              </svg>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {axes.map(a => (
                <div key={a.label} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-sm text-slate-400">{a.label}</span>
                  <span className="font-mono text-lg font-bold text-amber-400">{a.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-[#0E1A2E] p-6">
            <h2 className="mb-4 text-lg font-bold">船舶调度明细</h2>
            <div className="space-y-2">
              {ships.map(ship => {
                const disp = dispatches.find(d => d.shipId === ship.id)
                return (
                  <div key={ship.id} className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${ship.status === 'completed' ? 'bg-green-400' : ship.status === 'failed' ? 'bg-red-400' : 'bg-slate-500'}`} />
                      <span className="text-sm">{ship.name}</span>
                      <span className="text-xs text-slate-500">{ship.tonnage / 10000}万吨</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">
                        {minutesToTime(ship.tideWindowStart)}-{minutesToTime(ship.tideWindowEnd)}
                      </span>
                      {ship.status === 'completed' && <span className="text-green-400">✓ 完成</span>}
                      {ship.status === 'failed' && <span className="text-red-400">✗ 失败</span>}
                      {ship.status === 'dispatched' && <span className="text-cyan-400">作业中</span>}
                      {ship.status === 'waiting' && <span className="text-slate-500">未到达</span>}
                      {ship.status === 'arrived' && <span className="text-blue-400">未调度</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-[#0E1A2E] p-6">
          <h2 className="mb-4 text-lg font-bold">失败原因分类</h2>
          <div className="grid grid-cols-4 gap-4">
            {FAIL_TYPES.map(type => {
              const items = failuresByType[type]
              return (
                <div key={type} className="rounded-lg border border-slate-700/30 bg-slate-800/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: FAIL_REASON_COLORS[type] }} />
                    <span className="text-sm font-semibold">{FAIL_REASON_LABELS[type]}</span>
                    <span className="ml-auto rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">无此类失败</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <div key={item.id} className="rounded bg-slate-900/50 px-2 py-1.5 text-xs">
                          <div className="text-slate-300">{item.shipName}</div>
                          <div className="text-slate-500 font-mono">{minutesToTime(item.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#0E1A2E] p-4 text-center">
      <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  )
}
