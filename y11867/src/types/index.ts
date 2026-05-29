export interface VoxelData {
  id: string
  position: [number, number, number]
  windSpeed: number
  windDirection: [number, number, number]
  category: 'building' | 'wind' | 'pedestrian'
  zoneId?: string
  buildingId?: string
}

export interface BuildingBlock {
  id: string
  name: string
  position: [number, number, number]
  size: [number, number, number]
  height: number
}

export interface PedestrianZone {
  id: string
  name: string
  bounds: { min: [number, number, number]; max: [number, number, number] }
  pedestrianHeight: number
}

export interface DetectedIssue {
  id: string
  type: 'wind_reversal' | 'voxel_hole' | 'sensor_occlusion'
  severity: 'critical' | 'warning' | 'info'
  position: [number, number, number]
  description: string
  affectedVoxelIds: string[]
  confirmed: boolean
}

export interface RiskAnnotation {
  id: string
  issueId: string
  label: string
  position: [number, number, number]
  type: 'warning' | 'danger' | 'info'
}

export interface ExportReport {
  generatedAt: string
  summary: {
    totalVoxels: number
    buildingCount: number
    pedestrianZoneCount: number
    issueCount: number
    windDirectionConclusion: string
  }
  issues: DetectedIssue[]
  windStatistics: {
    dominantDirection: string
    maxSpeed: number
    avgSpeed: number
    reversalCount: number
  }
}

export interface AppFilters {
  categories: ('building' | 'wind' | 'pedestrian')[]
  windSpeedRange: [number, number]
  heightSlice: [number, number]
}

export const WIND_SPEED_MAX = 15
export const WIND_SPEED_MIN = 0
export const HEIGHT_MAX = 150
export const HEIGHT_MIN = 0

export const ISSUE_TYPE_LABELS: Record<DetectedIssue['type'], string> = {
  wind_reversal: '风向反转',
  voxel_hole: '体素空洞',
  sensor_occlusion: '测点遮挡',
}

export const SEVERITY_LABELS: Record<DetectedIssue['severity'], string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}

export const CATEGORY_LABELS: Record<VoxelData['category'], string> = {
  building: '建筑体块',
  wind: '风速场',
  pedestrian: '行人区',
}
