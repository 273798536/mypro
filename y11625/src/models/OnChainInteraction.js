const db = require('../db');

class OnChainInteraction {
  static create(data) {
    const interaction = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      addressId: data.addressId,
      address: data.address.toLowerCase(),
      chain: data.chain || 'ethereum',
      interactionType: data.interactionType,
      contractAddress: data.contractAddress || null,
      txHash: data.txHash || null,
      blockNumber: data.blockNumber || null,
      timestamp: data.timestamp || new Date().toISOString(),
      value: data.value || null,
      gasUsed: data.gasUsed || null,
      source: data.source,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };
    db.get('onChainInteractions').push(interaction).write();
    return interaction;
  }

  static findAll() {
    return db.get('onChainInteractions').value();
  }

  static findByAddress(address) {
    return db.get('onChainInteractions').filter({ address: address.toLowerCase() }).value();
  }

  static findByAddressId(addressId) {
    return db.get('onChainInteractions').filter({ addressId }).value();
  }

  static getInteractionStats() {
    const interactions = db.get('onChainInteractions').value();
    const stats = {};
    interactions.forEach(i => {
      if (!stats[i.address]) {
        stats[i.address] = { count: 0, chains: new Set(), types: new Set(), contracts: new Set() };
      }
      stats[i.address].count++;
      stats[i.address].chains.add(i.chain);
      stats[i.address].types.add(i.interactionType);
      if (i.contractAddress) stats[i.address].contracts.add(i.contractAddress);
    });
    return stats;
  }

  static delete(id) {
    db.get('onChainInteractions').remove({ id }).write();
  }

  static clearAll() {
    db.set('onChainInteractions', []).write();
  }
}

module.exports = OnChainInteraction;
