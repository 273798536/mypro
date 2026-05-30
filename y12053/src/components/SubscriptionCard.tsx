import { useState } from 'react'
import type { Stock, Subscription } from '@/types'
import { useGameStore } from '@/store/gameStore'
import { calculateFreezeAmount, calculateFee } from '@/engine/settlement'

interface SubscriptionCardProps {
  stock: Stock
}

export default function SubscriptionCard({ stock }: SubscriptionCardProps) {
  const [shares, setShares] = useState(stock.minShares)
  const { subscribe, funds, subscriptions, phase } = useGameStore()
  const existingSub = subscriptions.find((s) => s.stockCode === stock.code && s.status !== 'cancelled')

  const amount = calculateFreezeAmount(stock.price, shares)
  const fee = calculateFee(amount)
  const totalRequired = amount + fee
  const canAfford = funds.available >= totalRequired
  const isSubscribed = !!existingSub
  const canOperate = phase === 'subscribe'

  const isMissingFee = stock.missingColumn === 'fee'

  return (
    <div className={`p-4 border rounded-lg bg-[var(--color-surface)] transition-all ${
      isSubscribed
        ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/5'
        : !canAfford && canOperate
        ? 'border-[var(--color-error)]/40'
        : 'border-[var(--color-border)]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-sm">
            🎫 {stock.name}
          </div>
          <div className="font-mono text-xs text-[var(--color-text-dim)]">{stock.code}</div>
        </div>
        {isSubscribed && (
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30">
            {existingSub.status === 'pending' ? '待确认' : existingSub.status === 'frozen' ? '已冻结' : existingSub.status === 'won' ? '已中签' : existingSub.status === 'lost' ? '未中签' : '已取消'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-dim)]">申购价</span>
          <span className="font-mono">HK$ {stock.price.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-dim)]">入场费</span>
          <span className={`font-mono font-semibold ${!canAfford && canOperate ? 'text-[var(--color-error)]' : ''}`}>
            HK$ {stock.admissionFee.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-dim)]">最低股数</span>
          <span className="font-mono">{stock.minShares}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-dim)]">中签率</span>
          <span className="font-mono">{(stock.winningRate * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-dim)]">截止时间</span>
          <span className="font-mono">{stock.deadline}</span>
        </div>
        {isMissingFee && (
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">手续费</span>
            <span className="font-mono text-[var(--color-error)]">缺列 ⚠️</span>
          </div>
        )}
      </div>

      {isSubscribed && existingSub && (
        <div className="p-2 rounded bg-[var(--color-surface-light)] text-xs space-y-1 mb-2">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">配号</span>
            <span className="font-mono text-[var(--color-success)] font-semibold">{existingSub.lotteryNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">申购股数</span>
            <span className="font-mono">{existingSub.shares}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-dim)]">冻结金额</span>
            <span className="font-mono">HK$ {existingSub.amount.toFixed(0)}</span>
          </div>
          {existingSub.status === 'won' && existingSub.wonShares && (
            <div className="flex justify-between text-[var(--color-success)]">
              <span>中签股数</span>
              <span className="font-mono font-semibold">{existingSub.wonShares}</span>
            </div>
          )}
          {existingSub.status === 'won' && existingSub.refundAmount && (
            <div className="flex justify-between">
              <span className="text-[var(--color-text-dim)]">退款金额</span>
              <span className={`font-mono ${existingSub.refundDelayed ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                HK$ {existingSub.refundAmount.toFixed(0)}
                {existingSub.refundDelayed && ' (延迟中)'}
              </span>
            </div>
          )}
          {existingSub.status === 'lost' && (
            <div className="flex justify-between">
              <span className="text-[var(--color-text-dim)]">退款金额</span>
              <span className={`font-mono ${existingSub.refundDelayed ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                HK$ {existingSub.refundAmount?.toFixed(0)}
                {existingSub.refundDelayed && ' (延迟中)'}
              </span>
            </div>
          )}
        </div>
      )}

      {!isSubscribed && canOperate && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-[var(--color-text-dim)] whitespace-nowrap">股数</label>
            <input
              type="range"
              min={stock.minShares}
              max={stock.maxShares}
              step={stock.minShares}
              value={shares}
              onChange={(e) => setShares(Number(e.target.value))}
              className="flex-1 accent-[var(--color-success)]"
            />
            <span className="font-mono text-xs w-12 text-right">{shares}</span>
          </div>

          <div className="flex justify-between text-xs mb-2 p-2 rounded bg-[var(--color-surface-light)]">
            <span className="text-[var(--color-text-dim)]">需冻结</span>
            <span className={`font-mono font-semibold ${!canAfford ? 'text-[var(--color-error)]' : ''}`}>
              HK$ {totalRequired.toFixed(0)}
              <span className="text-[var(--color-text-dim)] font-normal ml-1">
                (含手续费 HK${fee})
              </span>
            </span>
          </div>

          {!canAfford && (
            <div className="text-xs text-[var(--color-error)] mb-2 font-medium animate-blink-error">
              ❌ 资金不足！差额 HK$ {(totalRequired - funds.available).toFixed(0)}
              <br />
              <span className="text-[var(--color-text-dim)] font-normal">→ 来源：申购卡入场费 vs 资金槽可用余额</span>
            </div>
          )}

          <button
            onClick={() => { subscribe(stock.code, shares); setShares(stock.minShares) }}
            disabled={!canAfford}
            className={`w-full py-2 text-sm font-bold border-2 rounded transition-all ${
              canAfford
                ? 'border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--color-bg)] active:translate-y-[1px]'
                : 'border-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed'
            }`}
          >
            申购
          </button>
        </>
      )}
    </div>
  )
}
