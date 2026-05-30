import type { Stock } from '@/types'
import { useGameStore } from '@/store/gameStore'
import { matchWinningNumber } from '@/engine/settlement'

interface LotteryResultProps {
  stocks: Stock[]
}

export default function LotteryResult({ stocks }: LotteryResultProps) {
  const { subscriptions, phase } = useGameStore()

  const isLotteryPhase = phase === 'lottery' || phase === 'settlement' || phase === 'review'

  if (!isLotteryPhase) {
    return (
      <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
        <h3 className="text-sm font-bold mb-2">🎲 中签号</h3>
        <div className="text-xs text-[var(--color-text-dim)] text-center py-6">
          等待中签号公布...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
      <h3 className="text-sm font-bold mb-3">🎲 中签号公布</h3>

      <div className="space-y-3">
        {stocks.map((stock) => {
          const stockSubs = subscriptions.filter((s) => s.stockCode === stock.code && s.status !== 'cancelled')
          const isMissingFee = stock.missingColumn === 'fee'

          return (
            <div key={stock.code} className="border border-[var(--color-border)] rounded bg-[var(--color-surface-light)]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-bold">{stock.name}</span>
                <span className="font-mono text-xs text-[var(--color-text-dim)]">{stock.code}</span>
              </div>

              <div className="px-3 py-2">
                <div className="text-[10px] text-[var(--color-text-dim)] mb-1">中签号码</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {stock.winningNumbers.map((num) => (
                    <span
                      key={num}
                      className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30"
                    >
                      {num}
                    </span>
                  ))}
                </div>

                {stockSubs.length > 0 && (
                  <div className="border-t border-[var(--color-border)] pt-2">
                    <div className="text-[10px] text-[var(--color-text-dim)] mb-1">我的配号</div>
                    {stockSubs.map((sub) => {
                      const isWon = matchWinningNumber(sub.lotteryNumber, stock.winningNumbers)
                      return (
                        <div
                          key={sub.id}
                          className={`flex items-center justify-between text-xs py-1 px-2 rounded mb-1 ${
                            isWon || sub.status === 'won'
                              ? 'bg-[var(--color-success)]/10 animate-highlight-win'
                              : 'bg-[var(--color-surface)]'
                          }`}
                        >
                          <span className="font-mono">{sub.lotteryNumber}</span>
                          <span className={isWon || sub.status === 'won' ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-text-dim)]'}>
                            {isWon || sub.status === 'won' ? '✅ 中签' : '未中签'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isMissingFee && (
                  <div className="mt-2 p-2 rounded border-2 border-[var(--color-error)]/50 bg-[var(--color-error)]/10">
                    <div className="text-xs text-[var(--color-error)] font-bold animate-blink-error">
                      ❌ 中签号缺一列：手续费列缺失
                    </div>
                    <div className="text-[10px] text-[var(--color-text-dim)] mt-1">
                      → 来源：中签号表第3列缺失 | 需对照：申购卡手续费字段
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
