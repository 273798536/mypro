import type {
  GameSession, Ship, Port, TideTable, TideEntry,
  ResourceLock, DispatchAction, ConflictRecord, DeductionRecord, RouteSegment,
} from '@/types/game'
import { create } from 'zustand'
import { mockShips, mockPorts, mockTideTables, INITIAL_ROUNDS } from '@/data/mockData'

interface GameState {
  session: GameSession
  ships: Ship[]
  ports: Port[]
  tideTables: TideTable[]
  resourceLocks: ResourceLock[]
  dispatchHistory: DispatchAction[]
  conflicts: ConflictRecord[]
  deductions: DeductionRecord[]
  routeSegments: RouteSegment[]

  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  restartGame: () => void
  nextRound: () => void

  dispatchShip: (shipId: string, toPortId: string) => void
  resolveConflict: (conflictId: string, resolution: ConflictRecord['resolution'], reason: string) => void
  lockResource: (lock: Omit<ResourceLock, 'id'>) => void
  unlockResource: (lockId: string) => void

  getShipById: (id: string) => Ship | undefined
  getPortById: (id: string) => Port | undefined
  getTideForPort: (portId: string) => TideTable | undefined
  getTideEntry: (portId: string, round: number) => TideEntry | undefined
  getConflictsForRound: (round: number) => ConflictRecord[]
  getDeductionsForRound: (round: number) => DeductionRecord[]
  getLocksForShip: (shipId: string) => ResourceLock[]
  isPortDockable: (portId: string, round: number) => boolean
  hasTideMissing: (portId: string, round: number) => boolean
  calculateFuelCost: (shipId: string, fromPortId: string, toPortId: string) => number
  calculateTotalDeduction: () => number
  generateReport: () => string
}

const createSession = (): GameSession => ({
  id: crypto.randomUUID(),
  status: 'playing',
  currentRound: 1,
  totalRounds: INITIAL_ROUNDS,
  tideCycle: 0,
  createdAt: Date.now(),
  pausedAt: null,
})

export const useGameStore = create<GameState>((set, get) => ({
  session: createSession(),
  ships: JSON.parse(JSON.stringify(mockShips)),
  ports: JSON.parse(JSON.stringify(mockPorts)),
  tideTables: JSON.parse(JSON.stringify(mockTideTables)),
  resourceLocks: [],
  dispatchHistory: [],
  conflicts: [],
  deductions: [],
  routeSegments: [],

  startGame: () => {
    set({
      session: createSession(),
      ships: JSON.parse(JSON.stringify(mockShips)),
      ports: JSON.parse(JSON.stringify(mockPorts)),
      tideTables: JSON.parse(JSON.stringify(mockTideTables)),
      resourceLocks: [],
      dispatchHistory: [],
      conflicts: [],
      deductions: [],
      routeSegments: [],
    })
  },

  pauseGame: () => {
    set(s => ({
      session: { ...s.session, status: 'paused', pausedAt: Date.now() },
    }))
  },

  resumeGame: () => {
    set(s => ({
      session: { ...s.session, status: 'playing', pausedAt: null },
    }))
  },

  restartGame: () => {
    set({
      session: createSession(),
      ships: JSON.parse(JSON.stringify(mockShips)),
      ports: JSON.parse(JSON.stringify(mockPorts)),
      tideTables: JSON.parse(JSON.stringify(mockTideTables)),
      resourceLocks: [],
      dispatchHistory: [],
      conflicts: [],
      deductions: [],
      routeSegments: [],
    })
  },

  nextRound: () => {
    const { session, ships, ports, tideTables } = get()
    if (session.currentRound >= session.totalRounds) {
      set(s => ({ session: { ...s.session, status: 'finished' } }))
      return
    }
    const newRound = session.currentRound + 1
    const newTideCycle = Math.floor((newRound - 1) / 4) + 1

    const updatedShips = ships.map(ship => {
      if (ship.status === 'sailing') {
        const action = get().dispatchHistory.find(
          a => a.shipId === ship.id && a.round === session.currentRound
        )
        if (action) {
          const targetPort = ports.find(p => p.id === action.toPortId)
          return {
            ...ship,
            currentPortId: action.toPortId,
            position: targetPort ? { ...targetPort.position } : ship.position,
            status: 'idle' as const,
            fuel: ship.fuel - action.fuelCost,
          }
        }
      }
      return ship
    })

    const locksToRelease = get().resourceLocks.filter(l => l.round < newRound - 1)
    const updatedLocks = get().resourceLocks.filter(l => l.round >= newRound - 1)

    const updatedPorts = ports.map(port => {
      const releasedBerthIds = locksToRelease
        .filter(l => l.type === 'berth' && l.resourceId.startsWith(port.id))
        .map(l => l.resourceId)
      return {
        ...port,
        berths: port.berths.map(b => {
          if (releasedBerthIds.includes(b.id)) {
            return { ...b, status: 'available' as const, currentShipId: null }
          }
          return b
        }),
      }
    })

    set({
      session: { ...session, currentRound: newRound, tideCycle: newTideCycle },
      ships: updatedShips,
      ports: updatedPorts,
      resourceLocks: updatedLocks,
    })

    tideTables.forEach(tt => {
      const missing = tt.missingRanges.find(
        mr => mr.startRound <= newRound && mr.endRound >= newRound
      )
      if (missing) {
        const deduction: DeductionRecord = {
          id: crypto.randomUUID(),
          round: newRound,
          actionId: '',
          type: 'missed_tide',
          points: 15,
          reason: `港口 ${get().getPortById(tt.portId)?.name ?? tt.portId} 潮汐数据缺失（${missing.reason}），第${missing.startRound}-${missing.endRound}回合`,
          relatedActionId: '',
          relatedRecordType: 'tide',
          relatedRecordId: tt.portId,
        }
        set(s => ({ deductions: [...s.deductions, deduction] }))
      }
    })
  },

  dispatchShip: (shipId, toPortId) => {
    const { session, ships, ports } = get()
    const ship = ships.find(s => s.id === shipId)
    const fromPort = ports.find(p => p.id === ship?.currentPortId)
    const toPort = ports.find(p => p.id === toPortId)
    if (!ship || !fromPort || !toPort) return

    const fuelCost = get().calculateFuelCost(shipId, fromPort.id, toPortId)
    const tideEntry = get().getTideEntry(toPortId, session.currentRound)
    const tideMatched = tideEntry ? tideEntry.dockable : false

    const newConflicts: ConflictRecord[] = []

    const berth = toPort.berths.find(b => b.status === 'available')
    if (!berth) {
      newConflicts.push({
        id: crypto.randomUUID(),
        actionId: '',
        type: 'berth_collision',
        shipCardValue: `${ship.name} 需要泊位`,
        dockGridValue: `${toPort.name} 无可用泊位`,
        fieldName: '泊位可用性',
        resolution: 'unresolved',
        resolutionReason: '',
        round: session.currentRound,
      })
    }

    if (ship.fuel < fuelCost) {
      newConflicts.push({
        id: crypto.randomUUID(),
        actionId: '',
        type: 'fuel_shortage',
        shipCardValue: `剩余燃油 ${ship.fuel}`,
        dockGridValue: `需要燃油 ${fuelCost}`,
        fieldName: '燃油',
        resolution: 'unresolved',
        resolutionReason: '',
        round: session.currentRound,
      })
    }

    if (tideEntry && !tideEntry.dockable) {
      newConflicts.push({
        id: crypto.randomUUID(),
        actionId: '',
        type: 'tide_mismatch',
        shipCardValue: `船舶计划第${session.currentRound}回合抵达`,
        dockGridValue: `潮汐状态: ${tideEntry.type}，不可停靠`,
        fieldName: '潮汐窗口',
        resolution: 'unresolved',
        resolutionReason: '',
        round: session.currentRound,
      })
    }

    const action: DispatchAction = {
      id: crypto.randomUUID(),
      round: session.currentRound,
      shipId,
      fromPortId: fromPort.id,
      toPortId,
      fuelCost,
      cargoChange: [],
      tideWindowMatched: tideMatched,
      conflicts: newConflicts,
      timestamp: Date.now(),
    }

    newConflicts.forEach(c => { c.actionId = action.id })

    if (!tideMatched) {
      const deduction: DeductionRecord = {
        id: crypto.randomUUID(),
        round: session.currentRound,
        actionId: action.id,
        type: 'missed_tide',
        points: 10,
        reason: `${ship.name} 在第${session.currentRound}回合抵达 ${toPort.name} 时错过潮汐窗口`,
        relatedActionId: action.id,
        relatedRecordType: 'dispatch',
        relatedRecordId: action.id,
      }
      set(s => ({ deductions: [...s.deductions, deduction] }))
    }

    if (ship.fuel < fuelCost) {
      const deduction: DeductionRecord = {
        id: crypto.randomUUID(),
        round: session.currentRound,
        actionId: action.id,
        type: 'fuel_overrun',
        points: 20,
        reason: `${ship.name} 燃油不足（需要${fuelCost}，剩余${ship.fuel}）`,
        relatedActionId: action.id,
        relatedRecordType: 'dispatch',
        relatedRecordId: action.id,
      }
      set(s => ({ deductions: [...s.deductions, deduction] }))
    }

    const segment: RouteSegment = {
      shipId,
      fromPortId: fromPort.id,
      toPortId,
      round: session.currentRound,
      positions: [
        { ...fromPort.position },
        { ...toPort.position },
      ],
    }

    set(s => ({
      ships: s.ships.map(sh =>
        sh.id === shipId ? { ...sh, status: 'sailing' as const } : sh
      ),
      dispatchHistory: [...s.dispatchHistory, action],
      conflicts: [...s.conflicts, ...newConflicts],
      routeSegments: [...s.routeSegments, segment],
    }))

    if (berth && tideMatched && ship.fuel >= fuelCost) {
      get().lockResource({
        type: 'berth',
        resourceId: berth.id,
        shipId,
        round: session.currentRound,
        reason: `${ship.name} 预定泊位，第${session.currentRound}回合抵达`,
        unlockCondition: '船舶离港或回合结束后自动释放',
      })
      get().lockResource({
        type: 'fuel',
        resourceId: `fuel_${shipId}`,
        shipId,
        round: session.currentRound,
        reason: `锁定燃油${fuelCost}单位用于 ${fromPort.name}→${toPort.name} 航行`,
        unlockCondition: '航行完成后扣除',
      })
    }
  },

  resolveConflict: (conflictId, resolution, reason) => {
    set(s => ({
      conflicts: s.conflicts.map(c =>
        c.id === conflictId ? { ...c, resolution, resolutionReason: reason } : c
      ),
    }))
    const conflict = get().conflicts.find(c => c.id === conflictId)
    if (conflict && conflict.resolution !== 'unresolved') {
      const deduction = get().deductions.find(
        d => d.relatedRecordId === conflict.id && d.type === 'conflict_unresolved'
      )
      if (!deduction) {
        set(s => ({
          deductions: [...s.deductions, {
            id: crypto.randomUUID(),
            round: conflict.round,
            actionId: conflict.actionId,
            type: 'conflict_unresolved' as const,
            points: 5,
            reason: `冲突"${conflict.fieldName}"已裁决：${reason}`,
            relatedActionId: conflict.actionId,
            relatedRecordType: 'conflict' as const,
            relatedRecordId: conflictId,
          }],
        }))
      }
    }
  },

  lockResource: (lock) => {
    const fullLock: ResourceLock = { ...lock, id: crypto.randomUUID() }
    set(s => ({ resourceLocks: [...s.resourceLocks, fullLock] }))
  },

  unlockResource: (lockId) => {
    set(s => ({ resourceLocks: s.resourceLocks.filter(l => l.id !== lockId) }))
  },

  getShipById: (id) => get().ships.find(s => s.id === id),
  getPortById: (id) => get().ports.find(p => p.id === id),
  getTideForPort: (portId) => get().tideTables.find(t => t.portId === portId),
  getTideEntry: (portId, round) => {
    const table = get().tideTables.find(t => t.portId === portId)
    return table?.entries.find(e => e.round === round)
  },
  getConflictsForRound: (round) => get().conflicts.filter(c => c.round === round),
  getDeductionsForRound: (round) => get().deductions.filter(d => d.round === round),
  getLocksForShip: (shipId) => get().resourceLocks.filter(l => l.shipId === shipId),

  isPortDockable: (portId, round) => {
    const entry = get().getTideEntry(portId, round)
    return entry ? entry.dockable : false
  },

  hasTideMissing: (portId, round) => {
    const table = get().tideTables.find(t => t.portId === portId)
    if (!table) return true
    return table.missingRanges.some(mr => mr.startRound <= round && mr.endRound >= round)
  },

  calculateFuelCost: (shipId, fromPortId, toPortId) => {
    const ship = get().ships.find(s => s.id === shipId)
    const fromPort = get().ports.find(p => p.id === fromPortId)
    const toPort = get().ports.find(p => p.id === toPortId)
    if (!ship || !fromPort || !toPort) return Infinity
    const dx = toPort.position.x - fromPort.position.x
    const dy = toPort.position.y - fromPort.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return Math.ceil(distance * 2)
  },

  calculateTotalDeduction: () => {
    return get().deductions.reduce((sum, d) => sum + d.points, 0)
  },

  generateReport: () => {
    const { session, dispatchHistory, conflicts, deductions, resourceLocks, ships, ports } = get()
    const lines: string[] = []
    lines.push('═══════════════════════════════════════')
    lines.push('        海岛港口补给棋 · 调度报告')
    lines.push('═══════════════════════════════════════')
    lines.push('')
    lines.push(`游戏ID: ${session.id}`)
    lines.push(`状态: ${session.status === 'finished' ? '已结束' : '进行中'}`)
    lines.push(`回合: ${session.currentRound}/${session.totalRounds}`)
    lines.push(`潮汐周期: ${session.tideCycle}`)
    lines.push('')

    lines.push('── 调度记录 ──')
    dispatchHistory.forEach(a => {
      const ship = ships.find(s => s.id === a.shipId)
      const from = ports.find(p => p.id === a.fromPortId)
      const to = ports.find(p => p.id === a.toPortId)
      lines.push(`  回合${a.round}: ${ship?.name ?? a.shipId} ${from?.name ?? a.fromPortId}→${to?.name ?? a.toPortId} | 燃油消耗:${a.fuelCost} | 潮汐匹配:${a.tideWindowMatched ? '是' : '否'}`)
    })
    lines.push('')

    lines.push('── 资源锁定口径 ──')
    resourceLocks.forEach(l => {
      const ship = ships.find(s => s.id === l.shipId)
      lines.push(`  [${l.type}] ${ship?.name ?? l.shipId} | 原因: ${l.reason} | 解锁条件: ${l.unlockCondition}`)
    })
    lines.push('')

    lines.push('── 冲突裁决记录 ──')
    conflicts.forEach(c => {
      lines.push(`  回合${c.round} | ${c.fieldName}: 船舶卡=${c.shipCardValue} 码头格=${c.dockGridValue} | 裁决:${c.resolution} | 理由:${c.resolutionReason || '未裁决'}`)
    })
    lines.push('')

    lines.push('── 扣分明细 ──')
    deductions.forEach(d => {
      lines.push(`  回合${d.round} | ${d.type} | -${d.points}分 | ${d.reason}`)
    })
    lines.push('')
    lines.push(`总扣分: ${get().calculateTotalDeduction()}`)
    lines.push('═══════════════════════════════════════')

    return lines.join('\n')
  },
}))
