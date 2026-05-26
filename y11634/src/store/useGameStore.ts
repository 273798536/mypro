import { create } from 'zustand'
import type {
  GameState,
  Cart,
  Track,
  Junction,
  Station,
  GameEvent,
  OperationRecord,
  ScoreEntry,
} from '../types/game'
import { GAME_CONFIG, COLORS, CANVAS_CONFIG } from '../utils/constants'

const generateId = () => Math.random().toString(36).substring(2, 9)

const createInitialTracks = (): Track[] => {
  const { WIDTH, HEIGHT } = CANVAS_CONFIG
  const cx = WIDTH / 2
  const cy = HEIGHT / 2

  return [
    {
      id: 'track-1',
      type: 'straight',
      from: { x: 50, y: cy },
      to: { x: 200, y: cy },
      blocked: false,
      connectedTo: ['track-2', 'track-3'],
    },
    {
      id: 'track-2',
      type: 'straight',
      from: { x: 200, y: cy },
      to: { x: 400, y: cy - 100 },
      blocked: false,
      connectedTo: ['track-1', 'track-5'],
    },
    {
      id: 'track-3',
      type: 'straight',
      from: { x: 200, y: cy },
      to: { x: 400, y: cy + 100 },
      blocked: false,
      connectedTo: ['track-1', 'track-6'],
    },
    {
      id: 'track-4',
      type: 'straight',
      from: { x: cx, y: cy },
      to: { x: 650, y: cy },
      blocked: false,
      connectedTo: ['track-5', 'track-6', 'track-7'],
    },
    {
      id: 'track-5',
      type: 'straight',
      from: { x: 400, y: cy - 100 },
      to: { x: cx, y: cy },
      blocked: false,
      connectedTo: ['track-2', 'track-4'],
    },
    {
      id: 'track-6',
      type: 'straight',
      from: { x: 400, y: cy + 100 },
      to: { x: cx, y: cy },
      blocked: false,
      connectedTo: ['track-3', 'track-4'],
    },
    {
      id: 'track-7',
      type: 'straight',
      from: { x: 650, y: cy },
      to: { x: 800, y: cy },
      blocked: false,
      connectedTo: ['track-4'],
    },
    {
      id: 'track-8',
      type: 'curve',
      from: { x: 800, y: cy },
      to: { x: 800, y: cy + 100 },
      blocked: false,
      connectedTo: ['track-7', 'track-9'],
    },
    {
      id: 'track-9',
      type: 'straight',
      from: { x: 800, y: cy + 100 },
      to: { x: 400, y: cy + 100 },
      blocked: false,
      connectedTo: ['track-8', 'track-3'],
    },
  ]
}

const createInitialJunctions = (): Junction[] => {
  const { HEIGHT } = CANVAS_CONFIG
  const cy = HEIGHT / 2

  return [
    {
      id: 'junction-1',
      position: { x: 200, y: cy },
      activeTrack: 'track-2',
      availableTracks: ['track-2', 'track-3'],
    },
    {
      id: 'junction-2',
      position: { x: CANVAS_CONFIG.WIDTH / 2, y: cy },
      activeTrack: 'track-5',
      availableTracks: ['track-5', 'track-6'],
    },
  ]
}

const createInitialStations = (): Station[] => {
  const { HEIGHT } = CANVAS_CONFIG
  const cy = HEIGHT / 2

  return [
    {
      id: 'station-ore',
      type: 'ore',
      position: { x: 50, y: cy },
      capacity: 500,
      current: 200,
      connectedTrackIds: ['track-1'],
    },
    {
      id: 'station-energy',
      type: 'energy',
      position: { x: 800, y: cy + 100 },
      capacity: 100,
      current: 100,
      connectedTrackIds: ['track-9'],
    },
    {
      id: 'station-warehouse',
      type: 'warehouse',
      position: { x: 800, y: cy },
      capacity: 500,
      current: 0,
      connectedTrackIds: ['track-7'],
    },
  ]
}

const createInitialCarts = (): Cart[] => {
  const { HEIGHT } = CANVAS_CONFIG
  const cy = HEIGHT / 2

  return [
    {
      id: 'cart-1',
      position: { x: 100, y: cy },
      trackId: 'track-1',
      direction: 'forward',
      progress: 0.3,
      speed: GAME_CONFIG.CART_SPEED,
      cargo: 0,
      maxCargo: 50,
      status: 'moving',
      color: COLORS.CART_COLORS[0],
    },
    {
      id: 'cart-2',
      position: { x: 500, y: cy - 50 },
      trackId: 'track-2',
      direction: 'forward',
      progress: 0.5,
      speed: GAME_CONFIG.CART_SPEED,
      cargo: 30,
      maxCargo: 50,
      status: 'moving',
      color: COLORS.CART_COLORS[1],
    },
  ]
}

const getInitialState = (): GameState => ({
  status: 'idle',
  time: 0,
  score: 0,
  energy: GAME_CONFIG.INITIAL_ENERGY,
  maxEnergy: GAME_CONFIG.MAX_ENERGY,
  ore: 0,
  level: 1,
  carts: createInitialCarts(),
  tracks: createInitialTracks(),
  junctions: createInitialJunctions(),
  stations: createInitialStations(),
  events: [],
  operationHistory: [],
  scoreHistory: [],
  targetOre: GAME_CONFIG.TARGET_ORE,
  timeLimit: GAME_CONFIG.TIME_LIMIT,
})

interface GameActions {
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: (reason: string) => void
  resetGame: () => void
  switchJunction: (junctionId: string) => void
  updateGame: (deltaTime: number) => void
  addEvent: (event: Omit<GameEvent, 'id' | 'resolved'>) => void
  addScore: (entry: Omit<ScoreEntry, 'id'>) => void
  recordOperation: (record: Omit<OperationRecord, 'id'>) => void
  setBlockedTrack: (trackId: string, blocked: boolean, reason?: string) => void
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...getInitialState(),

  startGame: () => set({ status: 'playing' }),

  pauseGame: () => set({ status: 'paused' }),

  resumeGame: () => set({ status: 'playing' }),

  endGame: (reason: string) => set({ status: 'ended', endReason: reason }),

  resetGame: () => set(getInitialState()),

  switchJunction: (junctionId: string) => {
    const state = get()
    if (state.status !== 'playing') return

    const junction = state.junctions.find((j) => j.id === junctionId)
    if (!junction) return

    if (state.energy < GAME_CONFIG.JUNCTION_SWITCH_COST) {
      get().addEvent({
        type: 'energy_low',
        time: state.time,
        data: { junctionId },
        message: '能量不足，无法切换岔口！',
      })
      get().recordOperation({
        time: state.time,
        type: 'junction_switch',
        data: { junctionId, reason: 'energy_low' },
        result: 'failed',
        scoreChange: 0,
        message: `切换岔口 ${junctionId} 失败：能量不足`,
      })
      return
    }

    const currentIndex = junction.availableTracks.indexOf(junction.activeTrack)
    const nextIndex = (currentIndex + 1) % junction.availableTracks.length
    const nextTrack = junction.availableTracks[nextIndex]

    set((state) => ({
      energy: state.energy - GAME_CONFIG.JUNCTION_SWITCH_COST,
      junctions: state.junctions.map((j) =>
        j.id === junctionId ? { ...j, activeTrack: nextTrack } : j
      ),
    }))

    get().recordOperation({
      time: state.time,
      type: 'junction_switch',
      data: { junctionId, fromTrack: junction.activeTrack, toTrack: nextTrack },
      result: 'success',
      scoreChange: 0,
      message: `切换岔口 ${junctionId}: ${junction.activeTrack} → ${nextTrack}`,
    })
  },

  updateGame: (deltaTime: number) => {
    const state = get()
    if (state.status !== 'playing') return

    set((state) => ({ time: state.time + deltaTime }))

    const newEnergy = Math.max(0, state.energy - GAME_CONFIG.CART_MOVE_COST * deltaTime * state.carts.length)
    set({ energy: newEnergy })

    if (newEnergy <= 0) {
      get().endGame('能量耗尽')
      get().addScore({
        time: state.time,
        amount: GAME_CONFIG.ENERGY_DEPLETED_PENALTY,
        reason: '能量耗尽',
        category: 'penalty',
      })
      return
    }

    if (newEnergy <= 20) {
      const hasRecentWarning = state.events.some(
        (e) => e.type === 'energy_low' && !e.resolved && state.time - e.time < 5
      )
      if (!hasRecentWarning) {
        get().addEvent({
          type: 'energy_low',
          time: state.time,
          data: { currentEnergy: newEnergy },
          message: '警告：能量不足 20%！请尽快前往能量站补充',
        })
      }
    }

    if (Math.random() < 0.002 * deltaTime) {
      const availableTracks = state.tracks.filter((t) => !t.blocked)
      if (availableTracks.length > 0) {
        const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
        get().setBlockedTrack(randomTrack.id, true, '陨石撞击')
        get().addEvent({
          type: 'meteor',
          time: state.time,
          data: { trackId: randomTrack.id },
          message: `警告：陨石撞击轨道 ${randomTrack.id}！请绕行`,
        })
        get().addScore({
          time: state.time,
          amount: GAME_CONFIG.METEOR_DAMAGE_PENALTY,
          reason: `陨石撞击轨道 ${randomTrack.id}`,
          category: 'penalty',
        })

        setTimeout(() => {
          get().setBlockedTrack(randomTrack.id, false)
        }, 10000)
      }
    }

    set((state) => ({
      carts: state.carts.map((cart) => {
        if (cart.status !== 'moving') return cart

        let newProgress = cart.progress + cart.speed * deltaTime * 60

        if (newProgress >= 1) {
          newProgress = 0
          const track = state.tracks.find((t) => t.id === cart.trackId)
          if (!track) return cart

          const junction = state.junctions.find((j) =>
            j.availableTracks.includes(cart.trackId)
          )

          let nextTrackId: string | undefined
          if (junction && track.to.x === junction.position.x && track.to.y === junction.position.y) {
            nextTrackId = junction.activeTrack
          } else {
            nextTrackId = track.connectedTo.find((t) => t !== cart.trackId)
          }

          if (nextTrackId) {
            const nextTrack = state.tracks.find((t) => t.id === nextTrackId)
            if (nextTrack && !nextTrack.blocked) {
              const nextStation = state.stations.find((s) =>
                s.connectedTrackIds.includes(nextTrackId!)
              )

              if (nextStation) {
                if (nextStation.type === 'warehouse' && cart.cargo > 0) {
                  const delivered = cart.cargo
                  set((s) => ({
                    ore: s.ore + delivered,
                    stations: s.stations.map((st) =>
                      st.id === nextStation.id
                        ? { ...st, current: st.current + delivered }
                        : st
                    ),
                  }))

                  const score = GAME_CONFIG.DELIVERY_SCORE_BASE + delivered * 2
                  get().addScore({
                    time: state.time,
                    amount: score,
                    reason: `成功运送 ${delivered} 单位矿石到仓库`,
                    category: 'delivery',
                  })
                  get().addEvent({
                    type: 'delivery',
                    time: state.time,
                    data: { delivered, cartId: cart.id },
                    message: `成功运送 ${delivered} 单位矿石！+${score} 分`,
                  })

                  cart = { ...cart, cargo: 0 }
                } else if (nextStation.type === 'ore' && cart.cargo < cart.maxCargo) {
                  const loadAmount = Math.min(cart.maxCargo - cart.cargo, nextStation.current)
                  set((s) => ({
                    stations: s.stations.map((st) =>
                      st.id === nextStation.id
                        ? { ...st, current: st.current - loadAmount }
                        : st
                    ),
                  }))
                  cart = { ...cart, cargo: cart.cargo + loadAmount }
                } else if (nextStation.type === 'energy') {
                  const chargeAmount = Math.min(
                    GAME_CONFIG.MAX_ENERGY - state.energy,
                    GAME_CONFIG.ENERGY_STATION_CHARGE
                  )
                  set((s) => ({ energy: s.energy + chargeAmount }))
                  get().addEvent({
                    type: 'energy_low',
                    time: state.time,
                    data: { chargeAmount },
                    message: `能量站补充能量 +${chargeAmount}`,
                  })
                }
              }

              return {
                ...cart,
                trackId: nextTrackId,
                progress: 0,
                position: nextTrack.from,
              }
            }
          }
          return cart
        }

        const track = state.tracks.find((t) => t.id === cart.trackId)
        if (track) {
          const newX = track.from.x + (track.to.x - track.from.x) * newProgress
          const newY = track.from.y + (track.to.y - track.from.y) * newProgress
          return {
            ...cart,
            progress: newProgress,
            position: { x: newX, y: newY },
          }
        }

        return cart
      }),
    }))

    const updatedCarts = get().carts
    for (let i = 0; i < updatedCarts.length; i++) {
      for (let j = i + 1; j < updatedCarts.length; j++) {
        const cart1 = updatedCarts[i]
        const cart2 = updatedCarts[j]
        const distance = Math.sqrt(
          Math.pow(cart1.position.x - cart2.position.x, 2) +
          Math.pow(cart1.position.y - cart2.position.y, 2)
        )

        if (distance < CANVAS_CONFIG.CART_RADIUS * 2) {
          get().endGame('矿车碰撞')
          get().addEvent({
            type: 'collision',
            time: state.time,
            data: { cart1: cart1.id, cart2: cart2.id },
            message: `矿车 ${cart1.id} 和 ${cart2.id} 发生碰撞！`,
          })
          get().addScore({
            time: state.time,
            amount: GAME_CONFIG.COLLISION_PENALTY,
            reason: '矿车碰撞事故',
            category: 'penalty',
          })
          return
        }
      }
    }

    const currentState = get()
    if (currentState.ore >= currentState.targetOre) {
      get().endGame('任务完成')
      get().addScore({
        time: state.time,
        amount: 1000,
        reason: '成功完成运输目标',
        category: 'bonus',
      })
    }

    if (currentState.time >= currentState.timeLimit) {
      get().endGame('时间到')
    }
  },

  addEvent: (event) => {
    const newEvent = {
      ...event,
      id: generateId(),
      resolved: false,
    }
    set((state) => ({ events: [...state.events, newEvent] }))

    setTimeout(() => {
      set((state) => ({
        events: state.events.map((e) =>
          e.id === newEvent.id ? { ...e, resolved: true } : e
        ),
      }))
    }, 5000)
  },

  addScore: (entry) => {
    const newEntry = {
      ...entry,
      id: generateId(),
    }
    set((state) => ({
      score: state.score + entry.amount,
      scoreHistory: [...state.scoreHistory, newEntry],
    }))
  },

  recordOperation: (record) => {
    const newRecord = {
      ...record,
      id: generateId(),
    }
    set((state) => ({
      operationHistory: [...state.operationHistory, newRecord],
    }))
  },

  setBlockedTrack: (trackId, blocked, reason) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, blocked, blockedReason: reason } : t
      ),
    }))
  },
}))
