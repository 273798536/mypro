const db = require('../db');

class CommunityList {
  static create(data) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      listName: data.listName,
      listType: data.listType || 'community',
      address: data.address.toLowerCase(),
      contributorLevel: data.contributorLevel || 'member',
      joinedAt: data.joinedAt || new Date().toISOString(),
      source: data.source,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('communityLists').push(entry).write();
    return entry;
  }

  static findAll() {
    return db.get('communityLists').value();
  }

  static findByAddress(address) {
    return db.get('communityLists').filter({ address: address.toLowerCase() }).value();
  }

  static findByListName(listName) {
    return db.get('communityLists').filter({ listName }).value();
  }

  static isCommunityMember(address) {
    return db.get('communityLists').some({ address: address.toLowerCase() }).value();
  }

  static getCommunityStats() {
    const entries = db.get('communityLists').value();
    const stats = {};
    entries.forEach(e => {
      if (!stats[e.address]) {
        stats[e.address] = { lists: [], levels: [] };
      }
      stats[e.address].lists.push(e.listName);
      stats[e.address].levels.push(e.contributorLevel);
    });
    return stats;
  }

  static delete(id) {
    db.get('communityLists').remove({ id }).write();
  }

  static clearAll() {
    db.set('communityLists', []).write();
  }
}

module.exports = CommunityList;
