import { create } from 'zustand'
import type { AnomalyType, SeverityLevel, ThresholdCheckResult } from '@/types'
import {
  cabinets, clusters, cells, readings, maintenanceRecords,
  thresholdVersions, thresholdConfigs, TIME_RANGE
} from '@/data/mockData'
import type { Cell, CellReading, ThresholdConfig } from '@/types'

interface FilterState {
  cabinetId: string | null
  anomalyType: AnomalyType | null
  severity: SeverityLevel | null
}

interface StoreState {
  selectedCellId: string | null
  currentTime: number
  thresholdVersionId: string
  isPlaying: boolean
  filters: FilterState

  setSelectedCellId: (id: string | null) => void
  setCurrentTime: (t: number) => void
  setThresholdVersionId: (id: string) => void
  setIsPlaying: (playing: boolean) => void
  setFilters: (f: Partial<FilterState>) => void

  getFilteredCells: () => Cell[]
  getCellReadings: (cellId: string) => CellReading[]
  getCurrentReading: (cellId: string) => CellReading | null
  getMaintenanceRecords: (cellId: string) => typeof maintenanceRecords
  getThresholdConfig: () => ThresholdConfig
  checkThreshold: (cellId: string) => ThresholdCheckResult
  getAllCells: () => Cell[]
}

export const useStore = create<StoreState>((set, get) => ({
  selectedCellId: null,
  currentTime: TIME_RANGE.end,
  thresholdVersionId: 'v2',
  isPlaying: false,
  filters: {
    cabinetId: null,
    anomalyType: null,
    severity: null,
  },

  setSelectedCellId: (id) => set({ selectedCellId: id }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setThresholdVersionId: (id) => set({ thresholdVersionId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setFilters: (f) => set((state) => ({ filters: { ...state.filters, ...f } })),

  getFilteredCells: () => {
    const { filters } = get()
    let result = cells
    if (filters.cabinetId) {
      result = result.filter((c) => c.cabinetId === filters.cabinetId)
    }
    if (filters.anomalyType) {
      result = result.filter((c) => c.status === filters.anomalyType)
    }
    return result
  },

  getCellReadings: (cellId: string) => {
    return readings.filter((r) => r.cellId === cellId)
  },

  getCurrentReading: (cellId: string) => {
    const { currentTime } = get()
    const cellReadings = readings.filter((r) => r.cellId === cellId)
    if (cellReadings.length === 0) return null
    let closest = cellReadings[0]
    let minDiff = Math.abs(cellReadings[0].timestamp - currentTime)
    for (const r of cellReadings) {
      const diff = Math.abs(r.timestamp - currentTime)
      if (diff < minDiff) {
        minDiff = diff
        closest = r
      }
    }
    return closest
  },

  getMaintenanceRecords: (cellId: string) => {
    return maintenanceRecords.filter((m) => m.cellId === cellId)
  },

  getThresholdConfig: () => {
    const { thresholdVersionId } = get()
    return thresholdConfigs.find((c) => c.versionId === thresholdVersionId) || thresholdConfigs[0]
  },

  checkThreshold: (cellId: string) => {
    const state = get()
    const cell = cells.find((c) => c.id === cellId)
    if (!cell) {
      return { severity: 'normal' as SeverityLevel, anomalyType: 'normal' as AnomalyType, message: '未找到电芯', detail: '' }
    }

    const config = state.getThresholdConfig()
    const reading = state.getCurrentReading(cellId)

    if (cell.status === 'missing_sample') {
      const missingStart = TIME_RANGE.start + 0.4 * (TIME_RANGE.end - TIME_RANGE.start)
      const missingEnd = TIME_RANGE.start + 0.6 * (TIME_RANGE.end - TIME_RANGE.start)
      const inGap = state.currentTime >= missingStart && state.currentTime <= missingEnd
      return {
        severity: inGap ? 'critical' : 'warning',
        anomalyType: 'missing_sample',
        message: inGap ? '当前时段采样数据缺失' : '历史存在采样缺失时段',
        detail: inGap
          ? `T+${Math.round((missingStart - TIME_RANGE.start) / 3600000)}h 至 T+${Math.round((missingEnd - TIME_RANGE.start) / 3600000)}h 采样数据完全缺失，无法判断电芯真实状态。建议立即检查数据采集链路。`
          : `该电芯在 T+${Math.round((missingStart - TIME_RANGE.start) / 3600000)}h 至 T+${Math.round((missingEnd - TIME_RANGE.start) / 3600000)}h 存在采样缺失，缺失时长约 ${Math.round((missingEnd - missingStart) / 3600000)}h。当前时段数据已恢复，但缺失期间状态未知。`,
      }
    }

    if (cell.status === 'drift') {
      if (!reading) {
        return { severity: 'warning', anomalyType: 'drift', message: '传感器读数缺失', detail: '无法获取当前读数判断漂移程度' }
      }
      const driftAmount = reading.temperature - 25
      const isOverDrift = driftAmount > config.driftTolerance
      const isOverTemp = reading.temperature > config.tempWarning
      if (isOverTemp || isOverDrift) {
        return {
          severity: reading.temperature > config.tempCritical ? 'critical' : 'warning',
          anomalyType: 'drift',
          message: `传感器漂移${isOverTemp ? '，温度超阈值' : ''}`,
          detail: `当前读数温度 ${reading.temperature}°C，偏移量约 ${driftAmount > 0 ? '+' : ''}${driftAmount.toFixed(1)}°C。漂移容差 ${config.driftTolerance}°C（${thresholdVersions.find(v => v.id === state.thresholdVersionId)?.name}），${isOverDrift ? '已超过漂移容差' : '尚在容差范围内'}。${isOverTemp ? `温度已超过预警阈值 ${config.tempWarning}°C。` : ''}传感器读数持续偏移，真实温度可能低于读数，建议校准或更换传感器。`,
        }
      }
      return {
        severity: 'warning',
        anomalyType: 'drift',
        message: '传感器存在漂移趋势',
        detail: `当前温度 ${reading.temperature}°C，偏移量 ${driftAmount > 0 ? '+' : ''}${driftAmount.toFixed(1)}°C，尚未超阈值，但漂移趋势持续，${driftAmount > config.driftTolerance * 0.5 ? '已超过容差50%' : '需持续关注'}。`,
      }
    }

    if (cell.status === 'threshold_version_error') {
      if (!reading) {
        return { severity: 'warning', anomalyType: 'threshold_version_error', message: '传感器读数缺失', detail: '' }
      }
      const newConfig = thresholdConfigs.find((c) => c.versionId === 'v2')!
      const oldConfig = thresholdConfigs.find((c) => c.versionId === 'v1')!
      const overNew = reading.temperature > newConfig.tempWarning
      const overOld = reading.temperature > oldConfig.tempWarning
      if (overNew && !overOld) {
        return {
          severity: reading.temperature > newConfig.tempCritical ? 'critical' : 'warning',
          anomalyType: 'threshold_version_error',
          message: '阈值版本差异导致预警状态变化',
          detail: `当前温度 ${reading.temperature}°C：按旧版本(v1.0)阈值 ${oldConfig.tempWarning}°C 判定为「正常」，按新版本(v2.0)阈值 ${newConfig.tempWarning}°C 判定为「${reading.temperature > newConfig.tempCritical ? '严重' : '预警'}」。该电芯长期使用旧版本阈值，导致温度偏高未被识别，存在热失控风险。`,
        }
      }
      if (overNew && overOld) {
        return {
          severity: reading.temperature > newConfig.tempCritical ? 'critical' : 'warning',
          anomalyType: 'threshold_version_error',
          message: '温度超阈值（新旧版本均超标）',
          detail: `当前温度 ${reading.temperature}°C，新旧版本阈值均超标。该电芯曾使用旧版本阈值，历史预警记录可能不完整。`,
        }
      }
      return {
        severity: 'warning',
        anomalyType: 'threshold_version_error',
        message: '历史阈值版本错，当前未超标',
        detail: `当前温度 ${reading.temperature}°C，按当前版本未超标。但历史存在使用旧版本阈值判定的情况，部分高温时段可能未被正确预警。`,
      }
    }

    if (!reading) {
      return { severity: 'normal', anomalyType: 'normal', message: '无读数数据', detail: '' }
    }
    if (reading.temperature > config.tempCritical) {
      return { severity: 'critical', anomalyType: 'normal', message: '温度严重超标', detail: `当前温度 ${reading.temperature}°C，超过严重阈值 ${config.tempCritical}°C` }
    }
    if (reading.temperature > config.tempWarning) {
      return { severity: 'warning', anomalyType: 'normal', message: '温度预警', detail: `当前温度 ${reading.temperature}°C，超过预警阈值 ${config.tempWarning}°C` }
    }
    if (reading.voltage > config.voltCritical) {
      return { severity: 'critical', anomalyType: 'normal', message: '电压严重超标', detail: `当前电压 ${reading.voltage}V，超过严重阈值 ${config.voltCritical}V` }
    }
    if (reading.voltage > config.voltWarning) {
      return { severity: 'warning', anomalyType: 'normal', message: '电压预警', detail: `当前电压 ${reading.voltage}V，超过预警阈值 ${config.voltWarning}V` }
    }
    return { severity: 'normal', anomalyType: 'normal', message: '正常', detail: `温度 ${reading.temperature}°C、电压 ${reading.voltage}V，均在阈值范围内。` }
  },

  getAllCells: () => cells,
}))

export { cabinets, clusters, cells, readings, maintenanceRecords, thresholdVersions, thresholdConfigs, TIME_RANGE }
