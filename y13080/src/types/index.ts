export type ViewType = 'byArea' | 'byHazard' | 'byTimeline'

export type HazardClass = '1类' | '2类' | '3类' | '4类' | '5类' | '6类' | '7类' | '8类' | '9类'

export type BadDataType = 'timeline_gap' | 'comment_incomplete'

export type Severity = 'high' | 'medium' | 'low'

export interface WarehouseLocation {
  id: string
  code: string
  area: string
  row: number
  col: number
  level: number
  status: 'normal' | 'warning' | 'danger'
  capacity: number
  used: number
  hazardClass?: HazardClass
}

export interface DangerousGoods {
  id: string
  name: string
  unCode: string
  hazardClass: HazardClass
  locationId: string
  quantity: number
  unit: string
}

export interface ReviewComment {
  id: string
  locationId: string
  reviewer: string
  content: string
  originalSource: string
  originalLine: number
  isIncomplete: boolean
  missingFields: string[]
  createdAt: string
}

export interface TimelineRecord {
  id: string
  locationId: string
  date: string
  startTime: string
  endTime: string
  hasGap: boolean
  gapDescription: string
  gapDuration: number
  operator: string
}

export interface BadDataRecord {
  id: string
  type: BadDataType
  sourceId: string
  locationId: string
  severity: Severity
  description: string
  originalRef: string
  detectedAt: string
}

export interface Filters {
  area?: string
  hazardClass?: string
  status?: string
  date?: string
}

export interface DescriptionTexts {
  annotation: string
  sideDetail: string
  screenshotCaption: string
}
