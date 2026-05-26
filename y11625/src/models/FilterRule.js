const db = require('../db');

const DEFAULT_RULES = [
  {
    id: 'exchange_address',
    name: '交易所地址',
    description: '匹配已知交易所地址',
    weight: 80,
    enabled: true,
    category: 'address_source',
    config: {}
  },
  {
    id: 'cluster_large',
    name: '大集群地址',
    description: '属于大型地址集群中的地址',
    weight: 50,
    enabled: true,
    category: 'clustering',
    config: { minClusterSize: 5 }
  },
  {
    id: 'cluster_suspicious_tasks',
    name: '可疑任务模式',
    description: '任务完成模式异常，疑似机器人刷任务',
    weight: 40,
    enabled: true,
    category: 'behavior',
    config: { suspiciousTaskRatio: 0.5 }
  },
  {
    id: 'no_onchain_activity',
    name: '无链上活动',
    description: '地址没有任何链上交互记录',
    weight: 30,
    enabled: true,
    category: 'behavior',
    config: {}
  },
  {
    id: 'low_task_concentration',
    name: '任务时间集中',
    description: '任务完成时间过于集中',
    weight: 35,
    enabled: true,
    category: 'behavior',
    config: { timeWindowHours: 1, minTasks: 3 }
  },
  {
    id: 'not_community_member',
    name: '非社区成员',
    description: '不在社区贡献名单中',
    weight: 15,
    enabled: true,
    category: 'social',
    config: {}
  },
  {
    id: 'whitelisted',
    name: '白名单保护',
    description: '白名单地址，风险归零',
    weight: -100,
    enabled: true,
    category: 'trust',
    config: {}
  }
];

class FilterRule {
  static initDefaults() {
    const existing = db.get('filterRules').value();
    if (existing.length === 0) {
      DEFAULT_RULES.forEach(rule => {
        db.get('filterRules').push({
          ...rule,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).write();
      });
    }
  }

  static create(data) {
    const rule = {
      id: data.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: data.name,
      description: data.description,
      weight: data.weight,
      enabled: data.enabled !== undefined ? data.enabled : true,
      category: data.category || 'custom',
      config: data.config || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('filterRules').push(rule).write();
    return rule;
  }

  static findAll() {
    return db.get('filterRules').value();
  }

  static findEnabled() {
    return db.get('filterRules').filter({ enabled: true }).value();
  }

  static findById(id) {
    return db.get('filterRules').find({ id }).value();
  }

  static update(id, data) {
    return db.get('filterRules')
      .find({ id })
      .assign({ ...data, updatedAt: new Date().toISOString() })
      .write();
  }

  static toggle(id) {
    const rule = this.findById(id);
    if (rule) {
      return this.update(id, { enabled: !rule.enabled });
    }
  }

  static delete(id) {
    db.get('filterRules').remove({ id }).write();
  }

  static clearAll() {
    db.set('filterRules', []).write();
  }
}

module.exports = FilterRule;
