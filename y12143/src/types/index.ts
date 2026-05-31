export type LengthUnit = 'm' | 'mm' | 'cm'
export type FlowUnit = 'L/s' | 'm3/h' | 'm3/s'
export type PressureUnit = 'mH2O' | 'kPa' | 'MPa'

export interface UnitSpec<T extends string = string> {
  value: number
  unit: T
}

export interface PipeParams {
  designFlow: UnitSpec<FlowUnit>
  pipeDiameter: UnitSpec<LengthUnit>
  pipeLength: UnitSpec<LengthUnit>
  hazenWilliamsC: number
  staticHead: UnitSpec<LengthUnit>
  localResistanceCoeffs: LocalResistanceItem[]
  marginFactor: number
}

export interface LocalResistanceItem {
  id: string
  name: string
  coefficient: number
  quantity: number
}

export interface PipeParamsNormalized {
  designFlow: number
  pipeDiameter: number
  pipeLength: number
  hazenWilliamsC: number
  staticHead: number
  localResistanceCoeffs: LocalResistanceItem[]
  marginFactor: number
}

export type ImportBatchType = 'flow_and_diameter' | 'local_resistance'

export interface ImportBatch {
  id: string
  batchType: ImportBatchType
  importedAt: string
  rawData: Record<string, unknown>
  normalizedData: Partial<PipeParamsNormalized>
  changes: FieldChange[]
}

export interface FieldChange {
  fieldPath: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
}

export interface Correction {
  id: string
  fieldPath: string
  fieldLabel: string
  oldValue: string
  newValue: string
  correctedAt: string
  reason: string
}

export type TriggerType = 'import' | 'correction' | 'initial'

export interface CalculationSnapshot {
  id: string
  triggerType: TriggerType
  calculatedAt: string
  frictionLoss: number
  localLoss: number
  totalHeadLoss: number
  velocity: number
  reynolds: number
  requiredHead: number
  marginPercent: number
  matchedPumps: PumpMatchResult[]
  warnings: CalculationWarning[]
}

export type WarningSeverity = 'info' | 'warning' | 'error'

export interface CalculationWarning {
  severity: WarningSeverity
  code: string
  message: string
  field?: string
}

export interface PumpModel {
  id: string
  name: string
  series: string
  ratedFlow: number
  ratedHead: number
  efficiency: number
  validFrom: string
  validTo: string
  isExpired: boolean
  manufacturer: string
}

export interface PumpMatchResult {
  pumpId: string
  pumpName: string
  ratedFlow: number
  ratedHead: number
  efficiency: number
  marginPercent: number
  marginStatus: 'green' | 'yellow' | 'red'
  isExpired: boolean
}

export type MarginStatus = 'green' | 'yellow' | 'red'

export interface SchemeData {
  id: string
  label: string
  snapshot: CalculationSnapshot
  params: PipeParamsNormalized
}
