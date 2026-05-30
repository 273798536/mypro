import { useNavigate, useParams } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { getLevel } from '@/data/levels'
import type { TimelineEvent, FundFlow, Subscription } from '@/types'

function formatHKD(amount: number): string {
  const prefix = amount < 0 ? '-' : ''
  return `${prefix}HK$ ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const eventTypeColors: Record<string, string> = {
  subscribe: 'text-[var(--color-success)]',
  freeze: 'text-[var(--color-warning)]',
  lottery_publish: 'text-[var(--color-info)]',
  win: 'text-[var(--color-success)]',
  lose: 'text-[var(--color-text-dim)]',
  refund: 'text-[var(--color-success)]',
  refund_delay: 'text-[var(--color-warning)]',
  fee_charge: 'text-[var(--color-info)]',
  fee_delay: 'text-[var(--color-info)]',
  problem: 'text-[var(--color-error)]',
  insufficient_funds: 'text-[var(--color-error)]',
}

const eventTypeDot: Record<string, string> = {
  subscribe: 'bg-[var(--color-success)]',
  freeze: 'bg-[var(--color-warning)]',
  lottery_publish: 'bg-[var(--color-info)]',
  win: 'bg-[var(--color-success)]',
  lose: 'bg-[var(--color-text-dim)]',
  refund: 'bg-[var(--color-success)]',
  refund_delay: 'bg-[var(--color-warning)]',
  fee_charge: 'bg-[var(--color-info)]',
  fee_delay: 'bg-[var(--color-info)]',
  problem: 'bg-[var(--color-error)]',
  insufficient_funds: 'bg-[var(--color-error)]',
}

const flowTypeColors: Record<string, string> = {
  freeze: 'text-[var(--color-warning)]',
  unfreeze: 'text-[var(--color-success)]',
  refund: 'text-[var(--color-success)]',
  charge: 'text-[var(--color-error)]',
  fee: 'text-[var(--color-info)]',
  deduction: 'text-[var(--color-error)]',
}

function exportReport(
  levelTitle: string,
  timeline: TimelineEvent[],
  fundFlows: FundFlow[],
  subscriptions: Subscription[],
  stats: { totalSubscriptions: number; winningCount: number; problemCount: number; fundUtilizationRate: number },
  funds: { available: number; frozen: number; pendingRefund: number; total: number }
) {
  const lines: string[] = []
  lines.push('═══════════════════════════════════════════')
  lines.push(`  港股打新排队局 - 复盘报告`)
  lines.push(`  关卡：${levelTitle}`)
  lines.push('═══════════════════════════════════════════')
  lines.push('')

  lines.push('【成绩统计】')
  lines.push(`  申购笔数：${stats.totalSubscriptions}`)
  lines.push(`  中签笔数：${stats.winningCount}`)
  lines.push(`  问题次数：${stats.problemCount}`)
  lines.push(`  资金利用率：${stats.fundUtilizationRate.toFixed(1)}%`)
  lines.push('')

  lines.push('【最终资金】')
  lines.push(`  可用余额：HK$ ${funds.available.toFixed(0)}`)
  lines.push(`  已冻结：HK$ ${funds.frozen.toFixed(0)}`)
  lines.push(`  待收退款：HK$ ${funds.pendingRefund.toFixed(0)}`)
  lines.push(`  总资产：HK$ ${funds.total.toFixed(0)}`)
  lines.push('')

  lines.push('【申购明细】')
  for (const sub of subscriptions) {
    if (sub.status === 'cancelled') continue
    lines.push(`  ${sub.stockName} | ${sub.shares}股 | HK$${sub.amount.toFixed(0)} | 状态：${sub.status} | 配号：${sub.lotteryNumber}`)
    if (sub.wonShares) lines.push(`    → 中签${sub.wonShares}股`)
    if (sub.refundDelayed) lines.push(`    → 退款延迟（来源：${sub.refundAmount ? '结算银行处理队列' : '-'}）`)
    if (sub.feeDelayed) lines.push(`    → 手续费晚到（来源：经纪商佣金结算单）`)
  }
  lines.push('')

  lines.push('【时间线】')
  for (const ev of timeline) {
    lines.push(`  [T+${ev.day}] ${ev.title}`)
    lines.push(`    ${ev.description}`)
    if (ev.problem) lines.push(`    ⚠ 来源：${ev.problem.sourceMaterial}`)
  }
  lines.push('')

  lines.push('【资金流水】')
  lines.push('  日期 | 类型 | 金额 | 余额 | 说明 | 延迟 | 来源')
  for (const flow of fundFlows) {
    lines.push(
      `  T+${flow.day} | ${flow.type} | ${flow.amount.toFixed(0)} | ${flow.balance.toFixed(0)} | ${flow.description} | ${flow.delayed ? '延迟' : '正常'} | ${flow.sourceMaterial || '-'}`
    )
  }

  lines.push('')
  lines.push('═══════════════════════════════════════════')

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `港股打新排队局-复盘报告-${levelTitle}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReviewPanel() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const { timeline, fundFlows, subscriptions, statistics, funds } = useGameStore()

  const level = getLevel(levelId || '')
  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-text-dim)]">
        关卡不存在
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-xs px-2 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface)] text-[var(--color-text-dim)] transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-sm font-bold">📊 复盘面板 — {level.title}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportReport(level.title, timeline, fundFlows, subscriptions, statistics, funds)}
              className="text-xs px-3 py-1.5 border-2 border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--color-bg)] rounded transition-all font-bold active:translate-y-[1px]"
            >
              📥 导出成绩
            </button>
            <button
              onClick={() => { useGameStore.getState().resetGame(); navigate('/') }}
              className="text-xs px-3 py-1.5 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface)] text-[var(--color-text-dim)] transition-colors"
            >
              重新开始
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-center">
            <div className="text-xs text-[var(--color-text-dim)] mb-1">申购笔数</div>
            <div className="font-mono text-2xl font-bold">{statistics.totalSubscriptions}</div>
          </div>
          <div className="p-4 border border-[var(--color-success)]/30 rounded-lg bg-[var(--color-success)]/5 text-center">
            <div className="text-xs text-[var(--color-success)] mb-1">中签笔数</div>
            <div className="font-mono text-2xl font-bold text-[var(--color-success)]">{statistics.winningCount}</div>
          </div>
          <div className="p-4 border border-[var(--color-error)]/30 rounded-lg bg-[var(--color-error)]/5 text-center">
            <div className="text-xs text-[var(--color-error)] mb-1">问题次数</div>
            <div className="font-mono text-2xl font-bold text-[var(--color-error)]">{statistics.problemCount}</div>
          </div>
          <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-center">
            <div className="text-xs text-[var(--color-text-dim)] mb-1">资金利用率</div>
            <div className="font-mono text-2xl font-bold">{statistics.fundUtilizationRate.toFixed(1)}%</div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold mb-3">🕐 时间线</h2>
          <div className="relative pl-6 space-y-2">
            {timeline.map((event, idx) => (
              <div key={event.id} className="relative animate-slide-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className={`absolute left-[-20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg)] ${eventTypeDot[event.type] || 'bg-[var(--color-text-dim)]'}`} />
                {idx < timeline.length - 1 && (
                  <div className="absolute left-[-17px] top-4 w-0.5 h-full bg-[var(--color-border)]" />
                )}
                <div className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-surface)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-[var(--color-text-dim)]">T+{event.day}</span>
                    <span className={`text-xs font-bold ${eventTypeColors[event.type] || ''}`}>
                      {event.title}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-dim)]">{event.description}</div>
                  {event.problem && (
                    <div className="mt-1 text-[10px] px-2 py-1 rounded bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20">
                      📍 来源：{event.problem.sourceMaterial}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold mb-3">💰 资金流水</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-dim)]">
                  <th className="text-left py-2 px-2 font-medium">日期</th>
                  <th className="text-left py-2 px-2 font-medium">类型</th>
                  <th className="text-right py-2 px-2 font-medium">金额</th>
                  <th className="text-right py-2 px-2 font-medium">余额</th>
                  <th className="text-left py-2 px-2 font-medium">说明</th>
                  <th className="text-center py-2 px-2 font-medium">延迟</th>
                  <th className="text-left py-2 px-2 font-medium">来源</th>
                </tr>
              </thead>
              <tbody>
                {fundFlows.map((flow, idx) => (
                  <tr
                    key={flow.id}
                    className={`border-b border-[var(--color-border)]/50 ${idx % 2 === 1 ? 'bg-[var(--color-surface)]' : ''} ${flow.delayed ? 'bg-[var(--color-warning)]/5' : ''}`}
                  >
                    <td className="py-2 px-2 font-mono text-[var(--color-text-dim)]">T+{flow.day}</td>
                    <td className={`py-2 px-2 font-mono ${flowTypeColors[flow.type] || ''}`}>{flow.type}</td>
                    <td className={`py-2 px-2 font-mono text-right ${flow.amount < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
                      {flow.amount < 0 ? '' : '+'}{flow.amount.toFixed(0)}
                    </td>
                    <td className="py-2 px-2 font-mono text-right">{flow.balance.toFixed(0)}</td>
                    <td className="py-2 px-2">
                      {flow.description}
                      {flow.delayed && flow.type === 'fee' && (
                        <span className="text-[var(--color-info)] ml-1 border-b border-dashed border-[var(--color-info)]">
                          [预扣]
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {flow.delayed ? (
                        <span className="text-[var(--color-warning)] font-semibold">
                          ⚠ 延迟{flow.actualDay - flow.expectedDay}日
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-dim)]">正常</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-text-dim)] text-[10px]">
                      {flow.sourceMaterial || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold mb-3">📋 申购结算明细</h2>
          <div className="space-y-2">
            {subscriptions.filter((s) => s.status !== 'cancelled').map((sub) => (
              <div key={sub.id} className={`p-3 border rounded-lg ${
                sub.status === 'won'
                  ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
                  : sub.refundDelayed || sub.feeDelayed
                  ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{sub.stockName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    sub.status === 'won'
                      ? 'border-[var(--color-success)]/40 text-[var(--color-success)] bg-[var(--color-success)]/10'
                      : sub.status === 'lost'
                      ? 'border-[var(--color-text-dim)]/40 text-[var(--color-text-dim)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-dim)]'
                  }`}>
                    {sub.status === 'won' ? '✅ 中签' : sub.status === 'lost' ? '未中签' : sub.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--color-text-dim)]">申购股数</span>
                    <div className="font-mono">{sub.shares}</div>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-dim)]">冻结金额</span>
                    <div className="font-mono">HK$ {sub.amount.toFixed(0)}</div>
                  </div>
                  {sub.status === 'won' && sub.wonShares && (
                    <>
                      <div>
                        <span className="text-[var(--color-text-dim)]">中签股数</span>
                        <div className="font-mono text-[var(--color-success)] font-semibold">{sub.wonShares}</div>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-dim)]">退款金额</span>
                        <div className={`font-mono ${sub.refundDelayed ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                          HK$ {sub.refundAmount?.toFixed(0)}
                          {sub.refundDelayed && ' ⚠️延迟'}
                        </div>
                      </div>
                    </>
                  )}
                  {sub.status === 'lost' && (
                    <div>
                      <span className="text-[var(--color-text-dim)]">退款金额</span>
                      <div className={`font-mono ${sub.refundDelayed ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                        HK$ {sub.refundAmount?.toFixed(0)}
                        {sub.refundDelayed && ' ⚠️延迟'}
                      </div>
                    </div>
                  )}
                </div>
                {(sub.refundDelayed || sub.feeDelayed) && (
                  <div className="mt-2 p-2 rounded bg-[var(--color-bg)]/50 text-[10px] space-y-0.5">
                    {sub.refundDelayed && (
                      <div className="text-[var(--color-warning)]">
                        ⚠️ 退款延迟 → 来源：结算银行处理队列 | 资金槽待收退款区域
                      </div>
                    )}
                    {sub.feeDelayed && (
                      <div className="text-[var(--color-info)]">
                        ℹ️ 手续费晚到 → 来源：经纪商佣金结算单 | 资金流水虚线标注预扣
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
