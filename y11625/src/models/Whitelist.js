const db = require('../db');

class Whitelist {
  static create(data) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      address: data.address.toLowerCase(),
      reason: data.reason,
      addedBy: data.addedBy || 'system',
      addedAt: new Date().toISOString(),
      source: data.source,
      expiresAt: data.expiresAt || null,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('whitelist').push(entry).write();
    return entry;
  }

  static findAll() {
    return db.get('whitelist').value();
  }

  static findByAddress(address) {
    return db.get('whitelist').find({ address: address.toLowerCase() }).value();
  }

  static isWhitelisted(address) {
    const entry = db.get('whitelist').find({ address: address.toLowerCase() }).value();
    if (!entry) return false;
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return false;
    return true;
  }

  static delete(id) {
    db.get('whitelist').remove({ id }).write();
  }

  static removeByAddress(address) {
    db.get('whitelist').remove({ address: address.toLowerCase() }).write();
  }

  static clearAll() {
    db.set('whitelist', []).write();
  }
}

module.exports = Whitelist;
