export type ProbeStatus = 'online' | 'offline' | 'overtemp'
export type FanStatus = 'running' | 'stopped'
export type AnomalyType = 'probe_offline' | 'fan_stopped' | 'product_occlusion'
export type SourceType = 'shelf_model' | 'fan_status' | 'temp_report'

export interface ColdStorage {
  id: string
  name: string
  width: number
  depth: number
  height: number
}

export interface Shelf {
  id: string
  coldStorageId: string
  layerCount: number
  posX: number
  posZ: number
  width: number
  depth: number
  layerHeight: number
  sourceFile: string
}

export interface Probe {
  id: string
  shelfId: string
  layer: number
  posX: number
  posY: number
  posZ: number
  area: string
}

export interface ProbeReading {
  id: string
  probeId: string
  timestamp: string
  temperature: number
  status: ProbeStatus
  sourceReportId: string
}

export interface Fan {
  id: string
  coldStorageId: string
  posX: number
  posY: number
  posZ: number
  name: string
}

export interface FanStatusRecord {
  id: string
  fanId: string
  timestamp: string
  status: FanStatus
  sourceRecordId: string
}

export interface AnomalyEvent {
  id: string
  timestamp: string
  type: AnomalyType
  description: string
  relatedProbeId?: string
  relatedFanId?: string
  sourceId: string
  sourceType: SourceType
}

export interface TimelinePoint {
  index: number
  timestamp: string
  label: string
}

export interface DataSource {
  id: string
  type: SourceType
  name: string
  description: string
  timestamp: string
  relatedIds: string[]
}
