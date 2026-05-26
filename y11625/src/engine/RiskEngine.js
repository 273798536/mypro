const Address = require('../models/Address');
const Task = require('../models/Task');
const OnChainInteraction = require('../models/OnChainInteraction');
const ExchangeTag = require('../models/ExchangeTag');
const CommunityList = require('../models/CommunityList');
const Whitelist = require('../models/Whitelist');
const FilterRule = require('../models/FilterRule');
const FilterReport = require('../models/FilterReport');
const AuditLog = require('../models/AuditLog');
const Cluster = require('../models/Cluster');

class RiskEngine {
  static async evaluateAll(options = {}) {
    const addresses = Address.findAll();
    const rules = FilterRule.findEnabled();
    const results = [];

    const exchangeMap = new Map();
    ExchangeTag.findAll().forEach(tag => {
      exchangeMap.set(tag.address, tag);
    });

    const whitelistMap = new Map();
    Whitelist.findAll().forEach(wl => {
      whitelistMap.set(wl.address, wl);
    });

    const communityMap = CommunityList.getCommunityStats();
    const taskStats = Task.getTaskStats();
    const interactionStats = OnChainInteraction.getInteractionStats();
    const largeClusters = Cluster.findLargeClusters(5);
    
    const clusterAddressMap = new Map();
    largeClusters.forEach(cluster => {
      cluster.addresses.forEach(addr => {
        clusterAddressMap.set(addr, cluster);
      });
    });

    for (const address of addresses) {
      const result = this.evaluateSingle(
        address,
        rules,
        exchangeMap,
        whitelistMap,
        communityMap,
        taskStats,
        interactionStats,
        clusterAddressMap
      );
      results.push(result);
    }

    const highRiskCount = results.filter(r => r.riskLevel === 'high').length;
    const mediumCount = results.filter(r => r.riskLevel === 'medium').length;
    const lowCount = results.filter(r => r.riskLevel === 'low').length;
    const whitelistedCount = results.filter(r => r.isWhitelisted).length;
    const exchangeCount = results.filter(r => r.isExchange).length;
    const clusterCount = results.filter(r => r.clusterId).length;

    const report = FilterReport.create({
      name: options.reportName || `过滤报告_${new Date().toLocaleString()}`,
      description: options.description || '',
      totalAddresses: addresses.length,
      highRiskCount,
      mediumCount,
      lowCount,
      whitelistedCount,
      exchangeCount,
      clusterCount,
      results,
      filterParams: {
        ruleCount: rules.length,
        threshold: options.threshold || 60,
        highThreshold: options.highThreshold || 80
      }
    });

    AuditLog.create({
      action: 'risk_evaluation_run',
      entityType: 'filter_report',
      entityId: report.id,
      oldValue: null,
      newValue: { 
        totalAddresses: addresses.length,
        highRiskCount,
        reportId: report.id
      },
      reason: '执行风险评估'
    });

    return {
      report,
      summary: {
        total: addresses.length,
        highRisk: highRiskCount,
        medium: mediumCount,
        low: lowCount,
        whitelisted: whitelistedCount,
        exchange: exchangeCount,
        clustered: clusterCount
      }
    };
  }

  static evaluateSingle(
    address,
    rules,
    exchangeMap,
    whitelistMap,
    communityMap,
    taskStats,
    interactionStats,
    clusterAddressMap
  ) {
    const addr = address.address.toLowerCase();
    const riskFactors = [];
    let totalScore = 0;
    let isWhitelisted = false;
    let isExchange = false;
    let warnings = [];

    if (whitelistMap.has(addr)) {
      isWhitelisted = true;
      const wlEntry = whitelistMap.get(addr);
      riskFactors.push({
        ruleId: 'whitelisted',
        ruleName: '白名单保护',
        weight: -100,
        description: `白名单地址: ${wlEntry.reason}`
      });
      warnings.push('⚠️ 白名单地址，风险评分已归零');
    }

    if (exchangeMap.has(addr)) {
      isExchange = true;
      const exchangeTag = exchangeMap.get(addr);
      riskFactors.push({
        ruleId: 'exchange_address',
        ruleName: '交易所地址',
        weight: 80,
        description: `识别为${exchangeTag.exchangeName}交易所地址，置信度${(exchangeTag.confidence * 100).toFixed(0)}%`
      });
      warnings.push('⚠️ 交易所地址，不建议空投');
    }

    const cluster = clusterAddressMap.get(addr);
    if (cluster) {
      riskFactors.push({
        ruleId: 'cluster_large',
        ruleName: '大集群地址',
        weight: 50,
        description: `属于大型地址集群(${cluster.name}，共${cluster.size}个地址)`
      });
      warnings.push(`⚠️ 属于大型地址集群，可能多钱包同源`);
    }

    const tasks = taskStats[addr];
    if (tasks && tasks.count > 0) {
      const suspiciousRatio = tasks.suspicious / tasks.count;
      if (suspiciousRatio >= 0.5) {
        riskFactors.push({
          ruleId: 'cluster_suspicious_tasks',
          ruleName: '可疑任务模式',
          weight: 40,
          description: `可疑任务占比${(suspiciousRatio * 100).toFixed(0)}%，疑似机器人刷任务`
        });
        warnings.push('⚠️ 任务模式异常，疑似机器人');
      }
    } else {
      riskFactors.push({
        ruleId: 'no_onchain_activity',
        ruleName: '无链上活动',
        weight: 30,
        description: '无任务完成记录'
      });
    }

    const interactions = interactionStats[addr];
    if (!interactions || interactions.count === 0) {
      if (!riskFactors.find(f => f.ruleId === 'no_onchain_activity')) {
        riskFactors.push({
          ruleId: 'no_onchain_activity',
          ruleName: '无链上活动',
          weight: 30,
          description: '无链上交互记录'
        });
      }
    }

    if (!communityMap[addr]) {
      riskFactors.push({
        ruleId: 'not_community_member',
        ruleName: '非社区成员',
        weight: 15,
        description: '不在社区贡献名单中'
      });
    }

    totalScore = riskFactors.reduce((sum, f) => sum + f.weight, 0);
    totalScore = Math.max(0, Math.min(100, totalScore));

    let riskLevel = 'low';
    if (isWhitelisted) {
      totalScore = 0;
      riskLevel = 'whitelisted';
    } else if (totalScore >= 80) {
      riskLevel = 'high';
    } else if (totalScore >= 60) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    Address.updateRisk(address.id, totalScore, riskLevel, riskFactors);
    if (isExchange) Address.setExchange(address.id, true);
    if (isWhitelisted) Address.setWhitelist(address.id, true);

    AuditLog.create({
      action: 'risk_evaluate',
      entityType: 'address',
      entityId: address.id,
      address: addr,
      oldValue: { riskScore: address.riskScore, riskLevel: address.riskLevel },
      newValue: { riskScore: totalScore, riskLevel, riskFactors },
      reason: '自动风险评估'
    });

    return {
      id: address.id,
      address: addr,
      label: address.label,
      source: address.source,
      riskScore: totalScore,
      riskLevel,
      riskFactors,
      isWhitelisted,
      isExchange,
      clusterId: cluster ? cluster.id : null,
      clusterName: cluster ? cluster.name : null,
      warnings,
      taskCount: tasks ? tasks.count : 0,
      interactionCount: interactions ? interactions.count : 0,
      isCommunityMember: !!communityMap[addr]
    };
  }

  static getRiskLevelColor(level) {
    const colors = {
      high: 'red',
      medium: 'yellow',
      low: 'green',
      whitelisted: 'cyan',
      unknown: 'gray'
    };
    return colors[level] || 'gray';
  }

  static getRiskLevelText(level) {
    const texts = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
      whitelisted: '白名单',
      unknown: '未知'
    };
    return texts[level] || '未知';
  }
}

module.exports = RiskEngine;
