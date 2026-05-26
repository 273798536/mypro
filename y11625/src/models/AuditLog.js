const db = require('../db');

class AuditLog {
  static create(data) {
    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      action: data.action,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      address: data.address || null,
      oldValue: data.oldValue || null,
      newValue: data.newValue || null,
      reason: data.reason || null,
      source: data.source || 'system',
      operator: data.operator || 'cli',
      timestamp: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('auditLogs').push(log).write();
    return log;
  }

  static findAll() {
    return db.get('auditLogs').value();
  }

  static findByAddress(address) {
    return db.get('auditLogs').filter({ address: address.toLowerCase() }).value();
  }

  static findByAction(action) {
    return db.get('auditLogs').filter({ action }).value();
  }

  static findByEntity(entityType, entityId) {
    return db.get('auditLogs').filter({ entityType, entityId }).value();
  }

  static getRecent(limit = 50) {
    return db.get('auditLogs')
      .orderBy('timestamp', 'desc')
      .take(limit)
      .value();
  }

  static clearAll() {
    db.set('auditLogs', []).write();
  }
}

module.exports = AuditLog;
