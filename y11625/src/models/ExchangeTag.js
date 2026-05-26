const db = require('../db');

class ExchangeTag {
  static create(data) {
    const tag = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      address: data.address.toLowerCase(),
      exchangeName: data.exchangeName,
      tagType: data.tagType || 'exchange',
      source: data.source,
      confidence: data.confidence || 0.9,
      taggedAt: data.taggedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('exchangeTags').push(tag).write();
    return tag;
  }

  static findAll() {
    return db.get('exchangeTags').value();
  }

  static findByAddress(address) {
    return db.get('exchangeTags').filter({ address: address.toLowerCase() }).value();
  }

  static isExchange(address) {
    return db.get('exchangeTags').some({ address: address.toLowerCase() }).value();
  }

  static delete(id) {
    db.get('exchangeTags').remove({ id }).write();
  }

  static clearAll() {
    db.set('exchangeTags', []).write();
  }
}

module.exports = ExchangeTag;
