import { create } from 'zustand'
import type { Order, PrepSlot, PickupWindow, ActionLog, ReplayFrame, GameSession, ServiceReport, Grade, FloatingScore } from '../types/game'
import { GRADE_COLORS } from '../types/game'
import { getLevelById } from '../data/levels'
import { DISHES, hasAllergenConflict } from '../data/dishes'
import { generateReport } from '../utils/reportGenerator'

interface GameState {
  phase: 'idle' | 'playing' | 'paused' | 'ended'
  levelId: string | null
  sessionId: string
  score: number
  combo: number
  timeLeft: number
  totalTime: number

  orders: Order[]
  prepSlots: PrepSlot[]
  windows: PickupWindow[]
  actions: ActionLog[]
  replay: ReplayFrame[]
  floatingScores: FloatingScore[]

  selectedOrderId: string | null

  nextOrderTime: number
  elapsedTime: number

  startGame: (levelId: string) => void
  tick: (dt: number) => void
  selectOrder: (orderId: string) => void
  assignToPrep: (slotId: string) => void
  deliverToWindow: (windowId: string) => void
  pickupFromPrep: (slotId: string) => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: () => void
  clearFloatingScore: (id: string) => void
  getSession: () => GameSession
  getReport: () => ServiceReport
}

const GRADES: Grade[] = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

function genId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function generateOrder(windows: PickupWindow[], levelId: string, forceNoAllergen: boolean, gameElapsed: number): Order {
  const windowIdx = Math.floor(Math.random() * windows.length)
  const targetWindow = windows[windowIdx]
  const grade = targetWindow.grade

  const availableDishes = forceNoAllergen
    ? DISHES.filter(d => d.allergens.length === 0)
    : DISHES
  const dishCount = Math.random() > 0.6 ? 2 : 1
  const shuffled = [...availableDishes].sort(() => Math.random() - 0.5)
  const selectedDishes = shuffled.slice(0, dishCount).map(d => d.id)

  const allergens: typeof import('../types/game').ALLERGEN_ICONS extends Record<infer A, string> ? A[] : never = []
  if (!forceNoAllergen && Math.random() > 0.5) {
    const allAllergens: string[] = ['花生', '牛奶', '鸡蛋', '小麦', '海鲜', '大豆']
    const count = Math.random() > 0.7 ? 2 : 1
    const shuffledAllergens = allAllergens.sort(() => Math.random() - 0.5).slice(0, count)
    allergens.push(...(shuffledAllergens as any[]))
  }

  return {
    id: genId(),
    grade,
    dishIds: selectedDishes,
    allergens: allergens as any,
    targetWindowId: targetWindow.id,
    createdAt: gameElapsed,
    status: 'pending',
    correctionCount: 0,
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  levelId: null,
  sessionId: genId(),
  score: 0,
  combo: 0,
  timeLeft: 0,
  totalTime: 0,

  orders: [],
  prepSlots: [],
  windows: [],
  actions: [],
  replay: [],
  floatingScores: [],

  selectedOrderId: null,
  nextOrderTime: 0,
  elapsedTime: 0,

  startGame: (levelId: string) => {
    const level = getLevelById(levelId)
    if (!level) return

    const windows: PickupWindow[] = level.windowConfigs.map((wc, i) => ({
      id: `window-${i}`,
      name: `${wc.grade}窗口`,
      grade: wc.grade,
      queue: [],
      maxQueue: wc.maxQueue,
    }))

    const prepSlots: PrepSlot[] = Array.from({ length: level.prepSlotCount }, (_, i) => ({
      id: `prep-${i}`,
      orderId: null,
      progress: 0,
    }))

    const firstOrder = generateOrder(windows, levelId, level.difficulty <= 1, 0)

    set({
      phase: 'playing',
      levelId,
      sessionId: genId(),
      score: 0,
      combo: 0,
      timeLeft: level.duration,
      totalTime: level.duration,
      orders: [firstOrder],
      prepSlots,
      windows,
      actions: [],
      replay: [],
      floatingScores: [],
      selectedOrderId: null,
      nextOrderTime: level.orderIntervalMin + Math.random() * (level.orderIntervalMax - level.orderIntervalMin),
      elapsedTime: 0,
    })
  },

  tick: (dt: number) => {
    const state = get()
    if (state.phase !== 'playing') return

    const newTimeLeft = Math.max(0, state.timeLeft - dt)
    const newElapsedTime = state.elapsedTime + dt
    let newOrders = [...state.orders]
    let newPrepSlots = state.prepSlots.map(s => ({ ...s }))
    let newWindows = state.windows.map(w => ({ ...w, queue: [...w.queue] }))
    let newActions = [...state.actions]
    let newFloatingScores = [...state.floatingScores]
    let newScore = state.score
    let newCombo = state.combo
    let newNextOrderTime = state.nextOrderTime - dt

    const level = state.levelId ? getLevelById(state.levelId) : null

    for (const slot of newPrepSlots) {
      if (slot.orderId) {
        const orderIdx = newOrders.findIndex(o => o.id === slot.orderId)
        if (orderIdx >= 0 && newOrders[orderIdx].status === 'preparing') {
          const dish = DISHES.find(d => d.id === newOrders[orderIdx].dishIds[0])
          const prepTime = dish ? dish.prepTime : 3000
          slot.progress = Math.min(100, slot.progress + (dt * 1000 / prepTime) * 100)
          if (slot.progress >= 100) {
            newOrders[orderIdx] = { ...newOrders[orderIdx], status: 'ready' }
          }
        }
      }
    }

    for (const window of newWindows) {
      if (window.queue.length > window.maxQueue) {
        const existingWarning = newActions.find(
          a => a.category === 'window_congestion' && a.details.windowId === window.id && (newElapsedTime - a.timestamp) < 3000
        )
        if (!existingWarning) {
          const action: ActionLog = {
            id: genId(),
            timestamp: newElapsedTime,
            type: 'warning',
            category: 'window_congestion',
            action: `${window.name}排队超过${window.maxQueue}人，窗口拥堵！`,
            details: { windowId: window.id, queueLength: window.queue.length, maxQueue: window.maxQueue },
            points: -50,
            source: '取餐窗口',
          }
          newActions.push(action)
          newScore -= 50
        }
      }
    }

    if (newNextOrderTime <= 0 && level) {
      const newOrder = generateOrder(newWindows, state.levelId!, level.difficulty <= 1, newElapsedTime)
      newOrders.push(newOrder)
      newNextOrderTime = level.orderIntervalMin + Math.random() * (level.orderIntervalMax - level.orderIntervalMin)
    }

    const expiredOrders = newOrders.filter(o => o.status === 'pending' && (newElapsedTime - o.createdAt) > 15)
    for (const order of expiredOrders) {
      const idx = newOrders.findIndex(o => o.id === order.id)
      if (idx >= 0) {
        newOrders[idx] = { ...newOrders[idx], status: 'failed' }
      }
      const action: ActionLog = {
        id: genId(),
        timestamp: newElapsedTime,
        type: 'error',
        category: 'food_waste',
        action: `订单超时未处理：${order.dishIds.map(id => DISHES.find(d => d.id === id)?.name || id).join('+')}`,
        details: { orderId: order.id, grade: order.grade },
        points: -80,
        orderId: order.id,
        source: '备餐台',
      }
      newActions.push(action)
      newScore -= 80
      newCombo = 0

      newFloatingScores.push({
        id: genId(),
        x: 100,
        y: 200,
        points: -80,
        type: 'error',
        createdAt: Date.now(),
      })
    }

    const now = Date.now()
    newFloatingScores = newFloatingScores.filter(f => now - f.createdAt < 1000)

    if (newTimeLeft <= 0) {
      set({
        ...state,
        timeLeft: 0,
        phase: 'ended',
        orders: newOrders,
        prepSlots: newPrepSlots,
        windows: newWindows,
        actions: newActions,
        score: newScore,
        combo: newCombo,
        floatingScores: newFloatingScores,
        elapsedTime: newElapsedTime,
      })
      return
    }

    const replayFrame: ReplayFrame = {
      timestamp: newElapsedTime,
      score: newScore,
      orders: newOrders.map(o => ({ ...o })),
      prepSlots: newPrepSlots.map(s => ({ ...s })),
      windows: newWindows.map(w => ({ ...w, queue: [...w.queue] })),
    }

    set({
      timeLeft: newTimeLeft,
      elapsedTime: newElapsedTime,
      orders: newOrders,
      prepSlots: newPrepSlots,
      windows: newWindows,
      actions: newActions,
      score: newScore,
      combo: newCombo,
      floatingScores: newFloatingScores,
      nextOrderTime: newNextOrderTime,
      replay: [...state.replay, replayFrame],
    })
  },

  selectOrder: (orderId: string) => {
    const state = get()
    if (state.phase !== 'playing') return
    const order = state.orders.find(o => o.id === orderId)
    if (!order || order.status !== 'pending') return
    set({ selectedOrderId: state.selectedOrderId === orderId ? null : orderId })
  },

  assignToPrep: (slotId: string) => {
    const state = get()
    if (state.phase !== 'playing') return
    if (!state.selectedOrderId) return

    const slot = state.prepSlots.find(s => s.id === slotId)
    if (!slot || slot.orderId) return

    const order = state.orders.find(o => o.id === state.selectedOrderId)
    if (!order || order.status !== 'pending') return

    const conflict = hasAllergenConflict(order.dishIds, order.allergens)
    if (conflict.length > 0) {
      const action: ActionLog = {
        id: genId(),
        timestamp: state.elapsedTime,
        type: 'error',
        category: 'allergy_mismatch',
        action: `⚠️ 过敏错配！${order.grade}学生含${conflict.join('、')}过敏原，但餐品含这些成分`,
        details: { orderId: order.id, allergens: conflict, dishIds: order.dishIds, grade: order.grade },
        points: -200,
        orderId: order.id,
        source: '过敏原',
      }
      set({
        actions: [...state.actions, action],
        score: state.score - 200,
        combo: 0,
        selectedOrderId: null,
        floatingScores: [...state.floatingScores, {
          id: genId(),
          x: 400,
          y: 300,
          points: -200,
          type: 'error',
          createdAt: Date.now(),
        }],
      })
      return
    }

    const newOrders = state.orders.map(o =>
      o.id === order.id ? { ...o, status: 'preparing' as const } : o
    )
    const newPrepSlots = state.prepSlots.map(s =>
      s.id === slotId ? { ...s, orderId: order.id, progress: 0 } : s
    )

    set({
      orders: newOrders,
      prepSlots: newPrepSlots,
      selectedOrderId: null,
    })
  },

  pickupFromPrep: (slotId: string) => {
    const state = get()
    if (state.phase !== 'playing') return

    const slot = state.prepSlots.find(s => s.id === slotId)
    if (!slot || !slot.orderId) return

    const order = state.orders.find(o => o.id === slot.orderId)
    if (!order || order.status !== 'ready') return

    set({
      selectedOrderId: order.id,
    })
  },

  deliverToWindow: (windowId: string) => {
    const state = get()
    if (state.phase !== 'playing') return
    if (!state.selectedOrderId) return

    const order = state.orders.find(o => o.id === state.selectedOrderId)
    if (!order) return

    if (order.status === 'pending') {
      return
    }

    if (order.status !== 'ready' && order.status !== 'preparing') return

    const targetWindow = state.windows.find(w => w.id === windowId)
    if (!targetWindow) return

    let newActions = [...state.actions]
    let newScore = state.score
    let newCombo = state.combo
    let newFloatingScores = [...state.floatingScores]
    let isCorrect = true

    if (targetWindow.id !== order.targetWindowId) {
      isCorrect = false
      const correctWindow = state.windows.find(w => w.id === order.targetWindowId)
      const action: ActionLog = {
        id: genId(),
        timestamp: state.elapsedTime,
        type: 'error',
        category: 'grade_mismatch',
        action: `年级错配！${order.grade}订单应送到${correctWindow?.name || '正确窗口'}，却送到了${targetWindow.name}`,
        details: { orderId: order.id, targetWindowId: order.targetWindowId, actualWindowId: windowId, grade: order.grade },
        points: -100,
        orderId: order.id,
        source: '取餐窗口',
      }
      newActions.push(action)
      newScore -= 100
      newCombo = 0

      newFloatingScores.push({
        id: genId(),
        x: 600,
        y: 400,
        points: -100,
        type: 'error',
        createdAt: Date.now(),
      })
    }

    if (targetWindow.queue.length >= targetWindow.maxQueue) {
      const action: ActionLog = {
        id: genId(),
        timestamp: state.elapsedTime,
        type: 'warning',
        category: 'window_congestion',
        action: `${targetWindow.name}已满${targetWindow.maxQueue}人，造成拥堵！`,
        details: { windowId, queueLength: targetWindow.queue.length, maxQueue: targetWindow.maxQueue },
        points: -50,
        orderId: order.id,
        source: '取餐窗口',
      }
      newActions.push(action)
      newScore -= 50
    }

    if (isCorrect) {
      newCombo += 1
      const comboMultiplier = newCombo >= 10 ? 2 : newCombo >= 5 ? 1.5 : 1
      const points = Math.round(100 * comboMultiplier)
      newScore += points

      const action: ActionLog = {
        id: genId(),
        timestamp: state.elapsedTime,
        type: 'correct',
        category: 'correct_delivery',
        action: `✅ 正确交付${order.grade}订单${comboMultiplier > 1 ? `(${comboMultiplier}x连击!)` : ''}`,
        details: { orderId: order.id, grade: order.grade, combo: newCombo, points },
        points,
        orderId: order.id,
        source: '备餐台',
      }
      newActions.push(action)

      if (newCombo >= 5 && newCombo % 5 === 0) {
        const comboAction: ActionLog = {
          id: genId(),
          timestamp: state.elapsedTime,
          type: 'correct',
          category: 'combo',
          action: `🔥 ${newCombo}连击！倍率${comboMultiplier}x`,
          details: { combo: newCombo, multiplier: comboMultiplier },
          points: 0,
          source: '连击系统',
        }
        newActions.push(comboAction)
      }

      newFloatingScores.push({
        id: genId(),
        x: 600,
        y: 400,
        points,
        type: 'correct',
        createdAt: Date.now(),
      })
    }

    const newOrders = state.orders.map(o =>
      o.id === order.id ? { ...o, status: 'delivered' as const } : o
    )

    const newPrepSlots = state.prepSlots.map(s => {
      if (s.orderId === order.id) {
        return { ...s, orderId: null, progress: 0 }
      }
      return s
    })

    const newWindows = state.windows.map(w => {
      if (w.id === windowId) {
        return { ...w, queue: [...w.queue, order.id] }
      }
      return w
    })

    set({
      orders: newOrders,
      prepSlots: newPrepSlots,
      windows: newWindows,
      actions: newActions,
      score: newScore,
      combo: newCombo,
      selectedOrderId: null,
      floatingScores: newFloatingScores,
    })
  },

  pauseGame: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },

  resumeGame: () => {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },

  endGame: () => {
    set({ phase: 'ended' })
  },

  clearFloatingScore: (id: string) => {
    set({ floatingScores: get().floatingScores.filter(f => f.id !== id) })
  },

  getSession: () => {
    const state = get()
    return {
      id: state.sessionId,
      levelId: state.levelId || '',
      startTime: Date.now() - state.elapsedTime * 1000,
      endTime: Date.now(),
      score: state.score,
      maxScore: state.orders.filter(o => o.status === 'delivered').length * 100 * 2,
      actions: state.actions,
      orders: state.orders,
      replay: state.replay,
      finalReport: null,
    }
  },

  getReport: () => {
    const state = get()
    return generateReport(state.sessionId, state.levelId || '', state.orders, state.actions)
  },
}))
