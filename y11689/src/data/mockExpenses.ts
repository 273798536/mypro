import { Expense, Revision } from '../types';

const categories = ['研发', '市场', '运营', '人力', '行政', '服务器', '外包'];
const owners = ['owner-001', 'owner-002', 'owner-003', 'owner-004', 'owner-005'];
const sources = ['发票', '报销单', '采购订单', '合同', '工资条'];
const descriptions = [
  '服务器租赁费用',
  '研发人员工资',
  '市场推广费用',
  '办公场地租金',
  '差旅费用',
  '外包服务费用',
  '软件授权费用',
  '团建活动费用',
  '培训费用',
  '设备采购'
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

export const mockExpenses: Expense[] = [
  {
    id: 'exp-001',
    projectId: 'proj-001',
    date: '2024-01-05',
    amount: 85000,
    category: '研发',
    description: '研发人员1月工资',
    owner: 'owner-002',
    source: '工资条',
    revisionHistory: [],
    createdAt: '2024-01-05T09:00:00Z'
  },
  {
    id: 'exp-002',
    projectId: 'proj-001',
    date: '2024-01-08',
    amount: 25000,
    category: '服务器',
    description: '云服务器月费',
    owner: 'owner-002',
    source: '发票',
    revisionHistory: [],
    createdAt: '2024-01-08T14:30:00Z'
  },
  {
    id: 'exp-003',
    projectId: 'proj-001',
    date: '2024-01-10',
    amount: 25000,
    category: '服务器',
    description: '云服务器月费',
    owner: 'owner-002',
    source: '发票',
    isDuplicate: true,
    revisionHistory: [
      generateRevision('amount', 20000, 25000, '服务器升级')
    ],
    createdAt: '2024-01-10T14:35:00Z'
  },
  {
    id: 'exp-004',
    projectId: 'proj-001',
    date: '2024-01-15',
    amount: 50000,
    category: '市场',
    description: '春节营销活动费用',
    owner: 'owner-004',
    source: '采购订单',
    revisionHistory: [],
    createdAt: '2024-01-15T11:00:00Z'
  },
  {
    id: 'exp-005',
    projectId: 'proj-001',
    date: '2024-02-05',
    amount: 88000,
    category: '研发',
    description: '研发人员2月工资',
    owner: 'owner-002',
    source: '工资条',
    revisionHistory: [],
    createdAt: '2024-02-05T09:00:00Z'
  },
  {
    id: 'exp-006',
    projectId: 'proj-001',
    date: '2024-02-10',
    amount: 35000,
    category: '外包',
    description: 'UI设计外包费用',
    owner: 'owner-001',
    source: '合同',
    revisionHistory: [
      generateRevision('amount', 30000, 35000, '需求变更增加设计稿')
    ],
    createdAt: '2024-02-10T16:00:00Z'
  },
  {
    id: 'exp-007',
    projectId: 'proj-001',
    date: '2024-03-05',
    amount: 92000,
    category: '研发',
    description: '研发人员3月工资',
    owner: 'owner-002',
    source: '工资条',
    revisionHistory: [],
    createdAt: '2024-03-05T09:00:00Z'
  },
  {
    id: 'exp-008',
    projectId: 'proj-001',
    date: '2024-03-15',
    amount: 120000,
    category: '市场',
    description: '春季发布会费用',
    owner: 'owner-004',
    source: '采购订单',
    revisionHistory: [
      generateRevision('amount', 100000, 120000, '场地费用超支'),
      generateRevision('description', '发布会费用', '春季发布会费用', '细化描述')
    ],
    createdAt: '2024-03-15T10:00:00Z'
  },
  {
    id: 'exp-009',
    projectId: 'proj-001',
    date: '2024-04-05',
    amount: 95000,
    category: '研发',
    description: '研发人员4月工资',
    owner: 'owner-002',
    source: '工资条',
    revisionHistory: [],
    createdAt: '2024-04-05T09:00:00Z'
  },
  {
    id: 'exp-010',
    projectId: 'proj-001',
    date: '2024-04-20',
    amount: 45000,
    category: '运营',
    description: '用户增长推广费用',
    owner: 'owner-005',
    source: '报销单',
    revisionHistory: [],
    createdAt: '2024-04-20T14:00:00Z'
  },
  {
    id: 'exp-011',
    projectId: 'proj-001',
    date: '2024-05-05',
    amount: 98000,
    category: '研发',
    description: '研发人员5月工资',
    owner: 'owner-002',
    source: '工资条',
    revisionHistory: [],
    createdAt: '2024-05-05T09:00:00Z'
  },
  {
    id: 'exp-012',
    projectId: 'proj-001',
    date: '2024-05-15',
    amount: 80000,
    category: '外包',
    description: '后端开发外包费用',
    owner: 'owner-002',
    source: '合同',
    revisionHistory: [],
    createdAt: '2024-05-15T11:00:00Z'
  },
  {
    id: 'exp-013',
    projectId: 'proj-001',
    date: '2024-06-05',
    amount: 102000,
    category: '研发',
    description: '研发人员6月工资',
    owner: 'owner-002',
    source: '工资条',
    revisionHistory: [],
    createdAt: '2024-06-05T09:00:00Z'
  },
  {
    id: 'exp-014',
    projectId: 'proj-001',
    date: '2024-06-10',
    amount: 55000,
    category: '市场',
    description: '618营销活动费用',
    owner: 'owner-004',
    source: '采购订单',
    revisionHistory: [
      generateRevision('amount', 50000, 55000, '增加投放渠道')
    ],
    createdAt: '2024-06-10T16:00:00Z'
  },
  {
    id: 'exp-015',
    projectId: 'proj-001',
    date: '2024-06-20',
    amount: 30000,
    category: '行政',
    description: '办公设备更新',
    owner: 'owner-003',
    source: '发票',
    revisionHistory: [],
    createdAt: '2024-06-20T10:00:00Z'
  }
];

for (let i = 16; i <= 30; i++) {
  const date = new Date('2024-07-01');
  date.setDate(date.getDate() + (i - 16) * 5);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const owner = owners[Math.floor(Math.random() * owners.length)];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  const amount = Math.round(20000 + Math.random() * 100000);

  mockExpenses.push({
    id: `exp-${String(i).padStart(3, '0')}`,
    projectId: 'proj-001',
    date: date.toISOString().split('T')[0],
    amount,
    category,
    description,
    owner,
    source,
    revisionHistory: Math.random() > 0.7 ? [
      generateRevision('amount', Math.round(amount * 0.9), amount, '金额调整')
    ] : [],
    createdAt: date.toISOString()
  });
}
