import { useGameStore } from '@/store/gameStore'

export default function FundSlot() {
  const { funds, subscriptions, phase, currentDay } = useGameStore()

  const totalAssets = funds.available + funds.frozen + funds.pendingRefund
  const usedPercent = totalAssets > 0 ? ((funds.frozen + funds.pendingRefund) / totalAssets) * 100 : 0
  const frozenPercent = totalAssets > 0 ? (funds.frozen / totalAssets) * 100 : 0
  const pendingPercent = totalAssets > 0 ? (funds.pendingRefund / totalAssets) * 100 : 0
  const availablePercent = totalAssets > 0 ? (funds.available / totalAssets) * 100 : 0

  const pendingSubs = subscriptions.filter((s) => s.status === 'pending').length
  const frozenSubs = subscriptions.filter((s) => s.status === 'frozen').length
  const wonSubs = subscriptions.filter((s) => s.status === 'won').length
  const lostSubs = subscriptions.filter((s) => s.status === 'lost').length
  const delayedRefunds = subscriptions.filter((s) => s.refundDelayed).length
  const delayedFees = subscriptions.filter((s) => s.feeDelayed).length

  const dayLabel = `T+${currentDay}`

  return (
    <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">💰 资金槽</h3>
        <span className="font-mono text-xs text-[var(--color-text-dim)]">{dayLabel}</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-dim)]">可用余额</span>
          <span className="font-mono font-semibold text-[var(--color-success)]">
            HK$ {funds.available.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-dim)]">已冻结</span>
          <span className={`font-mono ${funds.frozen > 0 ? 'text-[var(--color-warning)]' : ''}`}>
            HK$ {funds.frozen.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className={`text-[var(--color-text-dim)] ${delayedRefunds > 0 ? 'font-bold text-[var(--color-warning)]' : ''}`}>
            待收退款 {delayedRefunds > 0 && '⚠️'}
          </span>
          <span className={`font-mono ${delayedRefunds > 0 ? 'text-[var(--color-warning)] font-semibold' : ''}`}>
            HK$ {funds.pendingRefund.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="border-t border-[var(--color-border)] pt-1 flex justify-between text-xs font-bold">
          <span>总资产</span>
          <span className="font-mono">HK$ {funds.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="h-3 rounded-full bg-[var(--color-surface-light)] overflow-hidden flex">
          {availablePercent > 0 && (
            <div
              className="bg-[var(--color-success)] transition-all duration-500"
              style={{ width: `${availablePercent}%` }}
            />
          )}
          {frozenPercent > 0 && (
            <div
              className="bg-[var(--color-warning)] transition-all duration-500 opacity-60"
              style={{ width: `${frozenPercent}%` }}
            />
          )}
          {pendingPercent > 0 && (
            <div
              className={`transition-all duration-500 ${delayedRefunds > 0 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-info)]'} opacity-40`}
              style={{ width: `${pendingPercent}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--color-text-dim)] mt-1">
          <span>可用 {availablePercent.toFixed(0)}%</span>
          <span>冻结 {frozenPercent.toFixed(0)}%</span>
          <span>待收 {pendingPercent.toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-[var(--color-surface-light)] text-center">
          <div className="text-[var(--color-text-dim)]">待确认</div>
          <div className="font-mono font-semibold">{pendingSubs}</div>
        </div>
        <div className="p-2 rounded bg-[var(--color-surface-light)] text-center">
          <div className="text-[var(--color-text-dim)]">已冻结</div>
          <div className="font-mono font-semibold text-[var(--color-warning)]">{frozenSubs}</div>
        </div>
        <div className="p-2 rounded bg-[var(--color-surface-light)] text-center">
          <div className="text-[var(--color-text-dim)]">已中签</div>
          <div className="font-mono font-semibold text-[var(--color-success)]">{wonSubs}</div>
        </div>
        <div className="p-2 rounded bg-[var(--color-surface-light)] text-center">
          <div className="text-[var(--color-text-dim)]">未中签</div>
          <div className="font-mono font-semibold">{lostSubs}</div>
        </div>
      </div>

      {delayedFees > 0 && (
        <div className="mt-3 p-2 rounded border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-xs text-[var(--color-info)]">
          ℹ️ {delayedFees}笔手续费待扣（T+1日扣除）
        </div>
      )}
    </div>
  )
}
