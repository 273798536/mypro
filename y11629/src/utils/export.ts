import { Transaction, CostStats, ExportOptions } from '../types';
import { format } from 'date-fns';

function convertToCSV(transactions: Transaction[]): string {
  const headers = [
    '交易ID', '卡号', '交易金额', '交易时间', '商户ID', '商户名称',
    '活动ID', '活动名称', '获得积分', '数据来源', '来源参考', '状态',
    '异常类型', '异常备注', '积分成本', '补贴成本', '总成本', '修正次数'
  ];

  const rows = transactions.map(tx => [
    tx.id,
    tx.cardNo,
    tx.amount.toFixed(2),
    format(new Date(tx.txTime), 'yyyy-MM-dd HH:mm:ss'),
    tx.merchantId,
    tx.merchantName,
    tx.campaignId || '',
    tx.campaignName || '',
    tx.pointsEarned,
    tx.source,
    tx.sourceRef,
    getStatusLabel(tx.status),
    tx.anomalies.map(a => getAnomalyLabel(a)).join('|'),
    tx.anomalyNotes || '',
    (tx.pointsCost || 0).toFixed(2),
    (tx.subsidyCost || 0).toFixed(2),
    (tx.totalCost || 0).toFixed(2),
    tx.revisionHistory.length,
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    anomaly: '异常',
    revised: '已修正',
    pending_review: '待人工确认',
  };
  return map[status] || status;
}

export function getAnomalyLabel(anomaly: string): string {
  const map: Record<string, string> = {
    refund_not_rolledback: '退款未回滚',
    subsidy_cross_campaign: '补贴跨活动',
    points_rate_overlap: '积分倍率叠加',
    manual_review_needed: '需人工确认',
  };
  return map[anomaly] || anomaly;
}

function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    card_transaction: '刷卡流水',
    point_rule: '积分规则',
    merchant_subsidy: '商户补贴',
    refund_record: '退款记录',
    redemption_record: '兑换记录',
    cost_report: '成本报告',
  };
  return map[source] || source;
}

function generateReportContent(
  transactions: Transaction[],
  stats: CostStats,
  options: ExportOptions
): string {
  const unhandled = transactions.filter(tx => tx.status === 'normal' && tx.anomalies.length === 0);
  const revised = transactions.filter(tx => tx.status === 'revised');
  const pending = transactions.filter(tx => tx.status === 'pending_review');
  const anomalies = transactions.filter(tx => tx.status === 'anomaly');

  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  
  let content = `# 信用卡积分成本分析报告\n`;
  content += `生成时间: ${now}\n\n`;
  
  content += `## 一、总体概览\n\n`;
  content += `- 交易总数: ${stats.totalTransactions} 笔\n`;
  content += `- 交易总额: ¥${stats.totalAmount.toFixed(2)}\n`;
  content += `- 总积分: ${stats.totalPoints.toLocaleString()}\n`;
  content += `- 积分总成本: ¥${stats.totalPointsCost.toFixed(2)}\n`;
  content += `- 补贴总成本: ¥${stats.totalSubsidyCost.toFixed(2)}\n`;
  content += `- 总成本合计: ¥${stats.totalCost.toFixed(2)}\n\n`;

  content += `## 二、状态分类统计\n\n`;
  content += `- 未处理 (正常): ${stats.unhandledCount} 笔\n`;
  content += `- 已修正: ${stats.revisedCount} 笔\n`;
  content += `- 需要人工确认: ${stats.pendingReviewCount} 笔\n`;
  content += `- 异常待处理: ${stats.anomalyCount} 笔\n\n`;

  content += `## 三、异常类型分布\n\n`;
  content += `| 异常类型 | 数量 |\n`;
  content += `|----------|------|\n`;
  for (const [type, count] of Object.entries(stats.anomalyBreakdown)) {
    content += `| ${getAnomalyLabel(type)} | ${count} |\n`;
  }
  content += `\n`;

  if (options.includeUnhandled && unhandled.length > 0) {
    content += `## 四、未处理交易 (${unhandled.length} 笔)\n\n`;
    content += `| 交易ID | 商户 | 金额 | 积分 | 成本 | 来源 |\n`;
    content += `|--------|------|------|------|------|------|\n`;
    for (const tx of unhandled.slice(0, 50)) {
      content += `| ${tx.id} | ${tx.merchantName} | ¥${tx.amount.toFixed(2)} | ${tx.pointsEarned} | ¥${(tx.totalCost || 0).toFixed(2)} | ${getSourceLabel(tx.source)} |\n`;
    }
    if (unhandled.length > 50) {
      content += `\n_... 还有 ${unhandled.length - 50} 条记录，详见导出文件_\n`;
    }
    content += `\n`;
  }

  if (options.includeRevised && revised.length > 0) {
    content += `## 五、已修正交易 (${revised.length} 笔)\n\n`;
    for (const tx of revised) {
      content += `### ${tx.id} - ${tx.merchantName}\n`;
      content += `- 金额: ¥${tx.amount.toFixed(2)}\n`;
      content += `- 当前积分: ${tx.pointsEarned}\n`;
      content += `- 修正记录:\n`;
      for (const rev of tx.revisionHistory) {
        content += `  - ${format(new Date(rev.timestamp), 'yyyy-MM-dd HH:mm')} by ${rev.operator}\n`;
        content += `    字段: ${rev.field}, 旧值: ${rev.oldValue} → 新值: ${rev.newValue}\n`;
        content += `    原因: ${rev.reason}\n`;
      }
      content += `\n`;
    }
  }

  if (options.includePendingReview && pending.length > 0) {
    content += `## 六、需要人工确认 (${pending.length} 笔)\n\n`;
    content += `| 交易ID | 商户 | 金额 | 积分 | 异常备注 |\n`;
    content += `|--------|------|------|------|----------|\n`;
    for (const tx of pending) {
      content += `| ${tx.id} | ${tx.merchantName} | ¥${tx.amount.toFixed(2)} | ${tx.pointsEarned} | ${tx.anomalyNotes || ''} |\n`;
    }
    content += `\n`;
  }

  if (options.includeAnomalies && anomalies.length > 0) {
    content += `## 七、异常交易明细 (${anomalies.length} 笔)\n\n`;
    content += `| 交易ID | 商户 | 金额 | 异常类型 | 异常备注 |\n`;
    content += `|--------|------|------|----------|----------|\n`;
    for (const tx of anomalies) {
      content += `| ${tx.id} | ${tx.merchantName} | ¥${tx.amount.toFixed(2)} | ${tx.anomalies.map(a => getAnomalyLabel(a)).join(', ')} | ${tx.anomalyNotes || ''} |\n`;
    }
    content += `\n`;
  }

  if (stats.costByCampaign.length > 0) {
    content += `## 八、按活动成本分摊\n\n`;
    content += `| 活动名称 | 交易数 | 总成本 |\n`;
    content += `|----------|--------|--------|\n`;
    for (const c of stats.costByCampaign) {
      content += `| ${c.campaignName} | ${c.count} | ¥${c.cost.toFixed(2)} |\n`;
    }
    content += `\n`;
  }

  return content;
}

export function exportData(
  transactions: Transaction[],
  stats: CostStats,
  options: ExportOptions
): void {
  let content: string;
  let filename: string;
  let mimeType: string;

  if (options.format === 'csv') {
    content = convertToCSV(transactions);
    filename = `积分成本明细_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    mimeType = 'text/csv;charset=utf-8';
  } else if (options.format === 'json') {
    content = JSON.stringify({
      exportTime: new Date().toISOString(),
      summary: stats,
      transactions,
    }, null, 2);
    filename = `积分成本数据_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    mimeType = 'application/json;charset=utf-8';
  } else {
    content = generateReportContent(transactions, stats, options);
    filename = `积分成本报告_${format(new Date(), 'yyyyMMdd_HHmm')}.md`;
    mimeType = 'text/markdown;charset=utf-8';
  }

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
