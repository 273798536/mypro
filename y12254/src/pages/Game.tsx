import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LEVELS } from '@/utils/levels'
import { useGameStore } from '@/store/gameStore'
import CustomerCardItem from '@/components/CustomerCardItem'
import WindowPanelItem from '@/components/WindowPanelItem'
import EventLog from '@/components/EventLog'
import FailureAlert from '@/components/FailureAlert'
import TimeControl from '@/components/TimeControl'
import WindowConfigPanel from '@/components/WindowConfigPanel'
import { generateReport, getWindowConclusion } from '@/utils/report'
import { ArrowLeft, BarChart3 } from 'lucide-react'

export default function Game() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const [logOpen, setLogOpen] = useState(false)

  const {
    phase, speed, sim, levelConfig, failureAlert, currentMetrics,
    selectLevel, startSimulation, pauseSimulation, resumeSimulation,
    resetSimulation, setSpeed, stepOnce, doEnableWindow, doAddWindow,
  } = useGameStore()

  useEffect(() => {
    const level = LEVELS.find(l => l.id === levelId)
    if (level) {
      selectLevel(level)
    }
  }, [levelId, selectLevel])

  if (!sim || !levelConfig) {
    return (
      <div className="min-h-screen bg-milk-50 flex items-center justify-center">
        <div className="text-milk-400">加载中...</div>
      </div>
    )
  }

  const queueCustomers = sim.queue
    .map(id => sim.customers.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  const completedCount = currentMetrics.completed
  const noShowCount = currentMetrics.noShow

  const handleGoReview = () => {
    const sessionId = `session_${Date.now()}`
    const latestMetrics = sim.snapshots.length > 0
      ? sim.snapshots[sim.snapshots.length - 1].metrics
      : { avgWaitTime: 0, maxWaitTime: 0, utilizationRate: [], overallUtilization: 0, noShowCount: 0, completedCount: 0, abandonedCount: 0, queueLength: 0 }
    const report = generateReport(
      sessionId,
      levelConfig.id,
      sim.windowConfig,
      sim.configHistory,
      latestMetrics,
      sim.events,
      sim.customers
    )
    sessionStorage.setItem(`review_${sessionId}`, JSON.stringify(report))
    navigate(`/review/${sessionId}`)
  }

  const windowConclusion = phase === 'completed' ? getWindowConclusion(
    generateReport('', levelConfig.id, sim.windowConfig, sim.configHistory,
      sim.snapshots.length > 0 ? sim.snapshots[sim.snapshots.length - 1].metrics : { avgWaitTime: 0, maxWaitTime: 0, utilizationRate: [], overallUtilization: 0, noShowCount: 0, completedCount: 0, abandonedCount: 0, queueLength: 0 },
      sim.events, sim.customers
    )
  ) : ''

  return (
    <div className="min-h-screen bg-milk-50 flex flex-col">
      <header className="bg-gradient-to-r from-milk-700 via-milk-600 to-milk-400 text-white py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-lg">{levelConfig.name}</h1>
              <span className="text-xs text-milk-200">{levelConfig.model} · λ={levelConfig.arrivalRate} μ={levelConfig.serviceRate} c={levelConfig.initialWindowCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-white/20 px-2 py-0.5 rounded-full">完成: {completedCount}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full">爽约: {noShowCount}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full">队列: {currentMetrics.queueLen}</span>
            {phase === 'completed' && (
              <button
                onClick={handleGoReview}
                className="bg-white text-milk-700 px-3 py-1 rounded-full font-medium flex items-center gap-1 hover:bg-milk-50 transition-all"
              >
                <BarChart3 size={14} /> 查看复盘
              </button>
            )}
          </div>
        </div>
      </header>

      {phase === 'completed' && windowConclusion && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700">
          ✅ {windowConclusion}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-milk-200 bg-white/50 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-milk-100">
            <h3 className="font-bold text-milk-700 text-sm">🧋 等待队列 ({queueCustomers.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {queueCustomers.length === 0 && (
              <div className="text-xs text-milk-300 italic text-center py-4">暂无等待顾客</div>
            )}
            {queueCustomers.map(c => (
              <CustomerCardItem key={c.id} customer={c} currentTick={sim.tick} />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {sim.windows.map(w => (
                  <WindowPanelItem
                    key={w.id}
                    window={w}
                    customers={sim.customers}
                    onEnable={doEnableWindow}
                  />
                ))}
              </div>

              {phase === 'failed' && !failureAlert && (
                <div className="mt-4 card border-window-disabled bg-window-disabled/5">
                  <p className="text-window-disabled font-bold">模拟失败</p>
                  <p className="text-sm text-milk-600 mt-1">{sim.failureReason}</p>
                </div>
              )}
            </div>

            <div className="w-56 border-l border-milk-200 bg-white/30 overflow-y-auto p-3 space-y-3 shrink-0">
              <WindowConfigPanel
                windowConfig={sim.windowConfig}
                windows={sim.windows}
                onAddWindow={doAddWindow}
              />

              <div className="card">
                <h3 className="font-bold text-milk-700 text-sm mb-2">📈 实时指标</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-milk-500">
                    <span>平均等待</span>
                    <span className="font-mono text-milk-700">{currentMetrics.avgWait}</span>
                  </div>
                  <div className="flex justify-between text-milk-500">
                    <span>最大等待</span>
                    <span className="font-mono text-milk-700">{currentMetrics.maxWait}</span>
                  </div>
                  <div className="flex justify-between text-milk-500">
                    <span>队列长度</span>
                    <span className="font-mono text-milk-700">{currentMetrics.queueLen}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setLogOpen(!logOpen)}
                className="btn-secondary w-full text-xs"
              >
                {logOpen ? '隐藏日志' : '📋 事件日志'}
              </button>

              {logOpen && (
                <EventLog events={sim.events} maxVisible={30} />
              )}
            </div>
          </div>

          <TimeControl
            phase={phase}
            speed={speed}
            tick={sim.tick}
            onStart={startSimulation}
            onPause={pauseSimulation}
            onResume={resumeSimulation}
            onReset={resetSimulation}
            onStep={stepOnce}
            onSpeedChange={setSpeed}
          />
        </div>
      </div>

      {failureAlert && (
        <FailureAlert
          alert={failureAlert}
          onDismiss={() => useGameStore.setState({ failureAlert: null })}
        />
      )}
    </div>
  )
}
