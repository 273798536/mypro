export interface TraceSource {
  type: 'formula' | 'color_rule' | 'exhibit_screenshot'
  label: string
  reference: string
  detail: string
}

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  source: TraceSource
}

export interface SurfaceDefinition {
  id: string
  name: string
  formula: string
  formulaSource: TraceSource
  paramDefs: ParamDef[]
  computeVertex: (params: Record<string, number>, u: number, v: number) => [number, number, number]
  defaultParams: Record<string, number>
  uRange: [number, number]
  vRange: [number, number]
  colorRule: TraceSource
}

export interface ProtectionRule {
  id: string
  surfaceId: string
  paramKey: string
  condition: 'range' | 'explosion' | 'discontinuity'
  threshold: number
  action: 'warn' | 'block' | 'clamp'
  source: TraceSource
  message: string
}

export interface ProtectionResult {
  ruleId: string
  triggered: boolean
  action: 'warn' | 'block' | 'clamp'
  message: string
  source: TraceSource
  clampedValue?: number
}

export interface CrossSectionPoint {
  x: number
  y: number
  z: number
}

export interface CrossSectionData {
  axis: 'x' | 'y' | 'z'
  position: number
  points: CrossSectionPoint[]
  status: 'normal' | 'broken' | 'misleading'
  breakIndices: number[]
}

export interface HistoryEntry {
  id: string
  timestamp: number
  surfaceId: string
  params: Record<string, number>
  protectionTriggers: string[]
  crossSectionStatus: 'normal' | 'broken' | 'misleading'
  paramHash: string
}

export interface DirtyTestResult {
  id: string
  timestamp: number
  inputParams: Record<string, number>
  surfaceId: string
  results: ProtectionResult[]
  passed: boolean
  missedExplosion: boolean
}

export interface AppState {
  activeSurfaceId: string
  params: Record<string, number>
  timelinePosition: number
  history: HistoryEntry[]
  isPlaying: boolean
  playbackSpeed: number
  crossSectionAxis: 'x' | 'y' | 'z'
  crossSectionPosition: number
  setActiveSurface: (id: string) => void
  setParam: (key: string, value: number) => void
  setParams: (params: Record<string, number>) => void
  setTimelinePosition: (pos: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setCrossSectionAxis: (axis: 'x' | 'y' | 'z') => void
  setCrossSectionPosition: (pos: number) => void
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'paramHash'>) => void
  clearHistory: () => void
}
