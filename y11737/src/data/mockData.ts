import dayjs from 'dayjs';
import type { Bill, DiscountRateConfig } from '@/types';
import { calculateDiscountInterest } from '@/services/calculationService';

export const DISCOUNT_RATES: DiscountRateConfig[] = [
  {
    version: 'v2.1',
    effectiveDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    rate: 3.25,
    isActive: true,
  },
  {
    version: 'v2.0',
    effectiveDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    rate: 3.15,
    isActive: false,
  },
  {
    version: 'v1.0',
    effectiveDate: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
    rate: 3.00,
    isActive: false,
  },
];

export const LATEST_RATE_VERSION = 'v2.1';
export const ACTIVE_RATE = 3.25;

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function createEndorsements(
  count: number,
  hasBreak: boolean = false,
  breakAt: number = 1
): Bill['endorsements'] {
  const companies = [
    '上海华源贸易有限公司',
    '江苏恒达物流有限公司',
    '浙江鑫源建材有限公司',
    '安徽鸿远科技有限公司',
    '山东盛达包装有限公司',
    '广东顺通电子有限公司',
  ];
  
  const endorsements: Bill['endorsements'] = [];
  
  for (let i = 0; i < count; i++) {
    let endorsee = companies[(i + 1) % companies.length];
    
    if (hasBreak && i === breakAt - 1) {
      endorsee = '断裂公司名称';
    }
    
    endorsements.push({
      id: generateId(),
      sequence: i + 1,
      endorser: companies[i % companies.length],
      endorsee: endorsee,
      date: dayjs().subtract(count - i, 'day').format('YYYY-MM-DD'),
    });
  }
  
  return endorsements;
}

export const MOCK_BILLS: Bill[] = [
  {
    id: generateId(),
    billNumber: '1234567890123456',
    amount: 1000000,
    issueDate: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(90, 'day').format('YYYY-MM-DD'),
    applicant: '上海华源贸易有限公司',
    discountRate: ACTIVE_RATE,
    discountRateVersion: LATEST_RATE_VERSION,
    status: 'pending',
    source: '电子票据系统导入',
    createdAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(3),
    calculation: calculateDiscountInterest(
      1000000,
      ACTIVE_RATE,
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(90, 'day').format('YYYY-MM-DD'),
      LATEST_RATE_VERSION
    ),
    risks: [],
    auditLogs: [],
  },
  {
    id: generateId(),
    billNumber: '2345678901234567',
    amount: 500000,
    issueDate: dayjs().subtract(120, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    applicant: '江苏恒达物流有限公司',
    discountRate: ACTIVE_RATE,
    discountRateVersion: LATEST_RATE_VERSION,
    status: 'pending',
    source: '电子票据系统导入',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(2),
    calculation: calculateDiscountInterest(
      500000,
      ACTIVE_RATE,
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(3, 'day').format('YYYY-MM-DD'),
      LATEST_RATE_VERSION
    ),
    risks: [],
    auditLogs: [
      {
        id: generateId(),
        field: 'discountRate',
        fieldLabel: '贴现率',
        oldValue: '3.15',
        newValue: '3.25',
        operator: '张会计',
        timestamp: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
        reason: '贴现率版本更新',
      },
    ],
  },
  {
    id: generateId(),
    billNumber: '3456789012345678',
    amount: 2000000,
    issueDate: dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(120, 'day').format('YYYY-MM-DD'),
    applicant: '浙江鑫源建材有限公司',
    discountRate: 3.00,
    discountRateVersion: 'v1.0',
    status: 'pending',
    source: '手工录入',
    createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(4),
    calculation: calculateDiscountInterest(
      2000000,
      3.00,
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(120, 'day').format('YYYY-MM-DD'),
      'v1.0'
    ),
    risks: [],
    auditLogs: [],
  },
  {
    id: generateId(),
    billNumber: '4567890123456789',
    amount: 800000,
    issueDate: dayjs().subtract(100, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(80, 'day').format('YYYY-MM-DD'),
    applicant: '安徽鸿远科技有限公司',
    discountRate: ACTIVE_RATE,
    discountRateVersion: LATEST_RATE_VERSION,
    status: 'pending',
    source: '电子票据系统导入',
    createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(3, true, 2),
    calculation: calculateDiscountInterest(
      800000,
      ACTIVE_RATE,
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(80, 'day').format('YYYY-MM-DD'),
      LATEST_RATE_VERSION
    ),
    risks: [],
    auditLogs: [],
  },
  {
    id: generateId(),
    billNumber: '5678901234567890',
    amount: 1500000,
    issueDate: dayjs().subtract(45, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(135, 'day').format('YYYY-MM-DD'),
    applicant: '山东盛达包装有限公司',
    discountRate: ACTIVE_RATE,
    discountRateVersion: LATEST_RATE_VERSION,
    status: 'approved',
    source: '电子票据系统导入',
    createdAt: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(2),
    calculation: calculateDiscountInterest(
      1500000,
      ACTIVE_RATE,
      dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      dayjs().add(135, 'day').format('YYYY-MM-DD'),
      LATEST_RATE_VERSION
    ),
    risks: [],
    auditLogs: [
      {
        id: generateId(),
        field: 'status',
        fieldLabel: '审核状态',
        oldValue: 'pending',
        newValue: 'approved',
        operator: '李主管',
        timestamp: dayjs().subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
        reason: '审核通过，信息无误',
      },
    ],
  },
  {
    id: generateId(),
    billNumber: '6789012345678901',
    amount: 300000,
    issueDate: dayjs().subtract(200, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    applicant: '广东顺通电子有限公司',
    discountRate: ACTIVE_RATE,
    discountRateVersion: LATEST_RATE_VERSION,
    status: 'pending',
    source: '手工录入',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(1),
    calculation: calculateDiscountInterest(
      300000,
      ACTIVE_RATE,
      dayjs().format('YYYY-MM-DD'),
      dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
      LATEST_RATE_VERSION
    ),
    risks: [],
    auditLogs: [],
  },
  {
    id: generateId(),
    billNumber: '7890123456789012',
    amount: 750000,
    issueDate: dayjs().subtract(80, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(100, 'day').format('YYYY-MM-DD'),
    applicant: '上海华源贸易有限公司',
    discountRate: ACTIVE_RATE,
    discountRateVersion: LATEST_RATE_VERSION,
    status: 'modified',
    source: '电子票据系统导入',
    createdAt: dayjs().subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(5, true, 3),
    calculation: calculateDiscountInterest(
      750000,
      ACTIVE_RATE,
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(100, 'day').format('YYYY-MM-DD'),
      LATEST_RATE_VERSION
    ),
    risks: [],
    auditLogs: [
      {
        id: generateId(),
        field: 'endorsements',
        fieldLabel: '背书记录',
        oldValue: '原背书链断裂',
        newValue: '已修正第3手背书人信息',
        operator: '王审核',
        timestamp: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
        reason: '背书链断裂修正，已核实原始凭证',
      },
    ],
  },
  {
    id: generateId(),
    billNumber: '8901234567890123',
    amount: 1200000,
    issueDate: dayjs().subtract(55, 'day').format('YYYY-MM-DD'),
    dueDate: dayjs().add(125, 'day').format('YYYY-MM-DD'),
    applicant: '江苏恒达物流有限公司',
    discountRate: 3.15,
    discountRateVersion: 'v2.0',
    status: 'pending',
    source: '电子票据系统导入',
    createdAt: dayjs().subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endorsements: createEndorsements(3),
    calculation: calculateDiscountInterest(
      1200000,
      3.15,
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(125, 'day').format('YYYY-MM-DD'),
      'v2.0'
    ),
    risks: [],
    auditLogs: [],
  },
];
