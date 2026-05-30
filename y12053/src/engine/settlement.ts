import type { Subscription, FundFlow, TimelineEvent, ProblemConfig, Funds } from '@/types'

export function generateLotteryNumber(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(4, '0')}`
}

export function matchWinningNumber(
  lotteryNumber: string,
  winningNumbers: string[]
): boolean {
  return winningNumbers.includes(lotteryNumber)
}

export function calculateFreezeAmount(price: number, shares: number): number {
  return price * shares
}

export function calculateFee(amount: number): number {
  return Math.ceil(amount * 0.005)
}

export function calculateRefund(subscription: Subscription): number {
  if (subscription.status === 'won' && subscription.wonShares) {
    return subscription.amount - subscription.wonShares * (subscription.amount / subscription.shares)
  }
  return subscription.amount
}

export function detectInsufficientFunds(
  available: number,
  admissionFee: number
): boolean {
  return available < admissionFee
}

export function createFundFlow(
  type: FundFlow['type'],
  amount: number,
  balance: number,
  description: string,
  day: number,
  delayed: boolean = false,
  expectedDay: number = 0,
  actualDay: number = 0,
  sourceMaterial?: string
): FundFlow {
  return {
    id: `ff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    amount,
    balance,
    description,
    day,
    delayed,
    expectedDay: expectedDay || day,
    actualDay: actualDay || day,
    sourceMaterial,
  }
}

export function createTimelineEvent(
  type: TimelineEvent['type'],
  title: string,
  description: string,
  day: number,
  problem?: ProblemConfig
): TimelineEvent {
  return {
    id: `te-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    description,
    day,
    problem,
  }
}

export function processSettlement(
  subscriptions: Subscription[],
  funds: Funds,
  problems: ProblemConfig[],
  currentDay: number
): {
  updatedSubscriptions: Subscription[]
  updatedFunds: Funds
  newFlows: FundFlow[]
  newEvents: TimelineEvent[]
  triggeredProblems: ProblemConfig[]
} {
  const newFlows: FundFlow[] = []
  const newEvents: TimelineEvent[] = []
  const triggeredProblems: ProblemConfig[] = []
  const updatedSubscriptions = subscriptions.map((sub) => ({ ...sub }))
  let available = funds.available
  let frozen = funds.frozen
  let pendingRefund = funds.pendingRefund

  for (const sub of updatedSubscriptions) {
    if (sub.status !== 'frozen') continue

    const isWon = Math.random() < 0.3
    const stockSub = sub

    if (isWon) {
      const wonShares = Math.max(stockSub.shares * 0.2, stockSub.shares >= 400 ? 400 : 0)
      const chargeAmount = (stockSub.amount / stockSub.shares) * wonShares
      const refundAmount = stockSub.amount - chargeAmount

      stockSub.status = 'won'
      stockSub.wonShares = wonShares
      stockSub.refundAmount = refundAmount

      frozen -= stockSub.amount
      available += refundAmount

      newFlows.push(
        createFundFlow(
          'charge',
          -chargeAmount,
          available,
          `中签扣款：${stockSub.stockName} ${wonShares}股`,
          currentDay
        )
      )
      newFlows.push(
        createFundFlow(
          'refund',
          refundAmount,
          available,
          `未中签部分退款：${stockSub.stockName}`,
          currentDay
        )
      )

      newEvents.push(
        createTimelineEvent(
          'win',
          `🎉 中签！${stockSub.stockName}`,
          `中签${wonShares}股，扣款HK$${chargeAmount.toFixed(0)}，退款HK$${refundAmount.toFixed(0)}`,
          currentDay
        )
      )

      const hasRefundDelay = problems.some((p) => p.type === 'refund_delay')
      if (hasRefundDelay && refundAmount > 0) {
        const delayProblem = problems.find((p) => p.type === 'refund_delay')!
        triggeredProblems.push(delayProblem)
        stockSub.refundDelayed = true

        newFlows.push(
          createFundFlow(
            'unfreeze',
            0,
            available,
            `退款延迟：${stockSub.stockName} 退款HK$${refundAmount.toFixed(0)} 预计T+${currentDay + 2}到账`,
            currentDay,
            true,
            currentDay,
            currentDay + 2,
            delayProblem.sourceMaterial
          )
        )

        newEvents.push(
          createTimelineEvent(
            'refund_delay',
            `⚠️ 退款延迟：${stockSub.stockName}`,
            `退款HK$${refundAmount.toFixed(0)}延迟到账，预计T+${currentDay + 2}日到账。来源：${delayProblem.sourceMaterial}`,
            currentDay,
            delayProblem
          )
        )
      }
    } else {
      stockSub.status = 'lost'
      stockSub.refundAmount = stockSub.amount

      frozen -= stockSub.amount

      const hasRefundDelay = problems.some((p) => p.type === 'refund_delay')
      if (hasRefundDelay) {
        const delayProblem = problems.find((p) => p.type === 'refund_delay')!
        triggeredProblems.push(delayProblem)
        stockSub.refundDelayed = true
        pendingRefund += stockSub.amount

        newFlows.push(
          createFundFlow(
            'unfreeze',
            0,
            available,
            `退款延迟：${stockSub.stockName} HK$${stockSub.amount.toFixed(0)} 预计T+${currentDay + 2}到账`,
            currentDay,
            true,
            currentDay,
            currentDay + 2,
            delayProblem.sourceMaterial
          )
        )

        newEvents.push(
          createTimelineEvent(
            'refund_delay',
            `⚠️ 退款延迟：${stockSub.stockName}`,
            `未中签退款HK$${stockSub.amount.toFixed(0)}延迟，预计T+${currentDay + 2}到账。来源：${delayProblem.sourceMaterial}`,
            currentDay,
            delayProblem
          )
        )
      } else {
        available += stockSub.amount

        newFlows.push(
          createFundFlow(
            'refund',
            stockSub.amount,
            available,
            `未中签退款：${stockSub.stockName}`,
            currentDay
          )
        )
      }

      newEvents.push(
        createTimelineEvent(
          'lose',
          `未中签：${stockSub.stockName}`,
          `申购${stockSub.shares}股未中签，${stockSub.refundDelayed ? '退款延迟中' : `退款HK$${stockSub.amount.toFixed(0)}已到账`}`,
          currentDay
        )
      )
    }

    const hasFeeDelay = problems.some((p) => p.type === 'fee_delay')
    const fee = calculateFee(stockSub.amount)
    if (hasFeeDelay) {
      const feeProblem = problems.find((p) => p.type === 'fee_delay')!
      if (!triggeredProblems.some((p) => p.type === 'fee_delay')) {
        triggeredProblems.push(feeProblem)
      }
      stockSub.feeDelayed = true

      newFlows.push(
        createFundFlow(
          'fee',
          0,
          available,
          `手续费待扣：HK$${fee} 将于T+${currentDay + 1}扣除`,
          currentDay,
          true,
          currentDay,
          currentDay + 1,
          feeProblem.sourceMaterial
        )
      )

      newEvents.push(
        createTimelineEvent(
          'fee_delay',
          `ℹ️ 手续费晚到：${stockSub.stockName}`,
          `手续费HK$${fee}将于T+${currentDay + 1}日扣除。来源：${feeProblem.sourceMaterial}`,
          currentDay,
          feeProblem
        )
      )
    } else {
      available -= fee

      newFlows.push(
        createFundFlow(
          'fee',
          -fee,
          available,
          `手续费扣除：${stockSub.stockName}`,
          currentDay
        )
      )
    }

    const hasMissingColumn = problems.some((p) => p.type === 'missing_column')
    if (hasMissingColumn) {
      const missingProblem = problems.find((p) => p.type === 'missing_column')!
      if (!triggeredProblems.some((p) => p.type === 'missing_column')) {
        triggeredProblems.push(missingProblem)
      }

      newEvents.push(
        createTimelineEvent(
          'problem',
          `❌ 中签号缺列：${stockSub.stockName}`,
          `中签号公布表缺少列，需对照申购卡补全。来源：${missingProblem.sourceMaterial}`,
          currentDay,
          missingProblem
        )
      )
    }
  }

  const updatedFunds: Funds = {
    available: Math.round(available * 100) / 100,
    frozen: Math.round(frozen * 100) / 100,
    pendingRefund: Math.round(pendingRefund * 100) / 100,
    total: Math.round((available + frozen + pendingRefund) * 100) / 100,
  }

  return {
    updatedSubscriptions,
    updatedFunds,
    newFlows,
    newEvents,
    triggeredProblems,
  }
}

export function processDelayedRefunds(
  subscriptions: Subscription[],
  funds: Funds,
  currentDay: number
): {
  updatedFunds: Funds
  newFlows: FundFlow[]
  newEvents: TimelineEvent[]
} {
  const newFlows: FundFlow[] = []
  const newEvents: TimelineEvent[] = []
  let available = funds.available
  let pendingRefund = funds.pendingRefund

  for (const sub of subscriptions) {
    if (sub.refundDelayed && sub.refundAmount) {
      const expectedArrivalDay = currentDay
      available += sub.refundAmount
      pendingRefund -= sub.refundAmount

      newFlows.push(
        createFundFlow(
          'refund',
          sub.refundAmount,
          available,
          `延迟退款到账：${sub.stockName} HK$${sub.refundAmount.toFixed(0)}`,
          currentDay,
          false,
          currentDay - 2,
          currentDay,
          '结算银行 → 处理队列'
        )
      )

      newEvents.push(
        createTimelineEvent(
          'refund',
          `✅ 延迟退款到账：${sub.stockName}`,
          `HK$${sub.refundAmount.toFixed(0)}已到账（延迟2日）`,
          currentDay
        )
      )
    }
  }

  return {
    updatedFunds: {
      available: Math.round(available * 100) / 100,
      frozen: funds.frozen,
      pendingRefund: Math.round(pendingRefund * 100) / 100,
      total: Math.round((available + funds.frozen + pendingRefund) * 100) / 100,
    },
    newFlows,
    newEvents,
  }
}

export function processDelayedFees(
  subscriptions: Subscription[],
  funds: Funds,
  currentDay: number
): {
  updatedFunds: Funds
  newFlows: FundFlow[]
  newEvents: TimelineEvent[]
} {
  const newFlows: FundFlow[] = []
  const newEvents: TimelineEvent[] = []
  let available = funds.available

  for (const sub of subscriptions) {
    if (sub.feeDelayed) {
      const fee = calculateFee(sub.amount)
      available -= fee

      newFlows.push(
        createFundFlow(
          'fee',
          -fee,
          available,
          `手续费扣款：${sub.stockName} HK$${fee}`,
          currentDay,
          false,
          currentDay - 1,
          currentDay,
          '经纪商 → 佣金结算单'
        )
      )

      newEvents.push(
        createTimelineEvent(
          'fee_charge',
          `💸 手续费已扣：${sub.stockName}`,
          `手续费HK$${fee}已于今日扣除（延迟1日）`,
          currentDay
        )
      )
    }
  }

  return {
    updatedFunds: {
      available: Math.round(available * 100) / 100,
      frozen: funds.frozen,
      pendingRefund: funds.pendingRefund,
      total: Math.round((available + funds.frozen + funds.pendingRefund) * 100) / 100,
    },
    newFlows,
    newEvents,
  }
}
