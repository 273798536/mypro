const fs = require('fs');
const path = require('path');
const Address = require('../models/Address');
const Task = require('../models/Task');
const OnChainInteraction = require('../models/OnChainInteraction');
const ExchangeTag = require('../models/ExchangeTag');
const CommunityList = require('../models/CommunityList');
const Whitelist = require('../models/Whitelist');
const AuditLog = require('../models/AuditLog');

class ImportService {
  static async importFromFile(filePath, type, source) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件不存在: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    let data;
    
    try {
      data = JSON.parse(content);
    } catch (e) {
      if (type === 'addresses' || type === 'whitelist') {
        data = content.split('\n')
          .map(line => line.trim())
          .filter(line => line && line.startsWith('0x'))
          .map(addr => ({ address: addr }));
      } else {
        throw new Error('文件格式错误，需要JSON格式');
      }
    }

    if (!Array.isArray(data)) {
      data = [data];
    }

    const result = {
      type,
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        await this.importItem(data[i], type, source);
        result.imported++;
      } catch (e) {
        result.skipped++;
        result.errors.push(`行${i + 1}: ${e.message}`);
      }
    }

    AuditLog.create({
      action: 'import',
      entityType: type,
      oldValue: null,
      newValue: { 
        file: path.basename(filePath),
        imported: result.imported,
        skipped: result.skipped,
        source
      },
      reason: `批量导入${type}`
    });

    return result;
  }

  static async importItem(item, type, source) {
    switch (type) {
      case 'addresses':
        return this.importAddress(item, source);
      case 'tasks':
        return this.importTask(item, source);
      case 'interactions':
        return this.importInteraction(item, source);
      case 'exchange_tags':
        return this.importExchangeTag(item, source);
      case 'community_lists':
        return this.importCommunityList(item, source);
      case 'whitelist':
        return this.importWhitelist(item, source);
      default:
        throw new Error(`未知的导入类型: ${type}`);
    }
  }

  static importAddress(item, source) {
    if (!item.address) {
      throw new Error('缺少address字段');
    }
    
    const existing = Address.findByAddress(item.address);
    if (existing) {
      return Address.update(existing.id, {
        label: item.label || existing.label,
        source: source || existing.source,
        metadata: { ...existing.metadata, ...item.metadata }
      });
    }

    return Address.create({
      address: item.address,
      label: item.label,
      source: source || 'import',
      firstSeen: item.firstSeen,
      lastActive: item.lastActive,
      metadata: item.metadata || {}
    });
  }

  static importTask(item, source) {
    if (!item.address) {
      throw new Error('缺少address字段');
    }
    if (!item.taskType) {
      throw new Error('缺少taskType字段');
    }

    let addressId = null;
    const address = Address.findByAddress(item.address);
    if (address) {
      addressId = address.id;
    } else {
      const newAddr = Address.create({
        address: item.address,
        source: source || 'task_import'
      });
      addressId = newAddr.id;
    }

    return Task.create({
      addressId,
      address: item.address,
      taskType: item.taskType,
      taskName: item.taskName || item.taskType,
      completedAt: item.completedAt,
      source: source || 'import',
      isSuspicious: item.isSuspicious || false,
      suspicionReason: item.suspicionReason,
      metadata: item.metadata || {}
    });
  }

  static importInteraction(item, source) {
    if (!item.address) {
      throw new Error('缺少address字段');
    }
    if (!item.interactionType) {
      throw new Error('缺少interactionType字段');
    }

    let addressId = null;
    const address = Address.findByAddress(item.address);
    if (address) {
      addressId = address.id;
    } else {
      const newAddr = Address.create({
        address: item.address,
        source: source || 'interaction_import'
      });
      addressId = newAddr.id;
    }

    return OnChainInteraction.create({
      addressId,
      address: item.address,
      chain: item.chain,
      interactionType: item.interactionType,
      contractAddress: item.contractAddress,
      txHash: item.txHash,
      blockNumber: item.blockNumber,
      timestamp: item.timestamp,
      value: item.value,
      gasUsed: item.gasUsed,
      source: source || 'import',
      metadata: item.metadata || {}
    });
  }

  static importExchangeTag(item, source) {
    if (!item.address) {
      throw new Error('缺少address字段');
    }
    if (!item.exchangeName) {
      throw new Error('缺少exchangeName字段');
    }

    return ExchangeTag.create({
      address: item.address,
      exchangeName: item.exchangeName,
      tagType: item.tagType,
      source: source || 'import',
      confidence: item.confidence,
      taggedAt: item.taggedAt,
      metadata: item.metadata || {}
    });
  }

  static importCommunityList(item, source) {
    if (!item.address) {
      throw new Error('缺少address字段');
    }
    if (!item.listName) {
      throw new Error('缺少listName字段');
    }

    return CommunityList.create({
      listName: item.listName,
      listType: item.listType,
      address: item.address,
      contributorLevel: item.contributorLevel,
      joinedAt: item.joinedAt,
      source: source || 'import',
      metadata: item.metadata || {}
    });
  }

  static importWhitelist(item, source) {
    if (!item.address) {
      throw new Error('缺少address字段');
    }

    const existing = Whitelist.findByAddress(item.address);
    if (existing) {
      return existing;
    }

    return Whitelist.create({
      address: item.address,
      reason: item.reason || '批量导入',
      addedBy: item.addedBy || 'import',
      source: source || 'import',
      expiresAt: item.expiresAt,
      metadata: item.metadata || {}
    });
  }
}

module.exports = ImportService;
