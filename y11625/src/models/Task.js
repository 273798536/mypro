const db = require('../db');

class Task {
  static create(data) {
    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      addressId: data.addressId,
      address: data.address.toLowerCase(),
      taskType: data.taskType,
      taskName: data.taskName,
      completedAt: data.completedAt || new Date().toISOString(),
      source: data.source,
      isSuspicious: data.isSuspicious || false,
      suspicionReason: data.suspicionReason || null,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('tasks').push(task).write();
    return task;
  }

  static findAll() {
    return db.get('tasks').value();
  }

  static findByAddress(address) {
    return db.get('tasks').filter({ address: address.toLowerCase() }).value();
  }

  static findByAddressId(addressId) {
    return db.get('tasks').filter({ addressId }).value();
  }

  static findSuspicious() {
    return db.get('tasks').filter({ isSuspicious: true }).value();
  }

  static markSuspicious(id, reason) {
    db.get('tasks')
      .find({ id })
      .assign({ isSuspicious: true, suspicionReason: reason })
      .write();
  }

  static delete(id) {
    db.get('tasks').remove({ id }).write();
  }

  static clearAll() {
    db.set('tasks', []).write();
  }

  static getTaskStats() {
    const tasks = db.get('tasks').value();
    const stats = {};
    tasks.forEach(t => {
      if (!stats[t.address]) {
        stats[t.address] = { count: 0, suspicious: 0, types: new Set() };
      }
      stats[t.address].count++;
      if (t.isSuspicious) stats[t.address].suspicious++;
      stats[t.address].types.add(t.taskType);
    });
    return stats;
  }
}

module.exports = Task;
