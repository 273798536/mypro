export interface ProjectLedger {
  id: string
  name: string
  code: string
  startDate: string
  endDate: string
  budget: number
  status: 'active' | 'closed'
  source: string
  version: number
}

export interface TimeRecord {
  id: string
  projectId: string
  employeeName: string
  hours: number
  hourlyRate: number
  date: string
  isRetroactive: boolean
  retroactiveReason: string
  source: string
  version: number
}

export interface MaterialRequisition {
  id: string
  projectId: string
  materialName: string
  quantity: number
  unitPrice: number
  requisitionDate: string
  source: string
  version: number
}

export interface InvoiceVoucher {
  id: string
  projectId: string
  invoiceNumber: string
  amount: number
  category: string
  invoiceDate: string
  isMissing: boolean
  missingReason: string
  source: string
  version: number
}

export interface ExpenseSource {
  id: string
  type: 'time' | 'material' | 'invoice'
  amount: number
  label: string
}

export interface ExpenseAggregation {
  projectId: string
  laborCost: number
  materialCost: number
  otherCost: number
  totalCost: number
  laborSources: ExpenseSource[]
  materialSources: ExpenseSource[]
  otherSources: ExpenseSource[]
}

export interface ValidationAlert {
  id: string
  type: 'cross_project' | 'retroactive_entry' | 'missing_invoice'
  severity: 'error' | 'warning'
  sourceId: string
  sourceType: string
  message: string
  affectedProjectIds: string[]
  explanation: string
  resolved: boolean
}

export interface ChangeLogEntry {
  id: string
  timestamp: string
  operation: 'create' | 'update' | 'delete'
  entityType: 'project' | 'timeRecord' | 'material' | 'invoice'
  entityId: string
  entityName: string
  previousValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  affectedProjectIds: string[]
  snapshotId: string
}

export interface VersionSnapshot {
  id: string
  timestamp: string
  trigger: string
  aggregations: ExpenseAggregation[]
  dataHash: string
}

export type DataSourceTab = 'project' | 'timeRecord' | 'material' | 'invoice'
