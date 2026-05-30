import { useNavigate, useParams } from 'react-router-dom'
import { getLevel } from '@/data/levels'
import { useGameStore } from '@/store/gameStore'
import SubscriptionCard from '@/components/SubscriptionCard'
import FundSlot from '@/components/FundSlot'
import LotteryResult from '@/components/LotteryResult'
import ProblemAlert from '@/components/ProblemAlert'
import type { LevelId } from '@/types'

export default function GameBoard() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const {
    phase,
    currentDay,
    subscriptions,
    confirmSubscriptions,
    advanceDay,
    goToReview,
    cancelSubscription,
  } = useGameStore()

  const level = getLevel(levelId || '')
  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-text-dim)]">
        关卡不存在
      </div>
    )
  }

  const pendingSubs = subscriptions.filter((s) => s.status === 'pending')
  const canConfirm = pendingSubs.length > 0
  const canAdvance = phase === 'frozen' || phase === 'lottery'
  const canReview = phase === 'settlement'

  const phaseLabels: Record<string, string> = {
    select: '选择关卡',
    subscribe: '📋 申购阶段',
    frozen: '🔒 资金冻结中',
    lottery: '🎲 中签号公布',
    settlement: '✅ 结算完成',
    review: '📊 复盘',
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { useGameStore.getState().resetGame(); navigate('/') }}
              className="text-xs px-2 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface)] text-[var(--color-text-dim)] transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-sm font-bold">{level.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
            <span className="font-mono">T+{currentDay}</span>
            <span className={`px-2 py-0.5 rounded border ${
              phase === 'frozen' ? 'border-[var(--color-warning)]/40 text-[var(--color-warning)]' :
              phase === 'lottery' ? 'border-[var(--color-info)]/40 text-[var(--color-info)]' :
              phase === 'settlement' || phase === 'review' ? 'border-[var(--color-success)]/40 text-[var(--color-success)]' :
              'border-[var(--color-border)]'
            }`}>
              {phaseLabels[phase]}
            </span>
          </div>
        </div>
      </header>

      <ProblemAlert />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[var(--color-text-dim)] uppercase tracking-wider">🎫 申购卡</h2>
            {level.stocks.map((stock) => (
              <SubscriptionCard key={stock.code} stock={stock} />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[var(--color-text-dim)] uppercase tracking-wider">💰 资金槽</h2>
            <FundSlot />

            {pendingSubs.length > 0 && (
              <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] p-3">
                <h3 className="text-xs font-bold mb-2 text-[var(--color-text-dim)]">待确认申购</h3>
                {pendingSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-border)] last:border-0">
                    <span>{sub.stockName} × {sub.shares}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--color-warning)]">
                        HK$ {(sub.amount + sub.fee).toFixed(0)}
                      </span>
                      <button
                        onClick={() => cancelSubscription(sub.id)}
                        className="text-[var(--color-error)] hover:underline text-[10px]"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[var(--color-text-dim)] uppercase tracking-wider">🎲 中签号</h2>
            <LotteryResult stocks={level.stocks} />
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--color-text-dim)]">
            {phase === 'subscribe' && pendingSubs.length > 0 && `已选 ${pendingSubs.length} 笔申购待确认`}
            {phase === 'frozen' && '点击"推进到下一日"查看中签结果'}
            {phase === 'lottery' && '点击"推进到下一日"完成退款和手续费结算'}
            {phase === 'settlement' && '结算完成，可查看复盘'}
          </div>
          <div className="flex gap-2">
            {phase === 'subscribe' && (
              <button
                onClick={confirmSubscriptions}
                disabled={!canConfirm}
                className={`px-4 py-2 text-sm font-bold border-2 rounded transition-all ${
                  canConfirm
                    ? 'border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--color-bg)] active:translate-y-[1px]'
                    : 'border-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed'
                }`}
              >
                确认申购，锁定资金
              </button>
            )}
            {canAdvance && (
              <button
                onClick={advanceDay}
                className="px-4 py-2 text-sm font-bold border-2 border-[var(--color-info)] text-[var(--color-info)] hover:bg-[var(--color-info)] hover:text-[var(--color-bg)] rounded transition-all active:translate-y-[1px]"
              >
                推进到下一日 →
              </button>
            )}
            {canReview && (
              <button
                onClick={() => { goToReview(); navigate(`/review/${levelId}`) }}
                className="px-4 py-2 text-sm font-bold border-2 border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--color-bg)] rounded transition-all active:translate-y-[1px]"
              >
                查看复盘 →
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
