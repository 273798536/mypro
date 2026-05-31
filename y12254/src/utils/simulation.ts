import type {
  CustomerCard,
  ServiceWindow,
  GameEvent,
  LevelConfig,
  WindowConfig,
  SimulationSnapshot,
  SimulationMetrics,
  AnomalyConfig,
} from '@/types'

function exponentialRandom(rate: number): number {
  return Math.ceil(-Math.log(1 - Math.random()) / rate)
}

function clampDuration(d: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, d))
}

let customerCounter = 0

function generateCustomerCard(
  arrivalTime: number,
  serviceRate: number,
  anomalies: AnomalyConfig[],
  tick: number
): CustomerCard {
  customerCounter++
  const rawDuration = exponentialRandom(serviceRate)
  const duration = clampDuration(rawDuration, 2, 20)
  const appointmentNo = `P${String(customerCounter).padStart(3, '0')}`

  const card: CustomerCard = {
    id: `c_${customerCounter}_${Date.now()}`,
    appointmentNo,
    arrivalTime,
    serviceDuration: duration,
    originalServiceDuration: duration,
    status: 'waiting',
    assignedWindow: null,
    waitStartTime: arrivalTime,
    waitEndTime: null,
    serviceStartTime: null,
    serviceEndTime: null,
    isAbnormal: false,
  }

  for (const anomaly of anomalies) {
    if (
      anomaly.type === 'no_show' &&
      tick >= anomaly.triggerTickRange[0] &&
      tick <= anomaly.triggerTickRange[1] &&
      Math.random() < anomaly.probability
    ) {
      card.status = 'no_show'
      card.isAbnormal = true
      card.abnormalReason = '预约爽约'
      break
    }
    if (
      anomaly.type === 'abnormal_duration' &&
      tick >= anomaly.triggerTickRange[0] &&
      tick <= anomaly.triggerTickRange[1] &&
      Math.random() < anomaly.probability
    ) {
      const multiplier = 1.5 + Math.random() * 2
      card.serviceDuration = clampDuration(Math.round(duration * multiplier), 2, 40)
      card.isAbnormal = true
      card.abnormalReason = `制作时长异常：原${duration}→${card.serviceDuration}`
      break
    }
  }

  return card
}

function createWindows(count: number): ServiceWindow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    label: `窗口${i + 1}`,
    status: 'idle',
    currentCustomer: null,
    disabledAt: null,
    serviceProgress: 0,
  }))
}

function computeMetrics(
  customers: CustomerCard[],
  windows: ServiceWindow[],
  queueLength: number,
  currentTick: number
): SimulationMetrics {
  const completed = customers.filter(c => c.status === 'completed')
  const waitTimes = completed
    .filter(c => c.waitEndTime !== null && c.waitStartTime !== null)
    .map(c => (c.waitEndTime! - c.waitStartTime))
  const noShowCount = customers.filter(c => c.status === 'no_show').length
  const abandonedCount = customers.filter(c => c.status === 'abandoned').length

  const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0
  const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0

  const totalServiceTicks = customers
    .filter(c => c.status === 'completed' || c.status === 'serving')
    .reduce((sum, c) => {
      if (c.serviceStartTime === null) return sum
      const end = c.serviceEndTime ?? currentTick
      return sum + (end - c.serviceStartTime)
    }, 0)
  const activeWindowCount = windows.filter(w => w.status !== 'disabled').length
  const totalAvailableTicks = Math.max(currentTick, 1) * Math.max(activeWindowCount, 1)
  const overallUtilization = totalAvailableTicks > 0 ? totalServiceTicks / totalAvailableTicks : 0

  const utilizationRate = windows.map(w => {
    if (w.status === 'serving') return 1
    if (w.status === 'disabled') return 0
    return 0
  })

  return {
    avgWaitTime: Math.round(avgWaitTime * 10) / 10,
    maxWaitTime,
    utilizationRate,
    noShowCount,
    completedCount: completed.length,
    abandonedCount,
    queueLength,
    overallUtilization: Math.round(overallUtilization * 1000) / 10,
  }
}

export interface SimulationState {
  tick: number
  customers: CustomerCard[]
  windows: ServiceWindow[]
  queue: string[]
  events: GameEvent[]
  snapshots: SimulationSnapshot[]
  windowConfig: WindowConfig
  configHistory: { tick: number; config: WindowConfig }[]
  levelConfig: LevelConfig
  customersGenerated: number
  nextArrivalTick: number
  failed: boolean
  failureReason: string | null
  completed: boolean
}

export function initSimulation(levelConfig: LevelConfig): SimulationState {
  customerCounter = 0
  const windows = createWindows(levelConfig.initialWindowCount)
  const firstArrival = exponentialRandom(levelConfig.arrivalRate)

  return {
    tick: 0,
    customers: [],
    windows,
    queue: [],
    events: [],
    snapshots: [],
    windowConfig: {
      windowCount: levelConfig.initialWindowCount,
      disabledWindows: [],
      serviceRate: levelConfig.serviceRate,
    },
    configHistory: [],
    levelConfig,
    customersGenerated: 0,
    nextArrivalTick: firstArrival,
    failed: false,
    failureReason: null,
    completed: false,
  }
}

export function stepSimulation(state: SimulationState): SimulationState {
  if (state.failed || state.completed) return state

  const newState = { ...state }
  newState.tick = state.tick + 1
  newState.events = [...state.events]
  newState.customers = state.customers.map(c => ({ ...c }))
  newState.windows = state.windows.map(w => ({ ...w }))
  newState.queue = [...state.queue]
  newState.configHistory = [...state.configHistory]

  const tick = newState.tick
  const level = newState.levelConfig

  if (newState.customersGenerated < level.totalCustomers && tick >= newState.nextArrivalTick) {
    const customer = generateCustomerCard(
      tick,
      level.serviceRate,
      level.anomalies,
      tick
    )
    newState.customers.push(customer)
    newState.customersGenerated++

    if (customer.status === 'no_show') {
      newState.events.push({
        tick,
        type: 'no_show',
        customerId: customer.id,
        detail: `顾客 ${customer.appointmentNo} 预约爽约（到达时间=${tick}）`,
        triggerSource: `预约卡 ${customer.appointmentNo}`,
      })
    } else {
      newState.queue.push(customer.id)
      newState.events.push({
        tick,
        type: 'arrival',
        customerId: customer.id,
        detail: `顾客 ${customer.appointmentNo} 到达，制作时长=${customer.serviceDuration}`,
        triggerSource: `预约卡 ${customer.appointmentNo}`,
      })

      if (customer.isAbnormal && customer.abnormalReason?.includes('异常')) {
        newState.events.push({
          tick,
          type: 'abnormal_duration',
          customerId: customer.id,
          detail: `顾客 ${customer.appointmentNo} ${customer.abnormalReason}`,
          triggerSource: `预约卡 ${customer.appointmentNo} 制作时长异常`,
        })
      }
    }

    newState.nextArrivalTick = tick + exponentialRandom(level.arrivalRate)
  }

  for (const anomaly of level.anomalies) {
    if (
      anomaly.type === 'window_disabled' &&
      tick >= anomaly.triggerTickRange[0] &&
      tick <= anomaly.triggerTickRange[1] &&
      Math.random() < anomaly.probability * 0.1
    ) {
      const activeWindows = newState.windows.filter(w => w.status !== 'disabled')
      if (activeWindows.length > 1) {
        const target = activeWindows[Math.floor(Math.random() * activeWindows.length)]
        const targetIdx = newState.windows.findIndex(w => w.id === target.id)
        if (targetIdx !== -1) {
          const w = newState.windows[targetIdx]
          if (w.currentCustomer) {
            const cust = newState.customers.find(c => c.id === w.currentCustomer)
            if (cust) {
              cust.status = 'waiting'
              cust.assignedWindow = null
              cust.serviceStartTime = null
              newState.queue.unshift(cust.id)
            }
          }
          newState.windows[targetIdx] = {
            ...w,
            status: 'disabled',
            currentCustomer: null,
            disabledAt: tick,
            disabledReason: '设备故障',
            serviceProgress: 0,
          }
          if (!newState.windowConfig.disabledWindows.includes(target.id)) {
            newState.windowConfig = {
              ...newState.windowConfig,
              disabledWindows: [...newState.windowConfig.disabledWindows, target.id],
            }
          }
          newState.events.push({
            tick,
            type: 'window_disabled',
            windowId: target.id,
            detail: `${w.label} 设备故障停用`,
            triggerSource: `${w.label} 窗口故障`,
          })
        }
      }
    }
  }

  for (let i = 0; i < newState.windows.length; i++) {
    const w = newState.windows[i]
    if (w.status === 'serving' && w.currentCustomer) {
      const customer = newState.customers.find(c => c.id === w.currentCustomer)
      if (customer) {
        const elapsed = tick - (customer.serviceStartTime ?? tick)
        customer.assignedWindow = w.id
        const progress = Math.min(elapsed / customer.serviceDuration, 1)
        newState.windows[i] = { ...w, serviceProgress: progress }

        if (elapsed >= customer.serviceDuration) {
          customer.status = 'completed'
          customer.serviceEndTime = tick
          customer.waitEndTime = customer.waitEndTime ?? customer.serviceStartTime
          newState.windows[i] = {
            ...newState.windows[i],
            status: 'idle',
            currentCustomer: null,
            serviceProgress: 0,
          }
          newState.events.push({
            tick,
            type: 'service_end',
            customerId: customer.id,
            windowId: w.id,
            detail: `顾客 ${customer.appointmentNo} 在${w.label}完成服务`,
            triggerSource: `${w.label}`,
          })
        }
      }
    }
  }

  const queueCopy = [...newState.queue]
  for (const cid of queueCopy) {
    const customer = newState.customers.find(c => c.id === cid)
    if (!customer || customer.status !== 'waiting') continue

    const availIdx = newState.windows.findIndex(w => w.status === 'idle')
    if (availIdx === -1) break

    customer.status = 'serving'
    customer.assignedWindow = newState.windows[availIdx].id
    customer.serviceStartTime = tick
    customer.waitEndTime = tick
    newState.windows[availIdx] = {
      ...newState.windows[availIdx],
      status: 'serving',
      currentCustomer: customer.id,
      serviceProgress: 0,
    }
    const queueIdx = newState.queue.indexOf(cid)
    if (queueIdx !== -1) newState.queue.splice(queueIdx, 1)

    newState.events.push({
      tick,
      type: 'service_start',
      customerId: customer.id,
      windowId: newState.windows[availIdx].id,
      detail: `顾客 ${customer.appointmentNo} 在${newState.windows[availIdx].label}开始服务`,
      triggerSource: `${newState.windows[availIdx].label}`,
    })
  }

  const metrics = computeMetrics(newState.customers, newState.windows, newState.queue.length, tick)

  for (const fc of level.failureConditions) {
    if (fc.type === 'max_wait_exceeded') {
      const waitingTooLong = newState.customers.find(
        c => c.status === 'waiting' && tick - c.waitStartTime > fc.threshold
      )
      if (waitingTooLong) {
        newState.failed = true
        newState.failureReason = `${fc.message}（顾客 ${waitingTooLong.appointmentNo} 已等待 ${tick - waitingTooLong.waitStartTime} 单位时间）`
        break
      }
    }
    if (fc.type === 'queue_length_exceeded') {
      if (newState.queue.length > fc.threshold) {
        newState.failed = true
        newState.failureReason = `${fc.message}（当前队列 ${newState.queue.length} 人）`
        break
      }
    }
    if (fc.type === 'no_show_rate_exceeded') {
      const total = newState.customers.length
      if (total > 3 && metrics.noShowCount / total > fc.threshold) {
        newState.failed = true
        newState.failureReason = `${fc.message}（爽约率 ${(metrics.noShowCount / total * 100).toFixed(1)}%）`
        break
      }
    }
  }

  if (
    newState.customersGenerated >= level.totalCustomers &&
    newState.queue.length === 0 &&
    newState.windows.every(w => w.status !== 'serving')
  ) {
    newState.completed = true
  }

  const snapshot: SimulationSnapshot = {
    tick,
    queue: [...newState.queue],
    windows: newState.windows.map(w => ({ ...w })),
    events: newState.events.filter(e => e.tick === tick),
    metrics,
  }
  newState.snapshots = [...state.snapshots, snapshot]

  return newState
}

export function enableWindow(state: SimulationState, windowId: number): SimulationState {
  const newState = { ...state }
  newState.windows = state.windows.map(w => ({ ...w }))
  newState.windowConfig = { ...state.windowConfig, disabledWindows: [...state.windowConfig.disabledWindows] }
  newState.configHistory = [...state.configHistory]
  newState.events = [...state.events]

  const idx = newState.windows.findIndex(w => w.id === windowId)
  if (idx === -1 || newState.windows[idx].status !== 'disabled') return state

  newState.windows[idx] = {
    ...newState.windows[idx],
    status: 'idle',
    disabledAt: null,
    disabledReason: undefined,
  }
  newState.windowConfig.disabledWindows = newState.windowConfig.disabledWindows.filter(id => id !== windowId)

  newState.events.push({
    tick: state.tick,
    type: 'window_enabled',
    windowId,
    detail: `${newState.windows[idx].label} 已恢复启用`,
    triggerSource: `手动操作：恢复${newState.windows[idx].label}`,
  })

  newState.configHistory.push({ tick: state.tick, config: { ...newState.windowConfig } })

  return newState
}

export function addWindow(state: SimulationState): SimulationState {
  const newState = { ...state }
  newState.windows = state.windows.map(w => ({ ...w }))
  newState.windowConfig = { ...state.windowConfig, disabledWindows: [...state.windowConfig.disabledWindows] }
  newState.configHistory = [...state.configHistory]
  newState.events = [...state.events]

  const newId = Math.max(...newState.windows.map(w => w.id), -1) + 1
  const newWindow: ServiceWindow = {
    id: newId,
    label: `窗口${newId + 1}`,
    status: 'idle',
    currentCustomer: null,
    disabledAt: null,
    serviceProgress: 0,
  }
  newState.windows.push(newWindow)
  newState.windowConfig.windowCount = newState.windows.length

  newState.events.push({
    tick: state.tick,
    type: 'config_change',
    detail: `新增${newWindow.label}，当前共 ${newState.windows.length} 个窗口`,
    triggerSource: `手动操作：新增窗口`,
  })

  newState.configHistory.push({ tick: state.tick, config: { ...newState.windowConfig } })

  return newState
}
