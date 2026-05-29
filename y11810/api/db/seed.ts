import type Database from 'better-sqlite3';

interface DeductionRuleSeed {
  id: string;
  name: string;
  type: string;
  condition: string;
  deductionRate: number;
  version: number;
  isActive: number;
}

interface ChannelSeed {
  id: string;
  name: string;
  account: string;
  rate: number;
  status: string;
}

export const deductionRules: DeductionRuleSeed[] = [
  {
    id: 'rule_001',
    name: '异常点击扣量',
    type: 'click_anomaly',
    condition: 'click.is_anomaly = 1',
    deductionRate: 1.0,
    version: 1,
    isActive: 1,
  },
  {
    id: 'rule_002',
    name: '重复转化扣量',
    type: 'duplicate_conversion',
    condition: 'conversion.is_duplicate = 1',
    deductionRate: 1.0,
    version: 1,
    isActive: 1,
  },
  {
    id: 'rule_003',
    name: 'IP 欺诈扣量',
    type: 'ip_fraud',
    condition: '同一IP 1小时内点击超过20次',
    deductionRate: 0.5,
    version: 1,
    isActive: 1,
  },
  {
    id: 'rule_004',
    name: '时间异常扣量',
    type: 'time_abnormal',
    condition: '点击后1秒内转化',
    deductionRate: 0.3,
    version: 1,
    isActive: 1,
  },
];

export const channels: ChannelSeed[] = [
  {
    id: 'channel_001',
    name: '字节跳动',
    account: 'bytedance_001',
    rate: 0.15,
    status: 'active',
  },
  {
    id: 'channel_002',
    name: '腾讯广告',
    account: 'tencent_002',
    rate: 0.12,
    status: 'active',
  },
  {
    id: 'channel_003',
    name: '快手',
    account: 'kuaishou_003',
    rate: 0.10,
    status: 'active',
  },
];

export function seedDatabase(db: Database.Database): void {
  const now = new Date().toISOString();

  const insertRule = db.prepare(`
    INSERT OR IGNORE INTO deduction_rule 
    (id, name, type, condition, deduction_rate, version, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const rule of deductionRules) {
    insertRule.run(
      rule.id,
      rule.name,
      rule.type,
      rule.condition,
      rule.deductionRate,
      rule.version,
      rule.isActive,
      now,
      now
    );
  }

  const insertChannel = db.prepare(`
    INSERT OR IGNORE INTO channel 
    (id, name, account, rate, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const channel of channels) {
    insertChannel.run(
      channel.id,
      channel.name,
      channel.account,
      channel.rate,
      channel.status,
      now,
      now
    );
  }
}
