import type { Application, Channel, Product, FunnelReport, CorrectionLog } from './types';

export const channels: Channel[] = [
  { code: 'CH_ONLINE', name: '线上', type: 'online' },
  { code: 'CH_OFFLINE', name: '线下', type: 'offline' },
  { code: 'CH_AGENT', name: '代理', type: 'agent' },
];

export const products: Product[] = [
  { code: 'PD_CONSUMER', name: '消费贷', category: 'consumer' },
  { code: 'PD_BUSINESS', name: '经营贷', category: 'business' },
  { code: 'PD_MORTGAGE', name: '房贷', category: 'mortgage' },
];

export const rejectionReasonOptions = [
  { code: 'RJ_CREDIT', description: '信用不足' },
  { code: 'RJ_MATERIAL', description: '资料不全' },
  { code: 'RJ_POLICY', description: '政策限制' },
];

export const applications: Application[] = [
  {
    id: 'APP-2026-001',
    applicantName: '张伟',
    channelCode: 'CH_ONLINE',
    productCode: 'PD_CONSUMER',
    applyDate: '2026-03-15',
    status: 'approved',
    nodes: [
      { id: 'N001-1', applicationId: 'APP-2026-001', nodeName: '申请', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-03-15T09:00:00' },
      { id: 'N001-2', applicationId: 'APP-2026-001', nodeName: '初审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-03-15T10:30:00' },
      { id: 'N001-3', applicationId: 'APP-2026-001', nodeName: '复审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-03-16T14:00:00' },
      { id: 'N001-4', applicationId: 'APP-2026-001', nodeName: '终审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-03-17T11:00:00' },
      { id: 'N001-5', applicationId: 'APP-2026-001', nodeName: '放款', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-03-18T09:30:00' },
    ],
    rejections: [],
  },
  {
    id: 'APP-2026-002',
    applicantName: '李明',
    channelCode: 'CH_AGENT',
    productCode: 'PD_BUSINESS',
    applyDate: '2026-04-02',
    status: 'pending',
    nodes: [
      { id: 'N002-1', applicationId: 'APP-2026-002', nodeName: '申请', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-02T08:00:00' },
      { id: 'N002-2', applicationId: 'APP-2026-002', nodeName: '初审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-02T11:00:00' },
      { id: 'N002-3a', applicationId: 'APP-2026-002', nodeName: '复审', enterCount: 1, passCount: 0, rejectCount: 1, timestamp: '2026-04-03T15:00:00' },
      { id: 'N002-3b', applicationId: 'APP-2026-002', nodeName: '复审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-05T10:00:00' },
      { id: 'N002-4', applicationId: 'APP-2026-002', nodeName: '终审', enterCount: 1, passCount: 0, rejectCount: 0, timestamp: '2026-04-06T09:00:00' },
    ],
    rejections: [
      { id: 'RJ-002-1', applicationId: 'APP-2026-002', code: 'RJ_MATERIAL', description: '资料不全', isOverwritten: false },
    ],
  },
  {
    id: 'APP-2026-003',
    applicantName: '王芳',
    channelCode: 'CH_ONLINE',
    productCode: 'PD_MORTGAGE',
    applyDate: '2026-04-10',
    status: 'rejected',
    nodes: [
      { id: 'N003-1', applicationId: 'APP-2026-003', nodeName: '申请', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-10T07:30:00' },
      { id: 'N003-2', applicationId: 'APP-2026-003', nodeName: '初审', enterCount: 1, passCount: 0, rejectCount: 1, timestamp: '2026-04-10T16:00:00' },
    ],
    rejections: [
      {
        id: 'RJ-003-1',
        applicationId: 'APP-2026-003',
        code: 'RJ_MATERIAL',
        description: '资料不全',
        isOverwritten: true,
        originalDescription: '信用不足',
        overwrittenAt: '2026-04-11T09:00:00',
      },
    ],
  },
  {
    id: 'APP-2026-004',
    applicantName: '赵丽',
    channelCode: 'CH_OFFLINE',
    productCode: 'PD_CONSUMER',
    applyDate: '2026-04-12',
    status: 'approved',
    nodes: [
      { id: 'N004-1', applicationId: 'APP-2026-004', nodeName: '申请', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-12T09:00:00' },
      { id: 'N004-2', applicationId: 'APP-2026-004', nodeName: '初审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-12T14:00:00' },
      { id: 'N004-3', applicationId: 'APP-2026-004', nodeName: '复审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-13T10:00:00' },
      { id: 'N004-4', applicationId: 'APP-2026-004', nodeName: '终审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-14T11:00:00' },
      { id: 'N004-5', applicationId: 'APP-2026-004', nodeName: '放款', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-15T09:00:00' },
    ],
    rejections: [],
  },
  {
    id: 'APP-2026-005',
    applicantName: '孙强',
    channelCode: 'CH_ONLINE',
    productCode: 'PD_BUSINESS',
    applyDate: '2026-04-18',
    status: 'rejected',
    nodes: [
      { id: 'N005-1', applicationId: 'APP-2026-005', nodeName: '申请', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-18T10:00:00' },
      { id: 'N005-2', applicationId: 'APP-2026-005', nodeName: '初审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-18T15:00:00' },
      { id: 'N005-3', applicationId: 'APP-2026-005', nodeName: '复审', enterCount: 1, passCount: 0, rejectCount: 1, timestamp: '2026-04-19T11:00:00' },
    ],
    rejections: [
      { id: 'RJ-005-1', applicationId: 'APP-2026-005', code: 'RJ_POLICY', description: '政策限制', isOverwritten: false },
    ],
  },
  {
    id: 'APP-2026-006',
    applicantName: '周婷',
    channelCode: 'CH_AGENT',
    productCode: 'PD_MORTGAGE',
    applyDate: '2026-04-20',
    status: 'approved',
    nodes: [
      { id: 'N006-1', applicationId: 'APP-2026-006', nodeName: '申请', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-20T08:30:00' },
      { id: 'N006-2', applicationId: 'APP-2026-006', nodeName: '初审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-20T13:00:00' },
      { id: 'N006-3', applicationId: 'APP-2026-006', nodeName: '复审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-21T10:00:00' },
      { id: 'N006-4', applicationId: 'APP-2026-006', nodeName: '终审', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-22T14:00:00' },
      { id: 'N006-5', applicationId: 'APP-2026-006', nodeName: '放款', enterCount: 1, passCount: 1, rejectCount: 0, timestamp: '2026-04-23T09:00:00' },
    ],
    rejections: [],
  },
];

const channelMapping: Record<string, string> = {
  CH_ONLINE: 'online',
  CH_OFFLINE: 'offline',
  CH_AGENT: 'agent',
};

const channelActualMapping: Record<string, string> = {
  CH_ONLINE: 'online',
  CH_OFFLINE: 'offline',
  CH_AGENT: 'agent',
  CH_ONLINE_MISMATCH: 'agent',
};

export function getChannelMismatchApps(): string[] {
  const result: string[] = [];
  for (const app of applications) {
    if (app.channelCode === 'CH_ONLINE' && app.id === 'APP-2026-003') {
      result.push(app.id);
    }
  }
  return result;
}

export { channelMapping, channelActualMapping };

export const funnelReports: FunnelReport[] = [
  {
    id: 'FR-2026-Q1',
    period: '2026年第一季度',
    generatedAt: '2026-04-01T00:00:00',
    snapshot: [
      { nodeName: '申请', enterCount: 320, passCount: 310, rejectCount: 10, conversionRate: 0.969 },
      { nodeName: '初审', enterCount: 310, passCount: 245, rejectCount: 65, conversionRate: 0.790 },
      { nodeName: '复审', enterCount: 245, passCount: 198, rejectCount: 47, conversionRate: 0.808 },
      { nodeName: '终审', enterCount: 198, passCount: 180, rejectCount: 18, conversionRate: 0.909 },
      { nodeName: '放款', enterCount: 180, passCount: 178, rejectCount: 2, conversionRate: 0.989 },
    ],
  },
  {
    id: 'FR-2026-Q2',
    period: '2026年第二季度',
    generatedAt: '2026-07-01T00:00:00',
    snapshot: [
      { nodeName: '申请', enterCount: 380, passCount: 365, rejectCount: 15, conversionRate: 0.961 },
      { nodeName: '初审', enterCount: 365, passCount: 280, rejectCount: 85, conversionRate: 0.767 },
      { nodeName: '复审', enterCount: 280, passCount: 220, rejectCount: 60, conversionRate: 0.786 },
      { nodeName: '终审', enterCount: 220, passCount: 200, rejectCount: 20, conversionRate: 0.909 },
      { nodeName: '放款', enterCount: 200, passCount: 196, rejectCount: 4, conversionRate: 0.980 },
    ],
  },
];

export const correctionLogs: CorrectionLog[] = [
  {
    id: 'CL-001',
    targetId: 'APP-2026-003',
    targetType: 'rejection',
    field: 'rejectionDescription',
    oldValue: '信用不足',
    newValue: '资料不全',
    reason: '客户经理反馈原始录入有误',
    operator: '风控管理员-A',
    correctedAt: '2026-04-11T09:00:00',
  },
  {
    id: 'CL-002',
    targetId: 'APP-2026-002',
    targetType: 'node',
    field: '复审状态',
    oldValue: '拒绝',
    newValue: '重新进入复审',
    reason: '客户补充资料后重新提交',
    operator: '运营分析师-B',
    correctedAt: '2026-04-05T08:00:00',
  },
];

export const FUNNEL_NODE_ORDER = ['申请', '初审', '复审', '终审', '放款'];
