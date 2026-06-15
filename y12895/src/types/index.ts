export interface SettlementBatch {
  id: string
  batchName: string
  status: "pending" | "reviewing" | "approved" | "rejected"
  createdAt: string
  vesselName: string
  portName: string
}

export interface TrajectoryInput {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  timeElapsed: number
  vesselSpeed: number
  currentSpeed: number
  windSpeed: number
}

export interface TrajectoryDriftResult {
  driftDistance: number
  driftDirection: number
  driftIndex: number
}

export interface TrajectoryDriftCalc {
  id: string
  batchId: string
  inputParams: TrajectoryInput
  result: TrajectoryDriftResult
  formula: string
  unit: string
  scope: string
  failureReasons: string[]
  calculatedAt: string
}

export interface ReviewNote {
  id: string
  batchId: string
  author: string
  content: string
  createdAt: string
  relatedTrajectoryId: string
}

export interface TrackPoint {
  lat: number
  lng: number
  timestamp: string
}

export interface TrackAnomaly {
  index: number
  reason: string
}

export interface TrackCleaning {
  id: string
  batchId: string
  originalPoints: TrackPoint[]
  cleanedPoints: TrackPoint[]
  anomalies: TrackAnomaly[]
}

export interface WaterQualityAlert {
  id: string
  batchId: string
  level: "normal" | "warning" | "critical"
  conclusion: string
  sourceMaterial: {
    id: string
    name: string
    type: string
    lineReference: string
  }
  detectedAt: string
}

export interface ManualCorrection {
  id: string
  batchId: string
  operator: string
  timestamp: string
  field: string
  oldValue: string
  newValue: string
  statusBefore: "待确认"
  statusAfter: "通过"
  reason: string
}

export interface InspectionPhoto {
  id: string
  batchId: string
  originalLineNo: number
  imageName: string
  sourceRemark: string
  thumbnailUrl: string
  sourceTable: string
  sourceRecordId: string
}

export type ResultStatus = "可用" | "暂缓" | "重新采集"

export interface ResultItem {
  id: string
  batchId: string
  category: string
  description: string
  status: ResultStatus
  statusReason: string
  relatedDataIds: string[]
}

export interface WeatherEntry {
  date: string
  condition: string
  windSpeed: number
  waveHeight: number
  anomaly: boolean
}

export interface TideEntry {
  date: string
  highTide: string
  lowTide: string
  anomaly: boolean
}

export interface NavigationViolation {
  zoneName: string
  violationTime: string
  vesselId: string
  severity: "低" | "中" | "高"
}

export interface CompositeReview {
  batchId: string
  weatherForecast: WeatherEntry[]
  tideTable: TideEntry[]
  navigationZoneViolations: NavigationViolation[]
}
