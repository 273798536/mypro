import type { Customer, Repayment, Guarantee, Approval, Reminder, AuditLog } from '../types';
import { generateId, getRecentMonths } from '../utils/dateUtils';

function getDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function getDateTime(daysFromNow: number, hours = 10): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

export const sampleCustomers: Customer[] = [
  {
    id: 'cust_001',
    name: '张伟',
    idCard: '310101198501011234',
    creditAmount: 500000,
    startDate: '2024-06-01',
    expiryDate: getDate(180),
    status: 'normal',
    source: '客户资料系统',
    createdAt: getDateTime(-30),
    updatedAt: getDateTime(-5),
    anomalies: []
  },
  {
    id: 'cust_002',
    name: '李娜',
    idCard: '310101198802022345',
    creditAmount: 300000,
    startDate: '2023-06-01',
    expiryDate: getDate(3),
    status: 'expiring_soon',
    source: '客户资料系统',
    createdAt: getDateTime(-60),
    updatedAt: getDateTime(-2),
    anomalies: []
  },
  {
    id: 'cust_003',
    name: '王强',
    idCard: '310101197903033456',
    creditAmount: 800000,
    startDate: '2022-06-01',
    expiryDate: getDate(-60),
    status: 'abnormal',
    source: '客户资料系统',
    createdAt: getDateTime(-90),
    updatedAt: getDateTime(-1),
    anomalies: []
  }
];

export const sampleRepayments: Repayment[] = [
  ...getRecentMonths(12).map((month) => ({
    id: generateId(),
    customerId: 'cust_001',
    month,
    amount: 45000,
    status: 'normal' as const,
    source: '还款流水系统'
  })),
  ...getRecentMonths(12).map((month, index) => ({
    id: generateId(),
    customerId: 'cust_002',
    month,
    amount: 28000,
    status: index === 11 ? 'missing' as const : 'normal' as const,
    source: '还款流水系统'
  })),
  ...getRecentMonths(12).map((month, index) => ({
    id: generateId(),
    customerId: 'cust_003',
    month,
    amount: 72000,
    status: index >= 9 ? 'missing' as const : 'normal' as const,
    source: '还款流水系统'
  }))
];

export const sampleGuarantees: Guarantee[] = [
  {
    id: 'guar_001',
    customerId: 'cust_001',
    type: 'mortgage',
    guarantor: '上海市浦东新区房产一套',
    startDate: '2024-06-01',
    expiryDate: getDate(180),
    status: 'valid',
    source: '担保登记系统'
  },
  {
    id: 'guar_002',
    customerId: 'cust_002',
    type: 'guarantor',
    guarantor: '李小明（配偶）',
    startDate: '2023-06-01',
    expiryDate: getDate(15),
    status: 'expiring_soon',
    source: '担保登记系统'
  },
  {
    id: 'guar_003',
    customerId: 'cust_003',
    type: 'pledge',
    guarantor: '公司股权30%',
    startDate: '2022-06-01',
    expiryDate: getDate(-60),
    status: 'expired',
    source: '担保登记系统'
  }
];

export const sampleApprovals: Approval[] = [
  {
    id: 'appr_001',
    customerId: 'cust_001',
    stage: '续授信审批',
    result: 'approved',
    opinion: '客户经营状况良好，还款记录正常，同意续授信',
    operator: '陈经理',
    timestamp: getDateTime(-10),
    isWithdrawn: false,
    source: '审批系统'
  },
  {
    id: 'appr_002',
    customerId: 'cust_002',
    stage: '续授信审批',
    result: 'pending',
    opinion: '客户资料基本齐全，待补充最近一个月流水',
    operator: '陈经理',
    timestamp: getDateTime(-3),
    isWithdrawn: false,
    source: '审批系统'
  },
  {
    id: 'appr_003',
    customerId: 'cust_003',
    stage: '续授信审批',
    result: 'approved',
    opinion: '同意续授信',
    operator: '王主管',
    timestamp: getDateTime(-30),
    isWithdrawn: false,
    source: '审批系统'
  },
  {
    id: 'appr_004',
    customerId: 'cust_003',
    stage: '续授信审批',
    result: 'approved',
    opinion: '发现担保已过期，原审批撤回',
    operator: '李总监',
    timestamp: getDateTime(-20),
    isWithdrawn: true,
    source: '审批系统'
  }
];

export const sampleReminders: Reminder[] = [
  {
    id: 'rem_001',
    customerId: 'cust_002',
    type: 'sms',
    content: '您的授信即将到期，请及时办理续授信手续',
    operator: '系统自动',
    timestamp: getDateTime(-7),
    source: '催办系统'
  },
  {
    id: 'rem_002',
    customerId: 'cust_002',
    type: 'phone',
    content: '电话联系客户，告知授信即将到期，客户表示正在准备材料',
    operator: '张经理',
    timestamp: getDateTime(-5),
    source: '催办系统'
  },
  {
    id: 'rem_003',
    customerId: 'cust_003',
    type: 'phone',
    content: '电话联系客户，无人接听',
    operator: '张经理',
    timestamp: getDateTime(-15),
    source: '催办系统'
  },
  {
    id: 'rem_004',
    customerId: 'cust_003',
    type: 'phone',
    content: '电话联系客户，客户称资金紧张，正在筹措',
    operator: '张经理',
    timestamp: getDateTime(-15),
    source: '催办系统'
  },
  {
    id: 'rem_005',
    customerId: 'cust_003',
    type: 'visit',
    content: '上门走访，客户经营场所正常，承诺10天内解决',
    operator: '李经理',
    timestamp: getDateTime(-10),
    source: '催办系统'
  }
];

export const sampleAuditLogs: AuditLog[] = [
  {
    id: 'audit_001',
    customerId: 'cust_002',
    field: 'expiryDate',
    oldValue: getDate(10),
    newValue: getDate(3),
    operator: '系统自动',
    timestamp: getDateTime(-7),
    reason: '时间自然流逝'
  },
  {
    id: 'audit_002',
    customerId: 'cust_003',
    field: 'status',
    oldValue: 'normal',
    newValue: 'abnormal',
    operator: '系统自动',
    timestamp: getDateTime(-60),
    reason: '担保过期，授信状态自动变更'
  },
  {
    id: 'audit_003',
    customerId: 'cust_003',
    field: 'anomalies',
    oldValue: '[]',
    newValue: '["担保已过期","审批记录已撤回"]',
    operator: '系统自动',
    timestamp: getDateTime(-20),
    reason: '检测到新的异常信息'
  }
];

export function getAllSampleData() {
  return {
    customers: sampleCustomers,
    repayments: sampleRepayments,
    guarantees: sampleGuarantees,
    approvals: sampleApprovals,
    reminders: sampleReminders,
    auditLogs: sampleAuditLogs
  };
}
