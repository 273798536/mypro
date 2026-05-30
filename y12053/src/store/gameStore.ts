import { create } from 'zustand'
import type { LevelId, GamePhase, Funds, Subscription, TimelineEvent, FundFlow, ProblemConfig } from '@/types'
import { getLevel } from '@/data/levels'
import {
  calculateFreezeAmount,
  calculateFee,
  generateLotteryNumber,
  createFundFlow,
  createTimelineEvent,
  detectInsufficientFunds,
  processSettlement,
  processDelayedRefunds,
  processDelayedFees,
} from '@/engine/settlement'

interface GameStatistics {
  totalSubscriptions: number
  winningCount: number
  problemCount: number
  fundUtilizationRate: number
}

interface GameStore {
  levelId: LevelId | null
  currentDay: number
  phase: GamePhase
  funds: Funds
  subscriptions: Subscription[]
  timeline: TimelineEvent[]
  fundFlows: FundFlow[]
  activeProblem: ProblemConfig | null
  triggeredProblems: ProblemConfig[]
  statistics: GameStatistics

  startLevel: (id: LevelId) => void
  subscribe: (stockCode: string, shares: number) => void
  cancelSubscription: (subscriptionId: string) => void
  confirmSubscriptions: () => void
  advanceDay: () => void
  dismissProblem: () => void
  goToReview: () => void
  resetGame: () => void
}

const initialFunds: Funds = { available: 0, frozen: 0, pendingRefund: 0, total: 0 }

const initialStatistics: GameStatistics = {
  totalSubscriptions: 0,
  winningCount: 0,
  problemCount: 0,
  fundUtilizationRate: 0,
}

function computeStats(subs: Subscription[], funds: Funds, problemCount: number): GameStatistics {
  const total = subs.length
  const won = subs.filter((s) => s.status === 'won').length
  const utilization = funds.total > 0 ? (funds.frozen / funds.total) * 100 : 0
  return {
    totalSubscriptions: total,
    winningCount: won,
    problemCount,
    fundUtilizationRate: Math.round(utilization * 100) / 100,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  levelId: null,
  currentDay: 0,
  phase: 'select',
  funds: initialFunds,
  subscriptions: [],
  timeline: [],
  fundFlows: [],
  activeProblem: null,
  triggeredProblems: [],
  statistics: initialStatistics,

  startLevel: (id: LevelId) => {
    const level = getLevel(id)
    if (!level) return

    const funds: Funds = {
      available: level.initialFunds,
      frozen: 0,
      pendingRefund: 0,
      total: level.initialFunds,
    }

    set({
      levelId: id,
      currentDay: 0,
      phase: 'subscribe',
      funds,
      subscriptions: [],
      timeline: [
        createTimelineEvent('subscribe', '📋 关卡开始', `初始资金 HK$${level.initialFunds.toLocaleString()}，请选择申购股票`, 0),
      ],
      fundFlows: [],
      activeProblem: null,
      triggeredProblems: [],
      statistics: { totalSubscriptions: 0, winningCount: 0, problemCount: 0, fundUtilizationRate: 0 },
    })
  },

  subscribe: (stockCode: string, shares: number) => {
    const state = get()
    const level = getLevel(state.levelId!)
    if (!level) return

    const stock = level.stocks.find((s) => s.code === stockCode)
    if (!stock) return

    const amount = calculateFreezeAmount(stock.price, shares)
    const fee = calculateFee(amount)
    const totalRequired = amount + fee

    if (detectInsufficientFunds(state.funds.available, totalRequired)) {
      const problem: ProblemConfig = {
        type: 'insufficient_funds',
        title: '❌ 冻资不足',
        description: `可用资金 HK$${state.funds.available.toFixed(0)} < 入场费+手续费 HK$${totalRequired.toFixed(0)}，差额 HK$${(totalRequired - state.funds.available).toFixed(0)}`,
        sourceMaterial: '申购卡 → 入场费字段 vs 资金槽 → 可用余额',
        severity: 'error',
      }

      set({
        activeProblem: problem,
        timeline: [
          ...state.timeline,
          createTimelineEvent('insufficient_funds', '❌ 冻资不足', `申购${stock.name}失败：可用资金不足。来源：${problem.sourceMaterial}`, state.currentDay, problem),
        ],
      })
      return
    }

    const prefix = stockCode.charAt(0).toUpperCase()
    const lotteryIndex = state.subscriptions.length + 1
    const lotteryNumber = generateLotteryNumber(prefix, lotteryIndex * 1000 + Math.floor(Math.random() * 9000))

    const subscription: Subscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      stockCode: stock.code,
      stockName: stock.name,
      shares,
      amount,
      fee,
      status: 'pending',
      lotteryNumber,
    }

    const newAvailable = state.funds.available - totalRequired
    const newFunds: Funds = {
      available: Math.round(newAvailable * 100) / 100,
      frozen: Math.round((state.funds.frozen + totalRequired) * 100) / 100,
      pendingRefund: state.funds.pendingRefund,
      total: state.funds.total,
    }

    const flow = createFundFlow('freeze', -totalRequired, newFunds.available, `冻结资金：${stock.name} ${shares}股`, state.currentDay)

    set({
      subscriptions: [...state.subscriptions, subscription],
      funds: newFunds,
      fundFlows: [...state.fundFlows, flow],
      timeline: [
        ...state.timeline,
        createTimelineEvent('subscribe', `🎫 申购：${stock.name}`, `申购${shares}股，冻结HK$${totalRequired.toFixed(0)}（含手续费HK$${fee}）`, state.currentDay),
      ],
      statistics: computeStats([...state.subscriptions, subscription], newFunds, state.triggeredProblems.length),
    })
  },

  cancelSubscription: (subscriptionId: string) => {
    const state = get()
    const sub = state.subscriptions.find((s) => s.id === subscriptionId)
    if (!sub || sub.status !== 'pending') return

    const refundAmount = sub.amount + sub.fee
    const newAvailable = state.funds.available + refundAmount
    const newFrozen = state.funds.frozen - refundAmount
    const newFunds: Funds = {
      available: Math.round(newAvailable * 100) / 100,
      frozen: Math.round(newFrozen * 100) / 100,
      pendingRefund: state.funds.pendingRefund,
      total: state.funds.total,
    }

    const flow = createFundFlow('unfreeze', refundAmount, newFunds.available, `取消申购退款：${sub.stockName}`, state.currentDay)

    set({
      subscriptions: state.subscriptions.map((s) =>
        s.id === subscriptionId ? { ...s, status: 'cancelled' as const } : s
      ),
      funds: newFunds,
      fundFlows: [...state.fundFlows, flow],
      timeline: [
        ...state.timeline,
        createTimelineEvent('freeze', `↩️ 取消申购：${sub.stockName}`, `释放冻结资金HK$${refundAmount.toFixed(0)}`, state.currentDay),
      ],
      statistics: computeStats(
        state.subscriptions.map((s) => s.id === subscriptionId ? { ...s, status: 'cancelled' as const } : s),
        newFunds,
        state.triggeredProblems.length
      ),
    })
  },

  confirmSubscriptions: () => {
    const state = get()
    const pendingSubs = state.subscriptions.filter((s) => s.status === 'pending')
    if (pendingSubs.length === 0) return

    const updatedSubs = state.subscriptions.map((s) =>
      s.status === 'pending' ? { ...s, status: 'frozen' as const } : s
    )

    set({
      subscriptions: updatedSubs,
      phase: 'frozen',
      timeline: [
        ...state.timeline,
        createTimelineEvent('freeze', '🔒 申购确认，资金已锁定', `${pendingSubs.length}笔申购已确认，资金冻结中`, state.currentDay),
      ],
    })
  },

  advanceDay: () => {
    const state = get()
    const nextDay = state.currentDay + 1
    const level = getLevel(state.levelId!)
    if (!level) return

    if (state.phase === 'frozen' && nextDay >= 2) {
      const result = processSettlement(state.subscriptions, state.funds, level.problems, nextDay)

      const allProblems = [...state.triggeredProblems, ...result.triggeredProblems]
      const uniqueProblems = allProblems.filter(
        (p, i, arr) => arr.findIndex((q) => q.type === p.type) === i
      )

      set({
        currentDay: nextDay,
        phase: 'lottery',
        subscriptions: result.updatedSubscriptions,
        funds: result.updatedFunds,
        fundFlows: [...state.fundFlows, ...result.newFlows],
        timeline: [...state.timeline, ...result.newEvents],
        triggeredProblems: uniqueProblems,
        activeProblem: uniqueProblems.length > 0 ? uniqueProblems[0] : null,
        statistics: computeStats(result.updatedSubscriptions, result.updatedFunds, uniqueProblems.length),
      })
      return
    }

    if (state.phase === 'lottery' && nextDay >= 3) {
      const hasRefundDelay = state.triggeredProblems.some((p) => p.type === 'refund_delay')
      const hasFeeDelay = state.triggeredProblems.some((p) => p.type === 'fee_delay')

      let currentFunds = { ...state.funds }
      let allFlows = [...state.fundFlows]
      let allEvents = [...state.timeline]

      if (hasRefundDelay) {
        const refundResult = processDelayedRefunds(state.subscriptions, currentFunds, nextDay)
        currentFunds = refundResult.updatedFunds
        allFlows = [...allFlows, ...refundResult.newFlows]
        allEvents = [...allEvents, ...refundResult.newEvents]
      }

      if (hasFeeDelay) {
        const feeResult = processDelayedFees(state.subscriptions, currentFunds, nextDay)
        currentFunds = feeResult.updatedFunds
        allFlows = [...allFlows, ...feeResult.newFlows]
        allEvents = [...allEvents, ...feeResult.newEvents]
      }

      set({
        currentDay: nextDay,
        phase: 'settlement',
        funds: currentFunds,
        fundFlows: allFlows,
        timeline: allEvents,
        statistics: computeStats(state.subscriptions, currentFunds, state.triggeredProblems.length),
      })
      return
    }

    set({ currentDay: nextDay })
  },

  dismissProblem: () => {
    const state = get()
    const remaining = state.triggeredProblems.filter((p) => p !== state.activeProblem)
    set({
      activeProblem: remaining.length > 0 ? remaining[0] : null,
    })
  },

  goToReview: () => {
    set({ phase: 'review' })
  },

  resetGame: () => {
    set({
      levelId: null,
      currentDay: 0,
      phase: 'select',
      funds: initialFunds,
      subscriptions: [],
      timeline: [],
      fundFlows: [],
      activeProblem: null,
      triggeredProblems: [],
      statistics: initialStatistics,
    })
  },
}))
