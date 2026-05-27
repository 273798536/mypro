import type {
  Project,
  ReservedInstance,
  SharedGateway,
  CloudBill,
  Anomaly,
  AmortizationRecord,
  Correction,
  ImportLog,
} from '../types'

export const projects: Project[] = [
  {
    id: 'proj-ecommerce',
    name: '电商平台',
    code: 'EC-001',
    description: '核心电商交易平台，包含商品展示、购物车、订单管理等功能',
    owner: '张伟',
    tags: [
      { key: 'department', value: '技术部' },
      { key: 'business', value: '电商' },
      { key: 'level', value: 'P0' },
    ],
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'proj-usercenter',
    name: '用户中心',
    code: 'UC-002',
    description: '统一用户管理系统，负责用户注册、登录、权限管理',
    owner: '李娜',
    tags: [
      { key: 'department', value: '技术部' },
      { key: 'business', value: '基础服务' },
      { key: 'level', value: 'P0' },
    ],
    createdAt: '2024-02-20T00:00:00Z',
  },
  {
    id: 'proj-payment',
    name: '支付网关',
    code: 'PG-003',
    description: '多渠道支付接入系统，支持微信、支付宝、银联等支付方式',
    owner: '王强',
    tags: [
      { key: 'department', value: '金融部' },
      { key: 'business', value: '支付' },
      { key: 'level', value: 'P0' },
    ],
    createdAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'proj-analytics',
    name: '数据分析',
    code: 'DA-004',
    description: '大数据分析平台，提供用户行为分析、业务报表等功能',
    owner: '刘芳',
    tags: [
      { key: 'department', value: '数据部' },
      { key: 'business', value: '分析' },
      { key: 'level', value: 'P1' },
    ],
    createdAt: '2024-04-05T00:00:00Z',
  },
  {
    id: 'proj-message',
    name: '消息推送',
    code: 'MP-005',
    description: '统一消息推送系统，支持短信、邮件、APP推送等多种渠道',
    owner: '陈明',
    tags: [
      { key: 'department', value: '技术部' },
      { key: 'business', value: '基础服务' },
      { key: 'level', value: 'P1' },
    ],
    createdAt: '2024-05-12T00:00:00Z',
  },
  {
    id: 'proj-ops',
    name: '运维平台',
    code: 'OP-006',
    description: '运维管理平台，包含监控、告警、自动化部署等功能',
    owner: '赵军',
    tags: [
      { key: 'department', value: '运维部' },
      { key: 'business', value: '基础设施' },
      { key: 'level', value: 'P1' },
    ],
    createdAt: '2024-06-01T00:00:00Z',
  },
]

export const reservedInstances: ReservedInstance[] = [
  {
    id: 'ri-ecs-c5-2025',
    instanceType: 'ecs.c5.2xlarge',
    region: 'cn-hangzhou',
    count: 8,
    totalCost: 115200,
    effectiveDate: '2025-01-01T00:00:00Z',
    expirationDate: '2025-12-31T23:59:59Z',
  },
  {
    id: 'ri-rds-mysql-2025',
    instanceType: 'rds.mysql.c5.2xlarge',
    region: 'cn-hangzhou',
    count: 4,
    totalCost: 86400,
    effectiveDate: '2025-03-01T00:00:00Z',
    expirationDate: '2026-02-28T23:59:59Z',
  },
  {
    id: 'ri-redis-2025',
    instanceType: 'redis.standard.2xlarge',
    region: 'cn-hangzhou',
    count: 6,
    totalCost: 57600,
    effectiveDate: '2025-06-01T00:00:00Z',
    expirationDate: '2026-05-31T23:59:59Z',
  },
  {
    id: 'ri-ecs-g6-2026',
    instanceType: 'ecs.g6.4xlarge',
    region: 'cn-shanghai',
    count: 4,
    totalCost: 92160,
    effectiveDate: '2025-11-01T00:00:00Z',
    expirationDate: '2026-10-31T23:59:59Z',
  },
]

export const sharedGateways: SharedGateway[] = [
  {
    id: 'gw-api-main',
    name: '主API网关',
    type: 'api',
    totalCost: 18000,
    allocationRule: '按流量比例分摊',
    projects: ['proj-ecommerce', 'proj-usercenter', 'proj-payment'],
  },
  {
    id: 'gw-network-core',
    name: '核心网络网关',
    type: 'network',
    totalCost: 25000,
    allocationRule: '按接入资源数均摊',
    projects: ['proj-ecommerce', 'proj-usercenter', 'proj-payment', 'proj-analytics', 'proj-message', 'proj-ops'],
  },
  {
    id: 'gw-db-shared',
    name: '共享数据库网关',
    type: 'database',
    totalCost: 12000,
    allocationRule: '按连接数比例分摊',
    projects: ['proj-ecommerce', 'proj-usercenter', 'proj-analytics'],
  },
]

export const cloudBills: CloudBill[] = [
  {
    id: 'bill-2025-11',
    billDate: '2025-11-01T00:00:00Z',
    totalAmount: 98600,
    paidAmount: 98600,
    discountAmount: 5200,
    provider: 'aliyun',
    status: 'paid',
    items: [
      { productName: '云服务器ECS', amount: 45000, tags: [{ key: 'service', value: 'ecs' }] },
      { productName: '云数据库RDS', amount: 22000, tags: [{ key: 'service', value: 'rds' }] },
      { productName: '对象存储OSS', amount: 8600, tags: [{ key: 'service', value: 'oss' }] },
      { productName: '负载均衡SLB', amount: 6800, tags: [{ key: 'service', value: 'slb' }] },
      { productName: '云数据库Redis', amount: 16200, tags: [{ key: 'service', value: 'redis' }] },
    ],
  },
  {
    id: 'bill-2025-12',
    billDate: '2025-12-01T00:00:00Z',
    totalAmount: 112300,
    paidAmount: 112300,
    discountAmount: 6100,
    provider: 'aliyun',
    status: 'paid',
    items: [
      { productName: '云服务器ECS', amount: 52000, tags: [{ key: 'service', value: 'ecs' }] },
      { productName: '云数据库RDS', amount: 24500, tags: [{ key: 'service', value: 'rds' }] },
      { productName: '对象存储OSS', amount: 9800, tags: [{ key: 'service', value: 'oss' }] },
      { productName: '负载均衡SLB', amount: 7200, tags: [{ key: 'service', value: 'slb' }] },
      { productName: '云数据库Redis', amount: 18800, tags: [{ key: 'service', value: 'redis' }] },
    ],
  },
  {
    id: 'bill-2026-01',
    billDate: '2026-01-01T00:00:00Z',
    totalAmount: 105800,
    paidAmount: 105800,
    discountAmount: 5800,
    provider: 'aliyun',
    status: 'paid',
    items: [
      { productName: '云服务器ECS', amount: 48500, tags: [{ key: 'service', value: 'ecs' }] },
      { productName: '云数据库RDS', amount: 23200, tags: [{ key: 'service', value: 'rds' }] },
      { productName: '对象存储OSS', amount: 9200, tags: [{ key: 'service', value: 'oss' }] },
      { productName: '负载均衡SLB', amount: 7000, tags: [{ key: 'service', value: 'slb' }] },
      { productName: '云数据库Redis', amount: 17900, tags: [{ key: 'service', value: 'redis' }] },
    ],
  },
  {
    id: 'bill-2026-02',
    billDate: '2026-02-01T00:00:00Z',
    totalAmount: 92400,
    paidAmount: 92400,
    discountAmount: 4900,
    provider: 'aliyun',
    status: 'paid',
    items: [
      { productName: '云服务器ECS', amount: 42000, tags: [{ key: 'service', value: 'ecs' }] },
      { productName: '云数据库RDS', amount: 21000, tags: [{ key: 'service', value: 'rds' }] },
      { productName: '对象存储OSS', amount: 8200, tags: [{ key: 'service', value: 'oss' }] },
      { productName: '负载均衡SLB', amount: 6500, tags: [{ key: 'service', value: 'slb' }] },
      { productName: '云数据库Redis', amount: 14700, tags: [{ key: 'service', value: 'redis' }] },
    ],
  },
  {
    id: 'bill-2026-03',
    billDate: '2026-03-01T00:00:00Z',
    totalAmount: 128500,
    paidAmount: 128500,
    discountAmount: 7200,
    provider: 'aliyun',
    status: 'paid',
    items: [
      { productName: '云服务器ECS', amount: 58000, tags: [{ key: 'service', value: 'ecs' }] },
      { productName: '云数据库RDS', amount: 28500, tags: [{ key: 'service', value: 'rds' }] },
      { productName: '对象存储OSS', amount: 11200, tags: [{ key: 'service', value: 'oss' }] },
      { productName: '负载均衡SLB', amount: 8100, tags: [{ key: 'service', value: 'slb' }] },
      { productName: '云数据库Redis', amount: 22700, tags: [{ key: 'service', value: 'redis' }] },
    ],
  },
  {
    id: 'bill-2026-04',
    billDate: '2026-04-01T00:00:00Z',
    totalAmount: 118200,
    paidAmount: 118200,
    discountAmount: 6500,
    provider: 'aliyun',
    status: 'paid',
    items: [
      { productName: '云服务器ECS', amount: 54000, tags: [{ key: 'service', value: 'ecs' }] },
      { productName: '云数据库RDS', amount: 26200, tags: [{ key: 'service', value: 'rds' }] },
      { productName: '对象存储OSS', amount: 10500, tags: [{ key: 'service', value: 'oss' }] },
      { productName: '负载均衡SLB', amount: 7600, tags: [{ key: 'service', value: 'slb' }] },
      { productName: '云数据库Redis', amount: 19900, tags: [{ key: 'service', value: 'redis' }] },
    ],
  },
]

const periods = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04']

const amortizationBase = {
  'proj-ecommerce': { reserved: 3500, shared: 2800, direct: 12000 },
  'proj-usercenter': { reserved: 2200, shared: 1800, direct: 8500 },
  'proj-payment': { reserved: 2800, shared: 2200, direct: 9800 },
  'proj-analytics': { reserved: 1800, shared: 1500, direct: 7200 },
  'proj-message': { reserved: 1500, shared: 1200, direct: 5800 },
  'proj-ops': { reserved: 1200, shared: 1000, direct: 4500 },
}

const periodVariations: Record<string, number> = {
  '2025-11': 1.0,
  '2025-12': 1.12,
  '2026-01': 1.05,
  '2026-02': 0.92,
  '2026-03': 1.25,
  '2026-04': 1.15,
}

function generateAmortizationRecords(): AmortizationRecord[] {
  const records: AmortizationRecord[] = []
  let index = 1

  for (const period of periods) {
    const variation = periodVariations[period]
    for (const project of projects) {
      const base = amortizationBase[project.id as keyof typeof amortizationBase]
      const reserved = Math.round(base.reserved * variation)
      const shared = Math.round(base.shared * variation)
      const direct = Math.round(base.direct * variation)
      const total = reserved + shared + direct

      records.push({
        id: `amort-${period}-${String(index).padStart(3, '0')}`,
        period,
        projectId: project.id,
        totalAmount: total,
        reservedDeduction: reserved,
        sharedAllocation: shared,
        directCost: direct,
        sources: {
          reservedInstanceId: reserved > 0 ? 'ri-ecs-c5-2025' : undefined,
          sharedGatewayId: shared > 0 ? 'gw-network-core' : undefined,
        },
        tags: [...project.tags, { key: 'period', value: period }],
        createdAt: `${period}-05T10:30:00Z`,
        updatedAt: `${period}-10T14:20:00Z`,
      })
      index++
    }
  }
  return records
}

export const amortizationRecords: AmortizationRecord[] = generateAmortizationRecords()

export const anomalies: Anomaly[] = [
  {
    id: 'anomaly-001',
    type: 'missing_tag',
    severity: 'warning',
    projectId: 'proj-analytics',
    amortizationId: 'amort-2025-11-004',
    description: '摊销记录缺少业务标签，无法准确归集成本',
    detectedAt: '2025-11-06T09:15:00Z',
    resolved: false,
  },
  {
    id: 'anomaly-002',
    type: 'missing_tag',
    severity: 'warning',
    projectId: 'proj-message',
    amortizationId: 'amort-2025-12-005',
    description: '消息推送服务部分资源未正确打标，影响分摊准确性',
    detectedAt: '2025-12-06T10:45:00Z',
    resolved: true,
    resolvedAt: '2025-12-08T16:30:00Z',
  },
  {
    id: 'anomaly-003',
    type: 'missing_tag',
    severity: 'error',
    projectId: 'proj-ecommerce',
    billId: 'bill-2026-03',
    description: '电商平台核心计费资源缺失部门标签，导致成本无法分摊',
    detectedAt: '2026-03-05T08:30:00Z',
    resolved: false,
  },
  {
    id: 'anomaly-004',
    type: 'deduction_error',
    severity: 'error',
    projectId: 'proj-payment',
    amortizationId: 'amort-2026-01-003',
    description: '预留实例抵扣金额计算错误，多抵扣了3500元',
    amount: 3500,
    detectedAt: '2026-01-11T11:20:00Z',
    resolved: true,
    resolvedAt: '2026-01-12T09:45:00Z',
  },
  {
    id: 'anomaly-005',
    type: 'deduction_error',
    severity: 'warning',
    projectId: 'proj-usercenter',
    amortizationId: 'amort-2026-02-002',
    description: '共享网关分摊比例异常，可能存在配置错误',
    amount: 1200,
    detectedAt: '2026-02-11T14:10:00Z',
    resolved: false,
  },
  {
    id: 'anomaly-006',
    type: 'peak_cost',
    severity: 'info',
    projectId: 'proj-ecommerce',
    amortizationId: 'amort-2026-03-001',
    description: '3月电商平台成本较上月增长25%，主要由于促销活动导致资源使用增加',
    amount: 5200,
    detectedAt: '2026-03-11T09:30:00Z',
    resolved: true,
    resolvedAt: '2026-03-12T11:00:00Z',
  },
]

export const corrections: Correction[] = [
  {
    id: 'correction-001',
    targetType: 'amortization',
    targetId: 'amort-2025-12-005',
    operator: '李娜',
    reason: '补充缺失的资源标签',
    changeSummary: '为消息推送服务的12台ECS实例添加了业务标签',
    createdAt: '2025-12-08T16:30:00Z',
  },
  {
    id: 'correction-002',
    targetType: 'amortization',
    targetId: 'amort-2026-01-003',
    operator: '王强',
    reason: '修正预留实例抵扣计算错误',
    changeSummary: '将多抵扣的3500元调整至正确金额，实际应为2800元',
    createdAt: '2026-01-12T09:45:00Z',
  },
  {
    id: 'correction-003',
    targetType: 'anomaly',
    targetId: 'anomaly-006',
    operator: '张伟',
    reason: '确认峰值成本异常为正常业务波动',
    changeSummary: '3月促销活动导致资源使用增加25%，属于预期内增长',
    createdAt: '2026-03-12T11:00:00Z',
  },
  {
    id: 'correction-004',
    targetType: 'bill',
    targetId: 'bill-2026-02',
    operator: '赵军',
    reason: '账单金额核对调整',
    changeSummary: '发现阿里云账单中RDS实例计费有误，已联系客服调整，涉及金额2100元',
    createdAt: '2026-02-20T15:20:00Z',
  },
  {
    id: 'correction-005',
    targetType: 'amortization',
    targetId: 'amort-2025-11-001',
    operator: '张伟',
    reason: '修正分摊规则配置',
    changeSummary: '更新电商平台的共享网关分摊比例，从40%调整为38%',
    createdAt: '2025-11-15T10:15:00Z',
  },
]

export const importLogs: ImportLog[] = [
  {
    id: 'import-001',
    type: 'bill',
    fileName: 'aliyun_bill_202511.xlsx',
    recordCount: 128,
    successCount: 126,
    errorCount: 2,
    operator: '赵军',
    status: 'partial',
    createdAt: '2025-12-01T09:00:00Z',
  },
  {
    id: 'import-002',
    type: 'reservation',
    fileName: 'reserved_instances_2026Q1.xlsx',
    recordCount: 12,
    successCount: 12,
    errorCount: 0,
    operator: '赵军',
    status: 'success',
    createdAt: '2025-12-15T14:30:00Z',
  },
  {
    id: 'import-003',
    type: 'bill',
    fileName: 'aliyun_bill_202512.xlsx',
    recordCount: 135,
    successCount: 135,
    errorCount: 0,
    operator: '赵军',
    status: 'success',
    createdAt: '2026-01-01T09:00:00Z',
  },
  {
    id: 'import-004',
    type: 'gateway',
    fileName: 'gateway_usage_202512.csv',
    recordCount: 48,
    successCount: 48,
    errorCount: 0,
    operator: '陈明',
    status: 'success',
    createdAt: '2026-01-05T11:20:00Z',
  },
  {
    id: 'import-005',
    type: 'bill',
    fileName: 'aliyun_bill_202603.xlsx',
    recordCount: 156,
    successCount: 152,
    errorCount: 4,
    operator: '赵军',
    status: 'partial',
    createdAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 'import-006',
    type: 'bill',
    fileName: 'aliyun_bill_202604.xlsx',
    recordCount: 148,
    successCount: 148,
    errorCount: 0,
    operator: '赵军',
    status: 'success',
    createdAt: '2026-05-01T09:00:00Z',
  },
]
