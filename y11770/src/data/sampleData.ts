import type { MigrationRecord, DataSource, IndustryType, RatingLevel } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const industries: IndustryType[] = ['制造业', '金融业', '房地产业', '批发零售业', '交通运输业', '信息技术业', '其他'];
const ratings: RatingLevel[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'];
const months: string[] = [
  '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
];

const sampleDataSource: DataSource = {
  id: 'ds-sample-001',
  name: '信用风险评级系统-2024年度',
  description: '内部信用评级系统导出的客户评级迁徙数据',
  importTime: new Date().toISOString(),
  recordCount: 0
};

const normalRecord: MigrationRecord = {
  id: 'rec-normal-001',
  customerId: 'CUST-A001',
  month: '2024-01',
  fromRating: 'AA',
  toRating: 'A',
  migrationCount: 1,
  balance: 500,
  industry: '制造业',
  riskReport: '客户经营稳定，受行业周期影响略有下滑，评级由AA调整为A。建议关注后续回款情况。',
  createdAt: '2024-02-01T10:00:00Z',
  dataSourceId: 'ds-sample-001',
  anomalies: [],
  revisions: []
};

const boundaryRecord: MigrationRecord = {
  id: 'rec-boundary-001',
  customerId: 'CUST-B007',
  month: '2024-06',
  fromRating: 'CCC',
  toRating: 'CC',
  migrationCount: 1,
  balance: 50,
  industry: '其他',
  riskReport: '该客户所属行业样本量较少，统计结果仅供参考。客户财务状况持续恶化，已启动风险预警流程。',
  createdAt: '2024-07-05T14:30:00Z',
  dataSourceId: 'ds-sample-001',
  anomalies: [
    {
      id: 'anom-low-ccc',
      migrationId: 'rec-boundary-001',
      type: 'LOW_SAMPLE',
      severity: 'warning',
      description: '评级CCC/CC样本量不足5笔，统计结果可能存在偏差',
      isResolved: false
    }
  ],
  revisions: []
};

const badDataRecord: MigrationRecord = {
  id: 'rec-bad-001',
  customerId: 'CUST-C099',
  month: '2024-03',
  fromRating: 'AAA',
  toRating: 'D',
  migrationCount: 999,
  balance: -100,
  industry: '',
  riskReport: '数据异常，疑似系统导入错误。迁徙次数异常、余额为负、行业标签缺失。',
  createdAt: '2024-04-01T08:00:00Z',
  dataSourceId: 'ds-sample-001',
  anomalies: [
    {
      id: 'anom-count-001',
      migrationId: 'rec-bad-001',
      type: 'INVALID_MIGRATION_COUNT',
      severity: 'error',
      description: '迁徙次数999异常，正常范围应为1-10',
      isResolved: false
    },
    {
      id: 'anom-balance-001',
      migrationId: 'rec-bad-001',
      type: 'NEGATIVE_BALANCE',
      severity: 'error',
      description: '余额为负数(-100万元)，数据可能有误',
      isResolved: false
    },
    {
      id: 'anom-industry-001',
      migrationId: 'rec-bad-001',
      type: 'MISSING_INDUSTRY',
      severity: 'warning',
      description: '行业标签为空，建议补充完整',
      isResolved: false
    }
  ],
  revisions: [
    {
      id: 'rev-001',
      migrationId: 'rec-bad-001',
      operator: '风控系统自动检测',
      action: 'update',
      field: 'anomalies',
      oldValue: '[]',
      newValue: '[3个异常]',
      timestamp: '2024-04-01T08:05:00Z',
      reason: '数据校验发现异常并自动标记'
    }
  ]
};

const generateRandomRecord = (index: number): MigrationRecord => {
  const fromIdx = Math.floor(Math.random() * 6);
  const direction = Math.floor(Math.random() * 5) - 2;
  const toIdx = Math.min(9, Math.max(0, fromIdx + direction));
  
  return {
    id: `rec-gen-${index}`,
    customerId: `CUST-GEN-${String(index).padStart(3, '0')}`,
    month: months[Math.floor(Math.random() * months.length)],
    fromRating: ratings[fromIdx],
    toRating: ratings[toIdx],
    migrationCount: 1 + Math.floor(Math.random() * 5),
    balance: Math.floor(50 + Math.random() * 2000),
    industry: industries[Math.floor(Math.random() * industries.length)],
    riskReport: '正常迁徙记录，客户信用状况变化符合预期。',
    createdAt: new Date().toISOString(),
    dataSourceId: 'ds-sample-001',
    anomalies: [],
    revisions: []
  };
};

const additionalRecords: MigrationRecord[] = Array.from({ length: 80 }, (_, i) => generateRandomRecord(i + 100));

export const sampleRecords: MigrationRecord[] = [
  normalRecord,
  boundaryRecord,
  badDataRecord,
  ...additionalRecords
];

export const sampleDataSources: DataSource[] = [
  {
    ...sampleDataSource,
    recordCount: sampleRecords.length
  }
];

export const sampleMonths = months;

export const getSampleData = () => ({
  records: sampleRecords,
  dataSources: sampleDataSources,
  months: sampleMonths
});
