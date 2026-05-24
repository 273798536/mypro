const fs = require('fs');
const path = require('path');
const moment = require('moment');
const {
  retryQueueDAO,
  dirtyRecordDAO,
  deadLetterDAO,
  compensationRecordDAO,
  fabricInventoryDAO
} = require('../dao');

class ReportService {
  async generateBrandPlanningReport() {
    const [queueStats, dirtyStats, deadLetterStats, compensations] = await Promise.all([
      this.getQueueClassificationStats(),
      this.getDirtyRecordStats(),
      this.getDeadLetterStats(),
      this.getCompensationStats()
    ]);

    const report = {
      reportTitle: '服装打版样衣重试补偿队列 - 品牌企划报告',
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      summary: {
        totalQueues: queueStats.total,
        successRate: queueStats.successRate,
        pendingRetry: queueStats.pendingRetry,
        manualIntervention: queueStats.manual,
        dirtyRecords: dirtyStats.total,
        deadLetters: deadLetterStats.total,
        recoverableDeadLetters: deadLetterStats.recoverable
      },
      retryClassification: queueStats.byClassification,
      deadLetterAnalysis: {
        total: deadLetterStats.total,
        recoverable: deadLetterStats.recoverable,
        byErrorType: deadLetterStats.byErrorType,
        recoverySuggestions: deadLetterStats.suggestions
      },
      recoveryPipeline: {
        autoRecoverable: dirtyStats.autoCorrectable,
        pendingManual: dirtyStats.pendingManual,
        recoveredToday: dirtyStats.recoveredToday
      },
      dirtyRecordAnalysis: {
        byType: dirtyStats.byType,
        topIssues: dirtyStats.topIssues
      },
      compensationSummary: compensations,
      recommendations: this.generateRecommendations(queueStats, dirtyStats, deadLetterStats)
    };

    return report;
  }

  async getQueueClassificationStats() {
    const allQueues = await retryQueueDAO.findAll();
    
    const stats = {
      total: allQueues.length,
      success: 0,
      pendingRetry: 0,
      manual: 0,
      closed: 0,
      byClassification: {},
      byStatus: {}
    };

    for (const queue of allQueues) {
      stats.byStatus[queue.status] = (stats.byStatus[queue.status] || 0) + 1;

      if (queue.status === 'success') stats.success++;
      if (queue.status === 'pending' || queue.status === 'retry') stats.pendingRetry++;
      if (queue.status === 'manual') stats.manual++;
      if (queue.status === 'closed') stats.closed++;

      if (queue.retry_classification) {
        stats.byClassification[queue.retry_classification] = 
          (stats.byClassification[queue.retry_classification] || 0) + 1;
      } else if (queue.error_type) {
        const classification = this.mapErrorToClassification(queue.error_type);
        stats.byClassification[classification] = 
          (stats.byClassification[classification] || 0) + 1;
      }
    }

    stats.successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) + '%' : '0%';

    return stats;
  }

  mapErrorToClassification(errorType) {
    const mapping = {
      'missing_field': '数据补全类',
      'cross_day': '时间调整类',
      'name_change': '引用更新类',
      'quantity_conflict': '库存调整类',
      'amount_conflict': '对账处理类',
      'validation_error': '校验修复类'
    };
    return mapping[errorType] || '通用处理类';
  }

  async getDirtyRecordStats() {
    const allDirty = await dirtyRecordDAO.findAll();
    const today = moment().format('YYYY-MM-DD');

    const stats = {
      total: allDirty.length,
      pending: 0,
      corrected: 0,
      autoCorrectable: 0,
      pendingManual: 0,
      recoveredToday: 0,
      byType: {},
      byField: {},
      topIssues: []
    };

    for (const dirty of allDirty) {
      if (dirty.status === 'pending') {
        stats.pending++;
        if (dirty.error_type === 'missing_field' || dirty.error_type === 'cross_day') {
          stats.autoCorrectable++;
        } else {
          stats.pendingManual++;
        }
      }
      if (dirty.status === 'corrected') {
        stats.corrected++;
        if (dirty.handled_at && dirty.handled_at.startsWith(today)) {
          stats.recoveredToday++;
        }
      }

      stats.byType[dirty.error_type] = (stats.byType[dirty.error_type] || 0) + 1;

      const fields = JSON.parse(dirty.error_fields || '[]');
      for (const field of fields) {
        stats.byField[field] = (stats.byField[field] || 0) + 1;
      }
    }

    stats.topIssues = Object.entries(stats.byType)
      .map(([type, count]) => ({ type, count, description: this.getErrorDescription(type) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  getErrorDescription(type) {
    const descriptions = {
      'missing_field': '缺少必填字段',
      'cross_day': '跨日记录',
      'name_change': '款号/名称变更',
      'quantity_conflict': '数量冲突',
      'amount_conflict': '金额冲突'
    };
    return descriptions[type] || type;
  }

  async getDeadLetterStats() {
    const deadLetters = await deadLetterDAO.findAll();
    
    const stats = {
      total: deadLetters.length,
      recoverable: 0,
      byErrorType: {},
      suggestions: []
    };

    for (const dl of deadLetters) {
      if (dl.can_be_recovered) {
        stats.recoverable++;
      }
      stats.byErrorType[dl.error_type] = (stats.byErrorType[dl.error_type] || 0) + 1;
    }

    if (stats.recoverable > 0) {
      stats.suggestions.push({
        priority: '高',
        action: '优先恢复可自动修正的死信',
        count: Math.min(stats.recoverable, 5)
      });
    }

    return stats;
  }

  async getCompensationStats() {
    const compensations = await compensationRecordDAO.findAll();
    
    const stats = {
      total: compensations.length,
      accounted: 0,
      pending: 0,
      byType: {},
      totalQuantity: 0
    };

    for (const comp of compensations) {
      if (comp.accounted) stats.accounted++;
      else stats.pending++;

      stats.byType[comp.compensation_type] = (stats.byType[comp.compensation_type] || 0) + 1;
      stats.totalQuantity += parseFloat(comp.quantity) || 0;
    }

    return stats;
  }

  generateRecommendations(queueStats, dirtyStats, deadLetterStats) {
    const recommendations = [];

    if (dirtyStats.autoCorrectable > 0) {
      recommendations.push({
        priority: '高',
        type: '自动修复',
        content: `有 ${dirtyStats.autoCorrectable} 条脏记录可自动修正，建议立即执行自动修正`,
        action: 'POST /api/dirty/{queueId}/auto-correct'
      });
    }

    if (deadLetterStats.recoverable > 0) {
      recommendations.push({
        priority: '高',
        type: '死信恢复',
        content: `有 ${deadLetterStats.recoverable} 条死信可恢复，建议安排人工处理`,
        action: '查看 /api/dead-letter'
      });
    }

    if (queueStats.manual > 10) {
      recommendations.push({
        priority: '中',
        type: '人工处理',
        content: `待人工处理队列达到 ${queueStats.manual} 条，建议增加处理人力`,
        action: '查看状态为 manual 的队列'
      });
    }

    if (parseFloat(queueStats.successRate) < 80) {
      recommendations.push({
        priority: '中',
        type: '流程优化',
        content: `当前成功率为 ${queueStats.successRate}，低于80%阈值，建议优化上游数据质量`,
        action: '分析高频错误类型'
      });
    }

    return recommendations;
  }

  async exportReportToFile(report, format = 'json') {
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `brand-planning-report-${moment().format('YYYYMMDD-HHmmss')}`;
    const filepath = path.join(exportDir, `${filename}.${format}`);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    } else if (format === 'txt') {
      fs.writeFileSync(filepath, this.formatReportAsText(report));
    }

    return filepath;
  }

  formatReportAsText(report) {
    let text = '';
    text += '='.repeat(60) + '\n';
    text += `${report.reportTitle}\n`;
    text += `生成时间: ${report.generatedAt}\n`;
    text += '='.repeat(60) + '\n\n';

    text += '【概览统计】\n';
    text += '-'.repeat(40) + '\n';
    for (const [key, value] of Object.entries(report.summary)) {
      text += `${this.padChinese(key, 20)}: ${value}\n`;
    }
    text += '\n';

    text += '【可重试分类】\n';
    text += '-'.repeat(40) + '\n';
    for (const [type, count] of Object.entries(report.retryClassification)) {
      text += `${this.padChinese(type, 20)}: ${count} 条\n`;
    }
    text += '\n';

    text += '【死信处理分析】\n';
    text += '-'.repeat(40) + '\n';
    text += `死信总数: ${report.deadLetterAnalysis.total}\n`;
    text += `可恢复: ${report.deadLetterAnalysis.recoverable}\n`;
    text += '\n';

    text += '【恢复流水线】\n';
    text += '-'.repeat(40) + '\n';
    text += `可自动恢复: ${report.recoveryPipeline.autoRecoverable} 条\n`;
    text += `待人工处理: ${report.recoveryPipeline.pendingManual} 条\n`;
    text += `今日已恢复: ${report.recoveryPipeline.recoveredToday} 条\n`;
    text += '\n';

    text += '【优化建议】\n';
    text += '-'.repeat(40) + '\n';
    for (const rec of report.recommendations) {
      text += `[${rec.priority}] ${rec.type}: ${rec.content}\n`;
      text += `  操作: ${rec.action}\n`;
    }

    return text;
  }

  padChinese(str, length) {
    const chineseChars = (str.match(/[\u4e00-\u9fa5]/g) || []).length;
    const padLength = length - str.length - chineseChars;
    return str + ' '.repeat(Math.max(0, padLength));
  }
}

module.exports = new ReportService();
