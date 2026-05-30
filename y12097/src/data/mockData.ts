import type {
  ColdStorage,
  Shelf,
  Probe,
  ProbeReading,
  Fan,
  FanStatusRecord,
  AnomalyEvent,
  TimelinePoint,
  DataSource,
} from '@/types'

export const coldStorage: ColdStorage = {
  id: 'cs-001',
  name: '一号冷库',
  width: 20,
  depth: 15,
  height: 8,
}

export const shelves: Shelf[] = [
  {
    id: 'shelf-01',
    coldStorageId: 'cs-001',
    layerCount: 4,
    posX: -6,
    posZ: -4,
    width: 5,
    depth: 3,
    layerHeight: 1.5,
    sourceFile: 'shelf_model_A.glb',
  },
  {
    id: 'shelf-02',
    coldStorageId: 'cs-001',
    layerCount: 4,
    posX: 0,
    posZ: -4,
    width: 5,
    depth: 3,
    layerHeight: 1.5,
    sourceFile: 'shelf_model_A.glb',
  },
  {
    id: 'shelf-03',
    coldStorageId: 'cs-001',
    layerCount: 4,
    posX: 6,
    posZ: -4,
    width: 5,
    depth: 3,
    layerHeight: 1.5,
    sourceFile: 'shelf_model_B.glb',
  },
  {
    id: 'shelf-04',
    coldStorageId: 'cs-001',
    layerCount: 4,
    posX: -6,
    posZ: 4,
    width: 5,
    depth: 3,
    layerHeight: 1.5,
    sourceFile: 'shelf_model_A.glb',
  },
  {
    id: 'shelf-05',
    coldStorageId: 'cs-001',
    layerCount: 4,
    posX: 0,
    posZ: 4,
    width: 5,
    depth: 3,
    layerHeight: 1.5,
    sourceFile: 'shelf_model_A.glb',
  },
  {
    id: 'shelf-06',
    coldStorageId: 'cs-001',
    layerCount: 4,
    posX: 6,
    posZ: 4,
    width: 5,
    depth: 3,
    layerHeight: 1.5,
    sourceFile: 'shelf_model_B.glb',
  },
]

export const probes: Probe[] = [
  ...shelves.flatMap((shelf) =>
    Array.from({ length: shelf.layerCount }, (_, layer) => ({
      id: `probe-${shelf.id}-L${layer + 1}`,
      shelfId: shelf.id,
      layer: layer + 1,
      posX: shelf.posX,
      posY: layer * shelf.layerHeight + 0.5,
      posZ: shelf.posZ,
      area: shelf.posZ < 0 ? 'A区' : 'B区',
    }))
  ),
]

export const fans: Fan[] = [
  { id: 'fan-01', coldStorageId: 'cs-001', posX: -3, posY: 7, posZ: 0, name: '风机A1' },
  { id: 'fan-02', coldStorageId: 'cs-001', posX: 3, posY: 7, posZ: 0, name: '风机A2' },
  { id: 'fan-03', coldStorageId: 'cs-001', posX: 0, posY: 7, posZ: -5, name: '风机B1' },
  { id: 'fan-04', coldStorageId: 'cs-001', posX: 0, posY: 7, posZ: 5, name: '风机B2' },
]

const baseTime = new Date('2026-05-31T08:00:00')

export const timelinePoints: TimelinePoint[] = Array.from({ length: 12 }, (_, i) => {
  const time = new Date(baseTime.getTime() + i * 10 * 60 * 1000)
  return {
    index: i,
    timestamp: time.toISOString(),
    label: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
})

export const generateProbeReadings = (timeIndex: number): ProbeReading[] => {
  const timestamp = timelinePoints[timeIndex].timestamp
  
  return probes.map((probe) => {
    const baseTemp = -18
    let tempOffset = (Math.random() - 0.5) * 3
    let status: 'online' | 'offline' | 'overtemp' = 'online'
    let sourceReportId = `report-${Math.floor(timeIndex / 3) + 1}`

    if (timeIndex >= 3 && probe.id === 'probe-shelf-02-L3') {
      status = 'offline'
      sourceReportId = 'report-dirty-sample'
    } else if (timeIndex >= 6 && probe.id.startsWith('probe-shelf-04-')) {
      tempOffset += 8 + (timeIndex - 6) * 0.5
      if (baseTemp + tempOffset > -10) {
        status = 'overtemp'
      }
    }

    if (probe.layer === 4) {
      tempOffset += 2
    }

    return {
      id: `reading-${probe.id}-t${timeIndex}`,
      probeId: probe.id,
      timestamp,
      temperature: status === 'offline' ? NaN : Math.round((baseTemp + tempOffset) * 10) / 10,
      status,
      sourceReportId,
    }
  })
}

export const generateFanStatuses = (timeIndex: number): FanStatusRecord[] => {
  const timestamp = timelinePoints[timeIndex].timestamp
  
  return fans.map((fan) => {
    let status: 'running' | 'stopped' = 'running'
    let sourceRecordId = `fan-log-${timeIndex + 1}`

    if (timeIndex >= 6 && fan.id === 'fan-01') {
      status = 'stopped'
      sourceRecordId = 'fan-alert-001'
    }

    return {
      id: `fan-status-${fan.id}-t${timeIndex}`,
      fanId: fan.id,
      timestamp,
      status,
      sourceRecordId,
    }
  })
}

export const generateAnomalies = (timeIndex: number): AnomalyEvent[] => {
  const timestamp = timelinePoints[timeIndex].timestamp
  const anomalies: AnomalyEvent[] = []

  if (timeIndex >= 3) {
    anomalies.push({
      id: `anomaly-offline-${timeIndex}`,
      timestamp,
      type: 'probe_offline',
      description: '探头 probe-shelf-02-L3 离线',
      relatedProbeId: 'probe-shelf-02-L3',
      sourceId: 'report-dirty-sample',
      sourceType: 'temp_report',
    })
  }

  if (timeIndex >= 6) {
    anomalies.push({
      id: `anomaly-fan-${timeIndex}`,
      timestamp,
      type: 'fan_stopped',
      description: '风机A1停转，影响shelf-04区域温度',
      relatedFanId: 'fan-01',
      sourceId: 'fan-alert-001',
      sourceType: 'fan_status',
    })

    probes
      .filter((p) => p.shelfId === 'shelf-04')
      .forEach((probe) => {
        anomalies.push({
          id: `anomaly-overtemp-${probe.id}-${timeIndex}`,
          timestamp,
          type: 'product_occlusion',
          description: `探头 ${probe.id} 区域温度异常升高`,
          relatedProbeId: probe.id,
          sourceId: `report-${Math.floor(timeIndex / 3) + 1}`,
          sourceType: 'temp_report',
        })
      })
  }

  return anomalies
}

export const dataSources: DataSource[] = [
  {
    id: 'shelf_model_A.glb',
    type: 'shelf_model',
    name: '货架模型A',
    description: '标准5×3米四层货架',
    timestamp: '2026-05-30T10:00:00',
    relatedIds: ['shelf-01', 'shelf-02', 'shelf-04', 'shelf-05'],
  },
  {
    id: 'shelf_model_B.glb',
    type: 'shelf_model',
    name: '货架模型B',
    description: '加强型5×3米四层货架',
    timestamp: '2026-05-30T10:00:00',
    relatedIds: ['shelf-03', 'shelf-06'],
  },
  {
    id: 'fan-alert-001',
    type: 'fan_status',
    name: '风机告警记录001',
    description: '风机A1转速异常触发告警',
    timestamp: '2026-05-31T09:00:00',
    relatedIds: ['fan-01'],
  },
  {
    id: 'report-dirty-sample',
    type: 'temp_report',
    name: '脏样本测试报告',
    description: '包含探头离线数据的测试报告',
    timestamp: '2026-05-31T08:30:00',
    relatedIds: ['probe-shelf-02-L3'],
  },
  {
    id: 'report-1',
    type: 'temp_report',
    name: '温场报告-01',
    description: '08:00-08:30 温场检测报告',
    timestamp: '2026-05-31T08:30:00',
    relatedIds: probes.map((p) => p.id),
  },
  {
    id: 'report-2',
    type: 'temp_report',
    name: '温场报告-02',
    description: '08:30-09:00 温场检测报告',
    timestamp: '2026-05-31T09:00:00',
    relatedIds: probes.map((p) => p.id),
  },
  {
    id: 'report-3',
    type: 'temp_report',
    name: '温场报告-03',
    description: '09:00-09:30 温场检测报告',
    timestamp: '2026-05-31T09:30:00',
    relatedIds: probes.map((p) => p.id),
  },
  {
    id: 'report-4',
    type: 'temp_report',
    name: '温场报告-04',
    description: '09:30-10:00 温场检测报告',
    timestamp: '2026-05-31T10:00:00',
    relatedIds: probes.map((p) => p.id),
  },
]

export const getDataSource = (id: string): DataSource | undefined => {
  return dataSources.find((ds) => ds.id === id)
}
