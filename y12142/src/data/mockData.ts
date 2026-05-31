import type {
  Cabinet, Cluster, Cell, CellReading,
  MaintenanceRecord, ThresholdVersion, ThresholdConfig, AnomalyType
} from '@/types'

const HOUR = 3600000
const MINUTE = 60000
const BASE_TIME = Date.now() - 72 * HOUR

export const cabinets: Cabinet[] = [
  { id: 'cabinet-1', name: 'A01柜', location: '1号仓-左侧' },
  { id: 'cabinet-2', name: 'A02柜', location: '1号仓-右侧' },
]

export const clusters: Cluster[] = [
  { id: 'cluster-1-1', cabinetId: 'cabinet-1', index: 0 },
  { id: 'cluster-1-2', cabinetId: 'cabinet-1', index: 1 },
  { id: 'cluster-2-1', cabinetId: 'cabinet-2', index: 0 },
  { id: 'cluster-2-2', cabinetId: 'cabinet-2', index: 1 },
]

const anomalyMap: Record<string, AnomalyType> = {
  'cell-1-1-3': 'drift',
  'cell-1-1-7': 'drift',
  'cell-1-2-5': 'threshold_version_error',
  'cell-1-2-11': 'threshold_version_error',
  'cell-2-1-2': 'missing_sample',
  'cell-2-1-9': 'missing_sample',
  'cell-2-2-6': 'drift',
}

export const cells: Cell[] = []
for (const cluster of clusters) {
  for (let i = 0; i < 16; i++) {
    const cellId = `cell-${cluster.cabinetId.split('-')[1]}-${cluster.index + 1}-${i}`
    cells.push({
      id: cellId,
      clusterId: cluster.id,
      cabinetId: cluster.cabinetId,
      index: i,
      status: anomalyMap[cellId] || 'normal',
    })
  }
}

function generateReadings(): CellReading[] {
  const readings: CellReading[] = []
  const steps = Math.floor(72 * HOUR / (5 * MINUTE))

  for (const cell of cells) {
    const baseTemp = 25 + Math.random() * 3
    const baseVolt = 3.2 + Math.random() * 0.3

    for (let s = 0; s < steps; s++) {
      const ts = BASE_TIME + s * 5 * MINUTE
      let temp = baseTemp + Math.sin(s / 200) * 1.5 + (Math.random() - 0.5) * 0.8
      let volt = baseVolt + Math.sin(s / 300) * 0.05 + (Math.random() - 0.5) * 0.02
      let anomaly: AnomalyType = 'normal'

      if (cell.status === 'drift') {
        const progress = s / steps
        if (progress > 0.3) {
          const driftAmount = (progress - 0.3) * 18
          temp = baseTemp + driftAmount + (Math.random() - 0.5) * 0.5
          anomaly = 'drift'
        }
      }

      if (cell.status === 'threshold_version_error') {
        const progress = s / steps
        if (progress > 0.5) {
          temp = 43 + (progress - 0.5) * 8 + (Math.random() - 0.5) * 0.3
          volt = 3.5 + (progress - 0.5) * 0.3 + (Math.random() - 0.5) * 0.01
          anomaly = 'threshold_version_error'
        }
      }

      if (cell.status === 'missing_sample') {
        const progress = s / steps
        if (progress > 0.4 && progress < 0.6) {
          continue
        }
        if (progress >= 0.6) {
          anomaly = 'missing_sample'
        }
      }

      readings.push({
        cellId: cell.id,
        timestamp: ts,
        temperature: Math.round(temp * 100) / 100,
        voltage: Math.round(volt * 1000) / 1000,
        anomalyType: anomaly,
      })
    }
  }

  return readings
}

export const readings: CellReading[] = generateReadings()

export const maintenanceRecords: MaintenanceRecord[] = [
  {
    id: 'm1',
    cellId: 'cell-1-1-3',
    date: BASE_TIME + 12 * HOUR,
    type: '传感器校准',
    result: '已校准',
    description: '温度传感器读数偏移+1.8°C，已重新校准归零',
  },
  {
    id: 'm2',
    cellId: 'cell-1-1-3',
    date: BASE_TIME + 48 * HOUR,
    type: '传感器校准',
    result: '校准失效',
    description: '再次漂移+3.2°C，校准后仍不稳定，建议更换传感器',
  },
  {
    id: 'm3',
    cellId: 'cell-1-2-5',
    date: BASE_TIME + 36 * HOUR,
    type: '阈值版本更新',
    result: '待处理',
    description: '发现使用旧版本阈值(v1.0)判定为正常，新版本(v2.0)下已超预警线',
  },
  {
    id: 'm4',
    cellId: 'cell-2-1-2',
    date: BASE_TIME + 30 * HOUR,
    type: '数据补采',
    result: '部分补采',
    description: 'T+30h至T+43h采样缺失，已补采部分数据，仍有13h数据空白',
  },
  {
    id: 'm5',
    cellId: 'cell-2-2-6',
    date: BASE_TIME + 20 * HOUR,
    type: '传感器校准',
    result: '已校准',
    description: '温度传感器读数偏移+0.9°C，校准后恢复正常',
  },
  {
    id: 'm6',
    cellId: 'cell-1-1-7',
    date: BASE_TIME + 55 * HOUR,
    type: '传感器校准',
    result: '已校准',
    description: '温度传感器读数偏移+2.1°C，已重新校准',
  },
]

export const thresholdVersions: ThresholdVersion[] = [
  { id: 'v1', name: 'v1.0 (2024-01)', releaseDate: 1704067200000 },
  { id: 'v2', name: 'v2.0 (2025-03)', releaseDate: 1740787200000 },
]

export const thresholdConfigs: ThresholdConfig[] = [
  {
    versionId: 'v1',
    tempWarning: 45,
    tempCritical: 55,
    voltWarning: 3.65,
    voltCritical: 3.8,
    driftTolerance: 3.0,
  },
  {
    versionId: 'v2',
    tempWarning: 40,
    tempCritical: 50,
    voltWarning: 3.55,
    voltCritical: 3.7,
    driftTolerance: 1.5,
  },
]

export const TIME_RANGE = { start: BASE_TIME, end: BASE_TIME + 72 * HOUR }
