import { create } from 'zustand'
import type { GamePhase, SimulationSpeed, SimulationSnapshot } from '@/types'
import { initSimulation, stepSimulation, enableWindow, addWindow } from '@/utils/simulation'
import type { SimulationState } from '@/utils/simulation'
import type { LevelConfig } from '@/types'
import { generateReport, getWindowConclusion } from '@/utils/report'

interface GameStore {
  phase: GamePhase
  speed: SimulationSpeed
  levelConfig: LevelConfig | null
  sim: SimulationState | null
  timerRef: ReturnType<typeof setInterval> | null
  failureAlert: { reason: string; triggerSource: string; stuckPoint: string; nextStep: string } | null
  currentMetrics: { avgWait: number; maxWait: number; queueLen: number; completed: number; noShow: number }
  windowConclusion: string

  selectLevel: (level: LevelConfig) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  resetSimulation: () => void
  setSpeed: (speed: SimulationSpeed) => void
  stepOnce: () => void
  doEnableWindow: (windowId: number) => void
  doAddWindow: () => void

  getSnapshots: () => SimulationSnapshot[]
  getSessionId: () => string
}

function computeFailureAlert(
  reason: string,
  events: { triggerSource: string; detail: string; tick: number }[]
): { reason: string; triggerSource: string; stuckPoint: string; nextStep: string } {
  const lastEvent = events[events.length - 1]
  const triggerSource = lastEvent?.triggerSource ?? '系统'

  let stuckPoint = '队列中'
  let nextStep = '调整窗口配置后重试'

  if (reason.includes('等待')) {
    stuckPoint = '服务窗口瓶颈'
    nextStep = '增开服务窗口或提高服务率'
  } else if (reason.includes('队列')) {
    stuckPoint = '队列溢出'
    nextStep = '增加窗口数量分流顾客'
  } else if (reason.includes('爽约')) {
    stuckPoint = '预约管理失控'
    nextStep = '调整预约策略或提高到达预测准确性'
  }

  return { reason, triggerSource, stuckPoint, nextStep }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  speed: 1,
  levelConfig: null,
  sim: null,
  timerRef: null,
  failureAlert: null,
  currentMetrics: { avgWait: 0, maxWait: 0, queueLen: 0, completed: 0, noShow: 0 },
  windowConclusion: '',

  selectLevel: (level: LevelConfig) => {
    const { timerRef } = get()
    if (timerRef) clearInterval(timerRef)
    const sim = initSimulation(level)
    set({
      phase: 'idle',
      speed: 1,
      levelConfig: level,
      sim,
      timerRef: null,
      failureAlert: null,
      currentMetrics: { avgWait: 0, maxWait: 0, queueLen: 0, completed: 0, noShow: 0 },
      windowConclusion: '',
    })
  },

  startSimulation: () => {
    const { phase, sim, speed } = get()
    if (phase !== 'idle' || !sim) return

    set({ phase: 'running' })
    const interval = Math.max(100, 1000 / speed)
    const timer = setInterval(() => {
      const state = get()
      if (state.phase !== 'running' || !state.sim) {
        clearInterval(timer)
        return
      }
      const newSim = stepSimulation(state.sim)
      const metrics = newSim.snapshots[newSim.snapshots.length - 1]?.metrics
      let alert = state.failureAlert
      if (newSim.failed) {
        clearInterval(timer)
        alert = computeFailureAlert(newSim.failureReason ?? '未知原因', newSim.events)
        set({
          sim: newSim,
          phase: 'failed',
          timerRef: null,
          failureAlert: alert,
          currentMetrics: metrics
            ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
            : state.currentMetrics,
        })
        return
      }
      if (newSim.completed) {
        clearInterval(timer)
        const report = generateReport(
          `session_${Date.now()}`,
          newSim.levelConfig.id,
          newSim.windowConfig,
          newSim.configHistory,
          metrics ?? newSim.snapshots[0]?.metrics ?? {
            avgWaitTime: 0, maxWaitTime: 0, utilizationRate: [], overallUtilization: 0, noShowCount: 0, completedCount: 0, abandonedCount: 0, queueLength: 0,
          },
          newSim.events,
          newSim.customers
        )
        const conclusion = getWindowConclusion(report)
        set({
          sim: newSim,
          phase: 'completed',
          timerRef: null,
          currentMetrics: metrics
            ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
            : state.currentMetrics,
          windowConclusion: conclusion,
        })
        return
      }
      set({
        sim: newSim,
        currentMetrics: metrics
          ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
          : state.currentMetrics,
      })
    }, interval)
    set({ timerRef: timer })
  },

  pauseSimulation: () => {
    const { timerRef } = get()
    if (timerRef) clearInterval(timerRef)
    set({ phase: 'paused', timerRef: null })
  },

  resumeSimulation: () => {
    const { phase, sim, speed } = get()
    if (phase !== 'paused' || !sim) return
    set({ phase: 'running' })
    const interval = Math.max(100, 1000 / speed)
    const timer = setInterval(() => {
      const state = get()
      if (state.phase !== 'running' || !state.sim) {
        clearInterval(timer)
        return
      }
      const newSim = stepSimulation(state.sim)
      const metrics = newSim.snapshots[newSim.snapshots.length - 1]?.metrics
      let alert = state.failureAlert
      if (newSim.failed) {
        clearInterval(timer)
        alert = computeFailureAlert(newSim.failureReason ?? '未知原因', newSim.events)
        set({
          sim: newSim,
          phase: 'failed',
          timerRef: null,
          failureAlert: alert,
          currentMetrics: metrics
            ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
            : state.currentMetrics,
        })
        return
      }
      if (newSim.completed) {
        clearInterval(timer)
        const report = generateReport(
          `session_${Date.now()}`,
          newSim.levelConfig.id,
          newSim.windowConfig,
          newSim.configHistory,
          metrics ?? newSim.snapshots[0]?.metrics ?? {
            avgWaitTime: 0, maxWaitTime: 0, utilizationRate: [], overallUtilization: 0, noShowCount: 0, completedCount: 0, abandonedCount: 0, queueLength: 0,
          },
          newSim.events,
          newSim.customers
        )
        const conclusion = getWindowConclusion(report)
        set({
          sim: newSim,
          phase: 'completed',
          timerRef: null,
          currentMetrics: metrics
            ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
            : state.currentMetrics,
          windowConclusion: conclusion,
        })
        return
      }
      set({
        sim: newSim,
        currentMetrics: metrics
          ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
          : state.currentMetrics,
      })
    }, interval)
    set({ timerRef: timer })
  },

  resetSimulation: () => {
    const { timerRef, levelConfig } = get()
    if (timerRef) clearInterval(timerRef)
    if (!levelConfig) return
    const sim = initSimulation(levelConfig)
    set({
      phase: 'idle',
      speed: 1,
      sim,
      timerRef: null,
      failureAlert: null,
      currentMetrics: { avgWait: 0, maxWait: 0, queueLen: 0, completed: 0, noShow: 0 },
      windowConclusion: '',
    })
  },

  setSpeed: (speed: SimulationSpeed) => {
    const { phase, timerRef } = get()
    set({ speed })
    if (phase === 'running') {
      if (timerRef) clearInterval(timerRef)
      set({ phase: 'paused' })
      const state = get()
      state.resumeSimulation()
    }
  },

  stepOnce: () => {
    const { sim, phase } = get()
    if (!sim || phase === 'running') return
    const newSim = stepSimulation(sim)
    const metrics = newSim.snapshots[newSim.snapshots.length - 1]?.metrics
    let alert = null
    if (newSim.failed) {
      alert = computeFailureAlert(newSim.failureReason ?? '未知原因', newSim.events)
      set({
        sim: newSim,
        phase: 'failed',
        failureAlert: alert,
        currentMetrics: metrics
          ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
          : get().currentMetrics,
      })
      return
    }
    if (newSim.completed) {
      const report = generateReport(
        `session_${Date.now()}`,
        newSim.levelConfig.id,
        newSim.windowConfig,
        newSim.configHistory,
        metrics ?? { avgWaitTime: 0, maxWaitTime: 0, utilizationRate: [], overallUtilization: 0, noShowCount: 0, completedCount: 0, abandonedCount: 0, queueLength: 0 },
        newSim.events,
        newSim.customers
      )
      const conclusion = getWindowConclusion(report)
      set({
        sim: newSim,
        phase: 'completed',
        currentMetrics: metrics
          ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
          : get().currentMetrics,
        windowConclusion: conclusion,
      })
      return
    }
    set({
      sim: newSim,
      phase: phase === 'idle' ? 'idle' : 'paused',
      currentMetrics: metrics
        ? { avgWait: metrics.avgWaitTime, maxWait: metrics.maxWaitTime, queueLen: metrics.queueLength, completed: metrics.completedCount, noShow: metrics.noShowCount }
        : get().currentMetrics,
    })
  },

  doEnableWindow: (windowId: number) => {
    const { sim } = get()
    if (!sim) return
    const newSim = enableWindow(sim, windowId)
    set({ sim: newSim })
  },

  doAddWindow: () => {
    const { sim } = get()
    if (!sim) return
    const newSim = addWindow(sim)
    set({ sim: newSim })
  },

  getSnapshots: () => get().sim?.snapshots ?? [],
  getSessionId: () => `session_${get().sim?.tick ?? 0}_${Date.now()}`,
}))
