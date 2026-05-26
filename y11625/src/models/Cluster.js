const db = require('../db');

class Cluster {
  static create(data) {
    const cluster = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name: data.name || `Cluster_${Date.now()}`,
      addresses: data.addresses || [],
      size: (data.addresses || []).length,
      similarityScore: data.similarityScore || 0,
      clusterType: data.clusterType || 'behavior',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('clusters').push(cluster).write();
    return cluster;
  }

  static findAll() {
    return db.get('clusters').value();
  }

  static findById(id) {
    return db.get('clusters').find({ id }).value();
  }

  static findLargeClusters(minSize = 5) {
    return db.get('clusters').filter(c => c.size >= minSize).value();
  }

  static update(id, data) {
    const cluster = db.get('clusters').find({ id }).value();
    const updated = {
      ...cluster,
      ...data,
      size: (data.addresses || cluster.addresses || []).length,
      updatedAt: new Date().toISOString()
    };
    db.get('clusters').find({ id }).assign(updated).write();
    return updated;
  }

  static addAddress(clusterId, address) {
    const cluster = this.findById(clusterId);
    if (cluster && !cluster.addresses.includes(address)) {
      const addresses = [...cluster.addresses, address];
      return this.update(clusterId, { addresses });
    }
    return cluster;
  }

  static removeAddress(clusterId, address) {
    const cluster = this.findById(clusterId);
    if (cluster) {
      const addresses = cluster.addresses.filter(a => a !== address);
      return this.update(clusterId, { addresses });
    }
    return cluster;
  }

  static delete(id) {
    db.get('clusters').remove({ id }).write();
  }

  static clearAll() {
    db.set('clusters', []).write();
  }
}

module.exports = Cluster;
