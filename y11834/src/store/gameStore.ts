import { create } from 'zustand'
import type { Tug, Berth, Ship, Dispatch, FeedbackItem, GamePhase, FailReason, GameScores } from '@/types'
import { INITIAL_TUGS, INITIAL_BERTHS, INITIAL_SHIPS, FUEL_COST_PER_DISPATCH, TUG_RETURN_TIME, TIME_STEP, GAME_START, GAME_END } from '@/data/sampleData'
import { validateDispatch, checkTideWindowExpired } from '@/engine/dispatchEngine'
import { FAIL_REASON_LABELS } from '@/types'

interface GameState {
  phase: GamePhase
  currentTime: number
  tugs: Tug[]
  berths: Berth[]
  ships: Ship[]
  dispatches: Dispatch[]
  feedbacks: FeedbackItem[]
  autoPlay: boolean

  advanceTime: () => void
  dispatchShip: (shipId: string, tugIds: string[], berthId: string) => void
  toggleAutoPlay: () => void
  resetGame: () => void
  dismissFeedback: (id: string) => void
  getScores: () => GameScores
  getFailuresByType: () => Record<FailReason, FeedbackItem[]>
}

let feedbackCounter = 0
let dispatchCounter = 0

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'playing',
  currentTime: GAME_START,
  tugs: JSON.parse(JSON.stringify(INITIAL_TUGS)),
  berths: JSON.parse(JSON.stringify(INITIAL_BERTHS)),
  ships: JSON.parse(JSON.stringify(INITIAL_SHIPS)),
  dispatches: [],
  feedbacks: [],
  autoPlay: false,

  advanceTime: () => {
    const state = get()
    if (state.phase !== 'playing') return

    const newTime = state.currentTime + TIME_STEP
    if (newTime > GAME_END) {
      set({ phase: 'finished' })
      return
    }

    const newShips = state.ships.map(s => {
      if (s.status === 'waiting' && s.arrivalTime <= newTime) {
        return { ...s, status: 'arrived' as const }
      }
      return s
    })

    const newTugs = state.tugs.map(t => {
      if (t.status === 'busy' && t.busyUntil <= newTime) {
        return { ...t, status: 'idle' as const, busyUntil: 0 }
      }
      return t
    })

    const newBerths = state.berths.map(b => {
      if (b.status === 'occupied' && b.occupiedUntil <= newTime) {
        return { ...b, status: 'empty' as const, occupiedBy: null, occupiedUntil: 0 }
      }
      return b
    })

    const completedShipIds: string[] = []
    const updatedShips = newShips.map(s => {
      if (s.status === 'dispatched') {
        const disp = state.dispatches.find(d => d.shipId === s.id && d.status === 'success')
        if (disp && newTime >= disp.dispatchTime + s.operationDuration) {
          completedShipIds.push(s.id)
          return { ...s, status: 'completed' as const }
        }
      }
      return s
    })

    const expiredShips = checkTideWindowExpired(updatedShips, newTime)
    const newFeedbacks = [...state.feedbacks]
    const failedShipIds: string[] = []

    for (const exp of expiredShips) {
      const ship = updatedShips.find(s => s.id === exp.shipId)
      if (ship) {
        const shipIdx = updatedShips.findIndex(s => s.id === exp.shipId)
        updatedShips[shipIdx] = { ...ship, status: 'failed' as const }
        failedShipIds.push(exp.shipId)
        feedbackCounter++
        newFeedbacks.push({
          id: `fb-${feedbackCounter}`,
          timestamp: newTime,
          shipName: exp.shipName,
          reason: 'tide_missed',
          message: `${exp.shipName} 潮汐窗口已关闭，调度失败`,
        })
      }
    }

    const allResolved = updatedShips.every(s => s.status === 'completed' || s.status === 'failed')
    const newPhase = allResolved || newTime >= GAME_END ? 'finished' : 'playing'

    set({
      currentTime: newTime,
      ships: updatedShips,
      tugs: newTugs,
      berths: newBerths,
      feedbacks: newFeedbacks,
      phase: newPhase,
    })
  },

  dispatchShip: (shipId, tugIds, berthId) => {
    const state = get()
    const ship = state.ships.find(s => s.id === shipId)
    if (!ship || ship.status !== 'arrived') return

    const selectedTugs = state.tugs.filter(t => tugIds.includes(t.id))
    const berth = state.berths.find(b => b.id === berthId)
    if (!berth || selectedTugs.length !== ship.requiredTugs) return

    const validation = validateDispatch(ship, selectedTugs, berth, state.currentTime)
    dispatchCounter++
    const newDispatch: Dispatch = {
      id: `disp-${dispatchCounter}`,
      shipId,
      tugIds,
      berthId,
      dispatchTime: state.currentTime,
      status: validation.valid ? 'success' : 'failed',
      failReasons: validation.reasons,
    }

    const newFeedbacks = [...state.feedbacks]

    if (validation.valid) {
      const newTugs = state.tugs.map(t => {
        if (tugIds.includes(t.id)) {
          return {
            ...t,
            status: 'busy' as const,
            currentFuel: t.currentFuel - FUEL_COST_PER_DISPATCH,
            busyUntil: state.currentTime + ship.operationDuration + TUG_RETURN_TIME,
          }
        }
        return t
      })

      const newBerths = state.berths.map(b => {
        if (b.id === berthId) {
          return {
            ...b,
            status: 'occupied' as const,
            occupiedBy: shipId,
            occupiedUntil: state.currentTime + ship.operationDuration,
          }
        }
        return b
      })

      const newShips = state.ships.map(s => {
        if (s.id === shipId) return { ...s, status: 'dispatched' as const }
        return s
      })

      feedbackCounter++
      newFeedbacks.push({
        id: `fb-${feedbackCounter}`,
        timestamp: state.currentTime,
        shipName: ship.name,
        reason: 'tide_missed',
        message: `✓ ${ship.name} 调度成功！拖轮 ${selectedTugs.map(t => t.name).join('、')} → ${berth.name}`,
      })

      set({
        tugs: newTugs,
        berths: newBerths,
        ships: newShips,
        dispatches: [...state.dispatches, newDispatch],
        feedbacks: newFeedbacks,
      })
    } else {
      for (let i = 0; i < validation.reasons.length; i++) {
        feedbackCounter++
        newFeedbacks.push({
          id: `fb-${feedbackCounter}`,
          timestamp: state.currentTime,
          shipName: ship.name,
          reason: validation.reasons[i],
          message: `✗ ${ship.name}：${validation.messages[i]}`,
        })
      }

      set({
        dispatches: [...state.dispatches, newDispatch],
        feedbacks: newFeedbacks,
      })
    }
  },

  toggleAutoPlay: () => set(s => ({ autoPlay: !s.autoPlay })),
  resetGame: () => {
    feedbackCounter = 0
    dispatchCounter = 0
    set({
      phase: 'playing',
      currentTime: GAME_START,
      tugs: JSON.parse(JSON.stringify(INITIAL_TUGS)),
      berths: JSON.parse(JSON.stringify(INITIAL_BERTHS)),
      ships: JSON.parse(JSON.stringify(INITIAL_SHIPS)),
      dispatches: [],
      feedbacks: [],
      autoPlay: false,
    })
  },
  dismissFeedback: (id) => set(s => ({
    feedbacks: s.feedbacks.filter(f => f.id !== id),
  })),
  getScores: () => {
    const state = get()
    const totalShips = state.ships.length
    const completedInTide = state.dispatches.filter(
      d => d.status === 'success' && state.ships.find(s => s.id === d.shipId)
    ).length
    const tideManagement = totalShips > 0 ? Math.round((completedInTide / totalShips) * 100) : 0

    const totalAvailableMinutes = state.tugs.length * (GAME_END - GAME_START)
    let totalWorkMinutes = 0
    for (const d of state.dispatches) {
      if (d.status === 'success') {
        const ship = state.ships.find(s => s.id === d.shipId)
        if (ship) totalWorkMinutes += d.tugIds.length * (ship.operationDuration + TUG_RETURN_TIME)
      }
    }
    const tugUtilization = totalAvailableMinutes > 0 ? Math.round((totalWorkMinutes / totalAvailableMinutes) * 100) : 0

    const initialFuel = INITIAL_TUGS.reduce((sum, t) => sum + t.maxFuel, 0)
    const currentFuel = state.tugs.reduce((sum, t) => sum + t.currentFuel, 0)
    const fuelManagement = initialFuel > 0 ? Math.round((currentFuel / initialFuel) * 100) : 0

    const totalBerthMinutes = state.berths.length * (GAME_END - GAME_START)
    let totalOccupiedMinutes = 0
    for (const d of state.dispatches) {
      if (d.status === 'success') {
        const ship = state.ships.find(s => s.id === d.shipId)
        if (ship) totalOccupiedMinutes += ship.operationDuration
      }
    }
    const berthTurnover = totalBerthMinutes > 0 ? Math.min(100, Math.round((totalOccupiedMinutes / totalBerthMinutes) * 100)) : 0

    return { tideManagement, tugUtilization, fuelManagement, berthTurnover }
  },
  getFailuresByType: () => {
    const state = get()
    const result: Record<FailReason, FeedbackItem[]> = {
      tide_missed: [],
      tug_conflict: [],
      fuel_shortage: [],
      berth_occupied: [],
    }
    for (const fb of state.feedbacks) {
      if (fb.message.startsWith('✗')) {
        result[fb.reason].push(fb)
      }
    }
    return result
  },
}))
