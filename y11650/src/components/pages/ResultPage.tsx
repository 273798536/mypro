import { useNavigate, useLocation } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { getLevelById } from '../../data/levels'
import { DISHES } from '../../data/dishes'
import { ALLERGEN_ICONS, GRADE_COLORS } from '../../types/game'
import type { ActionLog } from '../../types/game'
import { useState } from 'react'

function getGrade(score: number): { letter: string; color: string; emoji: string } {
  if (score >= 3000) return { letter: 'S', color: 'text-yellow-500', emoji: '🏆' }
  if (score >= 2000) return { letter: 'A', color: 'text-success', emoji: '🌟' }
  if (score >= 1000) return { letter: 'B', color: 'text-info', emoji: '👍' }
  if (score >= 500) return { letter: 'C', color: 'text-warning', emoji: '😅' }
  return { letter: 'D', color: 'text-danger', emoji: '💪' }
}

function ActionLogItem({ log, index }: { log: ActionLog; index: number }) {
  const [expanded, setExpanded] = useState(false)

  const typeColors = {
    correct: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
  }

  const categoryLabels = {
    correct_delivery: '✅ 正确交付',
    combo: '🔥 连击',
    allergy_mismatch: '⚠️ 过敏错配',
    window_congestion: '🚧 窗口拥堵',
    food_waste: '🗑️ 备餐浪费',
    grade_mismatch: '❌ 年级错配',
    correction: '🔄 已修正',
  }

  return (
    <div
      className={`rounded-lg border p-2 cursor-pointer transition-all ${typeColors[log.type]}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">#{index + 1}</span>
          <span className="text-xs font-medium">
            {categoryLabels[log.category] || log.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${log.points > 0 ? 'text-success' : 'text-danger'}`}>
            {log.points > 0 ? '+' : ''}{log.points}
          </span>
          {log.source && (
            <span className="text-[10px] text-gray-400 bg-white/50 px-1 rounded">
              {log.source}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-1">{log.action}</p>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-400 space-y-1">
          <div>时间: {Math.round(log.timestamp)}秒</div>
          {log.orderId && <div>订单: #{log.orderId.slice(-4)}</div>}
          <div>详细: {JSON.stringify(log.details, null, 2)}</div>
        </div>
      )}
    </div>
  )
}

export default function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const levelId = useGameStore(s => s.levelId)
  const score = useGameStore(s => s.score)
  const actions = useGameStore(s => s.actions)
  const orders = useGameStore(s => s.orders)
  const getReport = useGameStore(s => s.getReport)

  const level = levelId ? getLevelById(levelId) : null
  const gradeInfo = getGrade(score)

  const errorActions = actions.filter(a => a.type === 'error' || a.type === 'warning')
  const correctActions = actions.filter(a => a.type === 'correct')

  const totalOrders = orders.length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const failed = orders.filter(o => o.status === 'failed').length
  const accuracy = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0

  const allergyErrors = actions.filter(a => a.category === 'allergy_mismatch').length
  const congestionWarnings = actions.filter(a => a.category === 'window_congestion').length
  const wasteErrors = actions.filter(a => a.category === 'food_waste').length

  const sessionId = (location.state as any)?.sessionId || 'unknown'

  return (
    <div className="min-h-screen bg-cafeteria-bg">
      <header className="bg-gradient-to-r from-primary to-primary-dark text-white py-4 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-3xl">📊 关卡结算</h1>
          {level && <p className="text-orange-100 text-sm mt-1">{level.name}</p>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-6xl mb-2">{gradeInfo.emoji}</div>
          <div className={`font-display text-6xl ${gradeInfo.color}`}>{gradeInfo.letter}</div>
          <div className="font-display text-3xl text-primary mt-2">{score} 分</div>
          {level && (
            <div className={`text-sm mt-2 ${score >= level.targetScore ? 'text-success' : 'text-danger'}`}>
              {score >= level.targetScore ? '🎉 达标!' : `目标 ${level.targetScore} 分，继续加油！`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-cafeteria-border">
            <div className="text-2xl font-bold text-info">{totalOrders}</div>
            <div className="text-xs text-gray-500">总订单</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-cafeteria-border">
            <div className="text-2xl font-bold text-success">{delivered}</div>
            <div className="text-xs text-gray-500">已交付</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-cafeteria-border">
            <div className="text-2xl font-bold text-danger">{failed}</div>
            <div className="text-xs text-gray-500">失败</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-cafeteria-border">
            <div className="text-2xl font-bold text-primary">{accuracy}%</div>
            <div className="text-xs text-gray-500">正确率</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
            <div className="text-xl font-bold text-danger">{allergyErrors}</div>
            <div className="text-[10px] text-red-600">⚠️ 过敏错配</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-200">
            <div className="text-xl font-bold text-warning">{congestionWarnings}</div>
            <div className="text-[10px] text-yellow-600">🚧 窗口拥堵</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
            <div className="text-xl font-bold text-orange-600">{wasteErrors}</div>
            <div className="text-[10px] text-orange-600">🗑️ 备餐浪费</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-cafeteria-border p-4">
          <h3 className="font-display text-lg text-gray-700 mb-3">🔍 扣分回放</h3>
          {errorActions.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">没有扣分记录，完美表现！🎉</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
              {errorActions.map((log, i) => (
                <ActionLogItem key={log.id} log={log} index={i} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow border border-cafeteria-border p-4">
          <h3 className="font-display text-lg text-gray-700 mb-3">✅ 正确操作</h3>
          {correctActions.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">暂无正确操作记录</div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
              {correctActions.map((log, i) => (
                <ActionLogItem key={log.id} log={log} index={i} />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate(`/report/${sessionId}`, { state: { sessionId, levelId } })}
            className="flex-1 py-3 bg-info hover:bg-blue-600 text-white rounded-xl font-display text-lg transition-colors shadow-md"
          >
            📋 查看服务报告
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-display text-lg transition-colors shadow-md"
          >
            🏠 返回首页
          </button>
        </div>
      </main>
    </div>
  )
}
