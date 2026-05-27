import { RevenueForecast, Revision } from '../types';

const owners = ['owner-001', 'owner-003', 'owner-004', 'owner-005'];
const sources = ['销售合同', '收入预测表', '客户订单', '财务系统'];
const descriptions = [
  '企业客户订阅收入',
  '定制化开发项目',
  '技术服务收入',
  'API调用费用',
  '咨询服务收入',
  '培训服务收入',
  '合作伙伴分成',
  '广告收入'
];

const generateRevision = (field: string, oldVal: any, newVal: any, reason: string): Revision => ({
  id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
  field,
  oldValue: oldVal,
  newValue: newVal,
  reason,
  operator: owners[Math.floor(Math.random() * owners.length)]
});

export const mockRevenues: RevenueForecast[] = [
  {
    id: 'rev-001',
    projectId: 'proj-001',
    date: '2024-01-15',
    forecastAmount: 200000,
    actualAmount: 200000,
    description: 'A公司年度订阅服务',
    owner: 'owner-004',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'rev-002',
    projectId: 'proj-001',
    date: '2024-02-20',
    forecastAmount: 350000,
    actualAmount: 350000,
    description: 'B公司定制化开发项目',
    owner: 'owner-001',
    source: '销售合同',
    revisionHistory: [
      generateRevision('forecastAmount', 300000, 350000, '客户追加需求')
    ],
    createdAt: '2024-02-01T14:00:00Z'
  },
  {
    id: 'rev-003',
    projectId: 'proj-001',
    date: '2024-03-10',
    forecastAmount: 150000,
    actualAmount: 150000,
    description: 'C公司技术咨询服务',
    owner: 'owner-004',
    source: '客户订单',
    revisionHistory: [],
    createdAt: '2024-03-05T09:00:00Z'
  },
  {
    id: 'rev-004',
    projectId: 'proj-001',
    date: '2024-03-25',
    forecastAmount: 500000,
    actualAmount: 480000,
    description: 'D公司平台API服务年费',
    owner: 'owner-004',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-03-15T16:00:00Z'
  },
  {
    id: 'rev-005',
    projectId: 'proj-001',
    date: '2024-04-15',
    forecastAmount: 280000,
    actualAmount: 280000,
    description: 'E公司培训服务包',
    owner: 'owner-005',
    source: '客户订单',
    revisionHistory: [],
    createdAt: '2024-04-01T11:00:00Z'
  },
  {
    id: 'rev-006',
    projectId: 'proj-001',
    date: '2024-05-01',
    forecastAmount: 400000,
    isDelayed: true,
    expectedDate: '2024-06-15',
    description: 'F公司大型定制项目首付款',
    owner: 'owner-001',
    source: '销售合同',
    revisionHistory: [
      generateRevision('date', '2024-05-01', '2024-06-15', '客户内部审批延迟')
    ],
    createdAt: '2024-04-20T10:00:00Z'
  },
  {
    id: 'rev-007',
    projectId: 'proj-001',
    date: '2024-05-20',
    forecastAmount: 180000,
    actualAmount: 180000,
    description: 'G公司SaaS订阅季度费',
    owner: 'owner-004',
    source: '财务系统',
    revisionHistory: [],
    createdAt: '2024-05-10T14:00:00Z'
  },
  {
    id: 'rev-008',
    projectId: 'proj-001',
    date: '2024-06-10',
    forecastAmount: 320000,
    actualAmount: 320000,
    description: 'H公司技术服务费',
    owner: 'owner-001',
    source: '客户订单',
    revisionHistory: [
      generateRevision('forecastAmount', 300000, 320000, '额外服务模块')
    ],
    createdAt: '2024-06-01T09:00:00Z'
  },
  {
    id: 'rev-009',
    projectId: 'proj-001',
    date: '2024-06-25',
    forecastAmount: 250000,
    isDelayed: true,
    expectedDate: '2024-07-10',
    description: 'I公司合作伙伴分成',
    owner: 'owner-003',
    source: '收入预测表',
    revisionHistory: [
      generateRevision('date', '2024-06-25', '2024-07-10', '合作伙伴财务流程延迟')
    ],
    createdAt: '2024-06-15T11:00:00Z'
  },
  {
    id: 'rev-010',
    projectId: 'proj-001',
    date: '2024-07-05',
    forecastAmount: 450000,
    description: 'J公司年度续约合同',
    owner: 'owner-004',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-06-20T16:00:00Z'
  },
  {
    id: 'rev-011',
    projectId: 'proj-001',
    date: '2024-07-20',
    forecastAmount: 380000,
    description: 'K公司新功能定制开发',
    owner: 'owner-001',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-07-01T10:00:00Z'
  },
  {
    id: 'rev-012',
    projectId: 'proj-001',
    date: '2024-08-10',
    forecastAmount: 520000,
    description: 'L公司企业版订阅',
    owner: 'owner-004',
    source: '收入预测表',
    revisionHistory: [],
    createdAt: '2024-07-15T14:00:00Z'
  },
  {
    id: 'rev-013',
    projectId: 'proj-001',
    date: '2024-09-01',
    forecastAmount: 290000,
    description: 'M公司咨询服务包',
    owner: 'owner-005',
    source: '客户订单',
    revisionHistory: [],
    createdAt: '2024-08-20T09:00:00Z'
  },
  {
    id: 'rev-014',
    projectId: 'proj-001',
    date: '2024-09-25',
    forecastAmount: 600000,
    description: 'N公司平台使用费年费',
    owner: 'owner-004',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-09-01T11:00:00Z'
  },
  {
    id: 'rev-015',
    projectId: 'proj-001',
    date: '2024-10-15',
    forecastAmount: 350000,
    description: 'O公司培训服务',
    owner: 'owner-005',
    source: '收入预测表',
    revisionHistory: [],
    createdAt: '2024-09-20T16:00:00Z'
  },
  {
    id: 'rev-016',
    projectId: 'proj-001',
    date: '2024-11-05',
    forecastAmount: 480000,
    description: 'P公司定制开发项目',
    owner: 'owner-001',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-10-01T10:00:00Z'
  },
  {
    id: 'rev-017',
    projectId: 'proj-001',
    date: '2024-11-20',
    forecastAmount: 420000,
    description: 'Q公司SaaS订阅续约',
    owner: 'owner-004',
    source: '财务系统',
    revisionHistory: [],
    createdAt: '2024-10-25T14:00:00Z'
  },
  {
    id: 'rev-018',
    projectId: 'proj-001',
    date: '2024-12-10',
    forecastAmount: 550000,
    description: 'R公司年度服务包',
    owner: 'owner-004',
    source: '销售合同',
    revisionHistory: [],
    createdAt: '2024-11-15T09:00:00Z'
  }
];
