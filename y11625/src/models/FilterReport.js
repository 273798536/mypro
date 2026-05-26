const db = require('../db');

class FilterReport {
  static create(data) {
    const report = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: data.name || `过滤报告_${new Date().toLocaleString()}`,
      description: data.description || '',
      totalAddresses: data.totalAddresses || 0,
      highRiskCount: data.highRiskCount || 0,
      mediumRiskCount: data.mediumCount || 0,
      lowRiskCount: data.lowCount || 0,
      whitelistedCount: data.whitelistedCount || 0,
      exchangeCount: data.exchangeCount || 0,
      clusterCount: data.clusterCount || 0,
      results: data.results || [],
      filterParams: data.filterParams || {},
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || 'system'
    };
    db.get('filterReports').push(report).write();
    return report;
  }

  static findAll() {
    return db.get('filterReports').value();
  }

  static findById(id) {
    return db.get('filterReports').find({ id }).value();
  }

  static getLatest(limit = 5) {
    return db.get('filterReports')
      .orderBy('createdAt', 'desc')
      .take(limit)
      .value();
  }

  static delete(id) {
    db.get('filterReports').remove({ id }).write();
  }

  static clearAll() {
    db.set('filterReports', []).write();
  }
}

module.exports = FilterReport;
