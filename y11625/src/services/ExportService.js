const fs = require('fs');
const path = require('path');
const Address = require('../models/Address');
const Task = require('../models/Task');
const OnChainInteraction = require('../models/OnChainInteraction');
const ExchangeTag = require('../models/ExchangeTag');
const CommunityList = require('../models/CommunityList');
const Whitelist = require('../models/Whitelist');
const FilterReport = require('../models/FilterReport');
const Cluster = require('../models/Cluster');
const AuditLog = require('../models/AuditLog');

class ExportService {
  static exportToFile(data, fileName) {
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    AuditLog.create({
      action: 'export',
      entityType: 'file',
      oldValue: null,
      newValue: { file: fileName, path: filePath },
      reason: '数据导出'
    });

    return filePath;
  }

  static exportAddresses(options = {}) {
    let addresses = Address.findAll();

    if (options.riskLevel) {
      addresses = addresses.filter(a => a.riskLevel === options.riskLevel);
    }
    if (options.minRiskScore !== undefined) {
      addresses = addresses.filter(a => a.riskScore >= options.minRiskScore);
    }
    if (options.excludeWhitelist) {
      addresses = addresses.filter(a => !a.isWhitelisted);
    }
    if (options.excludeExchange) {
      addresses = addresses.filter(a => !a.isExchange);
    }
    if (options.onlyHighRisk) {
      addresses = addresses.filter(a => a.riskLevel === 'high');
    }

    const data = {
      exportType: 'addresses',
      exportedAt: new Date().toISOString(),
      count: addresses.length,
      filters: options,
      data: addresses
    };

    const fileName = `addresses_${Date.now()}.json`;
    return this.exportToFile(data, fileName);
  }

  static exportReport(reportId) {
    const report = FilterReport.findById(reportId);
    if (!report) {
      throw new Error(`报告不存在: ${reportId}`);
    }

    const data = {
      exportType: 'filter_report',
      exportedAt: new Date().toISOString(),
      report: report
    };

    const fileName = `report_${reportId}_${Date.now()}.json`;
    return this.exportToFile(data, fileName);
  }

  static exportLatestReport() {
    const latest = FilterReport.getLatest(1);
    if (latest.length === 0) {
      throw new Error('没有可用的过滤报告，请先执行风险评估');
    }
    return this.exportReport(latest[0].id);
  }

  static exportClusters(options = {}) {
    let clusters = Cluster.findAll();

    if (options.minSize) {
      clusters = clusters.filter(c => c.size >= options.minSize);
    }

    const data = {
      exportType: 'clusters',
      exportedAt: new Date().toISOString(),
      count: clusters.length,
      filters: options,
      data: clusters
    };

    const fileName = `clusters_${Date.now()}.json`;
    return this.exportToFile(data, fileName);
  }

  static exportWhitelist() {
    const whitelist = Whitelist.findAll();
    const data = {
      exportType: 'whitelist',
      exportedAt: new Date().toISOString(),
      count: whitelist.length,
      data: whitelist
    };

    const fileName = `whitelist_${Date.now()}.json`;
    return this.exportToFile(data, fileName);
  }

  static exportHighRiskAddresses() {
    return this.exportAddresses({ onlyHighRisk: true, excludeWhitelist: true });
  }

  static exportEligibleAddresses() {
    const addresses = Address.findAll().filter(a =>
      a.riskLevel === 'low' || a.riskLevel === 'whitelisted'
    );

    const data = {
      exportType: 'eligible_addresses',
      exportedAt: new Date().toISOString(),
      count: addresses.length,
      description: '符合空投条件的地址（低风险或白名单）',
      data: addresses.map(a => ({
        address: a.address,
        label: a.label,
        riskScore: a.riskScore,
        riskLevel: a.riskLevel,
        isWhitelisted: a.isWhitelisted,
        isExchange: a.isExchange
      }))
    };

    const fileName = `eligible_addresses_${Date.now()}.json`;
    return this.exportToFile(data, fileName);
  }

  static exportAuditLog(options = {}) {
    const logs = AuditLog.getRecent(options.limit || 100);

    const data = {
      exportType: 'audit_log',
      exportedAt: new Date().toISOString(),
      count: logs.length,
      data: logs
    };

    const fileName = `audit_log_${Date.now()}.json`;
    return this.exportToFile(data, fileName);
  }

  static exportFullSnapshot() {
    const snapshot = {
      exportType: 'full_snapshot',
      exportedAt: new Date().toISOString(),
      data: {
        addresses: Address.findAll(),
        tasks: Task.findAll(),
        interactions: OnChainInteraction.findAll(),
        exchangeTags: ExchangeTag.findAll(),
        communityLists: CommunityList.findAll(),
        whitelist: Whitelist.findAll(),
        clusters: Cluster.findAll(),
        reports: FilterReport.getLatest(10),
        auditLogs: AuditLog.getRecent(200)
      }
    };

    const fileName = `full_snapshot_${Date.now()}.json`;
    return this.exportToFile(snapshot, fileName);
  }

  static getExportSummary() {
    return {
      addresses: Address.findAll().length,
      highRisk: Address.findHighRisk(80).length,
      mediumRisk: Address.findHighRisk(60).filter(a => a.riskScore < 80).length,
      lowRisk: Address.findAll().filter(a => a.riskLevel === 'low').length,
      whitelisted: Whitelist.findAll().length,
      exchange: ExchangeTag.findAll().length,
      clusters: Cluster.findAll().length,
      reports: FilterReport.getLatest(5)
    };
  }
}

module.exports = ExportService;
