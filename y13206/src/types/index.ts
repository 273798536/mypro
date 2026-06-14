export interface Remark {
  id: string
  content: string
  createdAt: string
}

export interface SupplementaryRemark {
  id: string
  content: string
  changeDescription: string
  createdAt: string
  operator: string
}

export type RecordStatus = 'normal' | 'conflict' | 'pending' | 'resolved'

export interface ConflictRecord {
  id: string
  songName: string
  songAlias: string[]
  timecodeStart: string
  timecodeEnd: string
  authPeriodStart: string
  authPeriodEnd: string
  status: RecordStatus
  exceptionReason: string
  remarks: Remark[]
  supplementaryRemarks: SupplementaryRemark[]
  contractScanUrl: string | null
  contractScanName: string | null
  createdAt: string
  updatedAt: string
}

export interface FilterCriteria {
  status: RecordStatus[]
  timecodeRangeStart: string
  timecodeRangeEnd: string
  keyword: string
  hasSupplementaryRemark: boolean | null
}

export interface ExportConfig {
  includeFilterCriteria: boolean
  selectedColumns: string[]
  includeSupplementaryRemarks: boolean
}

export interface AliasDuplicateGroup {
  alias: string
  records: ConflictRecord[]
}

export const DEFAULT_FILTER: FilterCriteria = {
  status: [],
  timecodeRangeStart: '',
  timecodeRangeEnd: '',
  keyword: '',
  hasSupplementaryRemark: null,
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeFilterCriteria: true,
  selectedColumns: [
    'songName', 'songAlias', 'timecodeStart', 'timecodeEnd',
    'authPeriodStart', 'authPeriodEnd', 'status', 'exceptionReason',
    'remarks', 'supplementaryRemarks', 'createdAt', 'updatedAt',
  ],
  includeSupplementaryRemarks: true,
}

export const COLUMN_LABELS: Record<string, string> = {
  songName: '曲名',
  songAlias: '别名',
  timecodeStart: '时码起点',
  timecodeEnd: '时码终点',
  authPeriodStart: '授权起始',
  authPeriodEnd: '授权截止',
  status: '状态',
  exceptionReason: '异常原因',
  remarks: '备注',
  supplementaryRemarks: '后补备注',
  createdAt: '创建时间',
  updatedAt: '更新时间',
}

export const STATUS_LABELS: Record<RecordStatus, string> = {
  normal: '正常',
  conflict: '排期冲突',
  pending: '待处理',
  resolved: '已解决',
}
