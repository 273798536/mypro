import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pause, RotateCcw, Play, AlertTriangle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import Dashboard from '@/components/Dashboard'
import ProjectCard from '@/components/ProjectCard'
import BudgetAllocator from '@/components/BudgetAllocator'
import EvidenceLog from '@/components/EvidenceLog'
import { calculateInterest, calculateComprehensiveRate } from '@/engine/calculations'

export default function Game() {
  const {
    treasury, debt, satisfaction, comprehensiveRate, config,
    totalInfraInvestment, status, currentTurn, currentProjects,
    infraInvestment, interestPayment, welfareSpending,
    acceptedProjectIds, evidenceLog, turns,
  } = useGameStore()

  const setBudget = useGameStore(s => s.setBudget)
  const toggleProject = useGameStore(s => s.toggleProject)
  const confirmTurn = useGameStore(s => s.confirmTurn)
  const pauseGame = useGameStore(s => s.pauseGame)
  const resumeGame = useGameStore(s => s.resumeGame)
  const restartGame = useGameStore(s => s.restartGame)
  const goToSettlement = useGameStore(s => s.goToSettlement)
  const navigate = useNavigate()

  const isPlaying = status === 'playing'
  const isPaused = status === 'paused'
  const isEnded = status === 'ended'

  const totalSpending = infraInvestment + interestPayment + welfareSpending
  const canConfirm = isPlaying && totalSpending <= treasury && totalSpending >= 0

  const handleConfirm = () => {
    confirmTurn()
    const state = useGameStore.getState()
    if (state.status === 'ended') {
      state.goToSettlement()
      navigate('/settlement')
    }
  }

  const handleRestart = () => {
    restartGame()
    navigate('/')
  }

  const interestAccrued = calculateInterest(debt, comprehensiveRate)
  const minPayment = interestAccrued * 0.5
  const isUnderpaying = interestPayment < minPayment && interestPayment > 0

  const acceptedProjectCost = currentProjects
    .filter(p => acceptedProjectIds.includes(p.id))
    .reduce((s, p) => s + p.cost, 0)

  return (
    <div className="min-h-screen bg-[#0D1B1E] flex flex-col">
      <header className="h-12 bg-[#1B2838] border-b border-[#3A506B]/20 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[#D4A843] text-sm font-semibold" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            债务偿还经营赛
          </h1>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-400 text-xs">
            {currentTurn > config.maxTurns ? '已结束' : `第 ${currentTurn} / ${config.maxTurns} 回合`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPlaying && (
            <button onClick={pauseGame} className="flex items-center gap-1 px-3 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-[#243447] transition-colors cursor-pointer">
              <Pause className="w-3.5 h-3.5" /> 暂停
            </button>
          )}
          {isPaused && (
            <button onClick={resumeGame} className="flex items-center gap-1 px-3 py-1 rounded text-xs text-[#D4A843] hover:bg-[#D4A843]/10 transition-colors cursor-pointer">
              <Play className="w-3.5 h-3.5" /> 继续
            </button>
          )}
          <button onClick={handleRestart} className="flex items-center gap-1 px-3 py-1 rounded text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> 重开
          </button>
          {isEnded && (
            <button
              onClick={() => { goToSettlement(); navigate('/settlement') }}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs bg-[#D4A843] text-[#0D1B1E] font-semibold hover:bg-[#E0B85A] transition-colors cursor-pointer"
            >
              查看结算
            </button>
          )}
        </div>
      </header>

      {isPaused && (
        <div className="bg-[#0D1B1E]/90 absolute inset-0 z-30 flex items-center justify-center" style={{ marginTop: 48 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Pause className="w-16 h-16 text-[#D4A843] mx-auto mb-4" />
            <p className="text-[#D4A843] text-2xl font-bold mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>游戏暂停</p>
            <p className="text-slate-400 text-sm">点击"继续"恢复经营</p>
          </motion.div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Dashboard />

        <main className="flex-1 overflow-y-auto p-4">
          {isUnderpaying && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-400/10 border border-red-400/30 rounded-lg p-3 mb-4 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-300 text-xs">
                利息偿还不足最低标准（应还 ≥ {minPayment.toFixed(1)}万），将触发信用降级，满意度 -5
              </span>
            </motion.div>
          )}

          {acceptedProjectCost > 0 && (
            <div className="bg-[#D4A843]/5 border border-[#D4A843]/20 rounded-lg p-3 mb-4 flex items-center gap-2">
              <span className="text-[#D4A843] text-xs">
                已选项目总费用：{acceptedProjectCost}万（将从国库扣除）
              </span>
            </div>
          )}

          <section className="mb-4">
            <h2 className="text-[#D4A843] text-sm font-semibold mb-3" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              本回合项目卡
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {currentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  selected={acceptedProjectIds.includes(project.id)}
                  onToggle={() => toggleProject(project.id)}
                />
              ))}
            </div>
          </section>

          <BudgetAllocator
            treasury={treasury - acceptedProjectCost}
            infraInvestment={infraInvestment}
            interestPayment={interestPayment}
            welfareSpending={welfareSpending}
            onChange={setBudget}
            onConfirm={handleConfirm}
            canConfirm={canConfirm}
          />

          {turns.length > 0 && (
            <section className="mt-4">
              <h2 className="text-slate-500 text-xs mb-2">历史回合速览</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {turns.map((t) => (
                  <div key={t.turnNumber} className="bg-[#243447]/50 rounded-lg p-2 min-w-[100px] text-center shrink-0">
                    <div className="text-slate-500 text-[10px]">第{t.turnNumber}回合</div>
                    <div className="text-slate-300 text-xs font-mono">{t.treasuryAfter.toFixed(0)}万</div>
                    <div className="text-red-400 text-[10px]">债{t.debtAfter.toFixed(0)}</div>
                    <div className={`text-[10px] ${t.satisfactionAfter > 50 ? 'text-green-400' : t.satisfactionAfter > 25 ? 'text-amber-400' : 'text-red-400'}`}>
                      满{t.satisfactionAfter.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="w-[280px] xl:w-[320px] border-l border-[#3A506B]/20 shrink-0 overflow-hidden">
          <EvidenceLog entries={evidenceLog} />
        </aside>
      </div>
    </div>
  )
}
