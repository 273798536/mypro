export interface LayerObject {
  id: string
  name: string
  type: 'robot' | 'wall' | 'door' | 'elevator' | 'station'
  x: number
  y: number
  width: number
  height: number
  layerId: string
}

export interface CadLayer {
  id: string
  name: string
  importedAt: string
  isSupplement: boolean
  coordinateSystem: string
  coordinateValid: boolean
  objects: LayerObject[]
  conflictsWith?: string[]
}

export interface Judgment {
  id: string
  version: string
  content: string
  madeAt: string
  madeBy: string
  basedOnLayers: string[]
  isWithdrawn: boolean
  isManualOverride: boolean
  overrideReason?: string
  overriddenBy?: string
}

export interface Withdrawal {
  id: string
  judgmentId: string
  reason: string
  withdrawnAt: string
  withdrawnBy: string
  impacts: string[]
}

export interface OverlapStep {
  order: number
  instruction: string
  codeHint?: string
  completed: boolean
}

export interface ObjectOverlap {
  id: string
  severity: 'critical' | 'warning' | 'minor'
  objectA: string
  objectB: string
  layerA: string
  layerB: string
  steps: OverlapStep[]
  status: 'pending' | 'processing' | 'resolved'
}

export interface Hotspot {
  id: string
  x: number
  y: number
  width: number
  height: number
  targetObjectId: string
  label: string
}

export interface FilterCondition {
  visibleLayers: string[]
  coordinateSystem: string
  showGrid: boolean
  zoomLevel: number
}

export interface ReviewSnapshot {
  id: string
  name: string
  createdAt: string
  screenshotUrl: string
  hotspots: Hotspot[]
  filterCondition: FilterCondition
}

export interface ProcessedItem {
  id: string
  title: string
  processedAt: string
  processedBy: string
  note: string
}

export interface PendingMaterial {
  id: string
  title: string
  description: string
  expectedDate?: string
  contact?: string
}

export interface ManualOverride {
  id: string
  originalJudgment: string
  overrideJudgment: string
  reason: string
  overriddenBy: string
  overriddenAt: string
}

export interface MaterialPath {
  id: string
  label: string
  path: string
  description: string
}

export interface AnomalyLocation {
  id: string
  layerName: string
  coordinates: string
  relatedObject: string
  description: string
}

export interface ExportMode {
  id: string
  name: string
  description: string
  params: Record<string, string>
}

export interface HandoverNavigation {
  materialPaths: MaterialPath[]
  anomalyLocations: AnomalyLocation[]
  exportModes: ExportMode[]
}

export interface HandoverReport {
  projectName: string
  generatedAt: string
  generatedBy: string
  processed: ProcessedItem[]
  pendingMaterials: PendingMaterial[]
  manualOverrides: ManualOverride[]
  navigation: HandoverNavigation
}
