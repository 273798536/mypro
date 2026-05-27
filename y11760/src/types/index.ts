export type DataSource = '工商登记' | '股权穿透' | '合同库' | '核心系统' | '风控模型' | '尽调团队'

export type RiskSeverity = 'high' | 'medium' | 'low'

export type RiskLabelType = '循环担保' | '同人多企' | '逾期' | '诉讼' | '经营异常' | '标签遮挡'

export type GuaranteeType = '一般保证' | '连带责任' | '抵押担保' | '质押担保'

export type ContractStatus = '生效' | '到期' | '解除' | '诉讼中'

export type NodeType = 'enterprise' | 'person'

export interface Enterprise {
  id: string
  name: string
  industry: string
  registration: string
  legalRepresentative: string
  registeredCapital: number
  controlledBy: string
  dataSource: DataSource
}

export interface Person {
  id: string
  name: string
  idNumber: string
  relatedEnterprises: string[]
  dataSource: DataSource
}

export interface GuaranteeContract {
  id: string
  guarantorId: string
  guaranteedId: string
  guaranteeAmount: number
  guaranteeType: GuaranteeType
  startDate: string
  endDate: string
  status: ContractStatus
  dataSource: DataSource
}

export interface LoanBalance {
  id: string
  enterpriseId: string
  outstandingBalance: number
  totalLimit: number
  dueDate: string
  dataSource: DataSource
}

export interface RiskLabel {
  id: string
  targetId: string
  labelType: RiskLabelType
  severity: RiskSeverity
  description: string
  source: DataSource
  createdAt: string
}

export interface InvestigationReport {
  id: string
  contractId: string
  title: string
  summary: string
  author: string
  date: string
  dataSource: DataSource
}

export interface DataRevision {
  id: string
  targetEntityId: string
  targetField: string
  oldValue: string
  newValue: string
  reason: string
  operator: string
  timestamp: string
  sourceRef: string
}

export interface RiskScoreFactor {
  name: string
  weight: number
  rawValue: number
  contribution: number
  anomalySource: string | null
}

export interface RiskScore {
  id: string
  targetId: string
  totalScore: number
  factors: RiskScoreFactor[]
  calculatedAt: string
}

export interface GraphNode {
  id: string
  type: NodeType
  label: string
  position: [number, number, number]
  velocity?: [number, number, number]
  riskSeverity?: RiskSeverity
  filtered?: boolean
  selected?: boolean
  expanded?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  guaranteeAmount: number
  guaranteeType: GuaranteeType
  status: ContractStatus
  isCircular?: boolean
  highlighted?: boolean
}

export interface CircularGuarantee {
  id: string
  path: string[]
  totalAmount: number
  enterprises: string[]
}

export interface SamePersonMultiEnterprise {
  personId: string
  personName: string
  enterpriseIds: string[]
  internalGuaranteeAmount: number
}

export interface LabelOcclusion {
  highSeverityNodeId: string
  occludedByNodeId: string
  highSeverityLabel: string
}

export interface RiskAlert {
  type: 'circular' | 'samePerson' | 'occlusion'
  severity: RiskSeverity
  title: string
  description: string
  relatedNodes: string[]
  confirmed: boolean
  data: CircularGuarantee | SamePersonMultiEnterprise | LabelOcclusion
}

export interface FilterState {
  riskLevels: RiskSeverity[]
  industries: string[]
  guaranteeTypes: GuaranteeType[]
  balanceRange: [number, number]
  searchQuery: string
}

export interface PathNode {
  id: string
  type: NodeType
  label: string
  layer: number
  riskSeverity?: RiskSeverity
}

export interface PathEdge {
  source: string
  target: string
  amount: number
  type: GuaranteeType
}
