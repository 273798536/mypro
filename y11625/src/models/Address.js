const db = require('../db');

class Address {
  static create(data) {
    const address = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      address: data.address.toLowerCase(),
      label: data.label || null,
      source: data.source,
      sourceId: data.sourceId || null,
      riskScore: 0,
      riskLevel: 'unknown',
      riskFactors: [],
      clusterId: null,
      isExchange: false,
      isWhitelisted: false,
      firstSeen: data.firstSeen || new Date().toISOString(),
      lastActive: data.lastActive || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('addresses').push(address).write();
    return address;
  }

  static findAll() {
    return db.get('addresses').value();
  }

  static findByAddress(addr) {
    return db.get('addresses').find({ address: addr.toLowerCase() }).value();
  }

  static findById(id) {
    return db.get('addresses').find({ id }).value();
  }

  static update(id, data) {
    const updated = db.get('addresses')
      .find({ id })
      .assign({ ...data, updatedAt: new Date().toISOString() })
      .write();
    return updated;
  }

  static updateRisk(id, riskScore, riskLevel, riskFactors) {
    return this.update(id, {
      riskScore,
      riskLevel,
      riskFactors,
      updatedAt: new Date().toISOString()
    });
  }

  static setCluster(id, clusterId) {
    return this.update(id, { clusterId });
  }

  static setWhitelist(id, isWhitelisted) {
    return this.update(id, { isWhitelisted });
  }

  static setExchange(id, isExchange) {
    return this.update(id, { isExchange });
  }

  static delete(id) {
    db.get('addresses').remove({ id }).write();
  }

  static findByCluster(clusterId) {
    return db.get('addresses').filter({ clusterId }).value();
  }

  static findHighRisk(threshold = 60) {
    return db.get('addresses').filter(a => a.riskScore >= threshold).value();
  }

  static clearAll() {
    db.set('addresses', []).write();
  }
}

module.exports = Address;
