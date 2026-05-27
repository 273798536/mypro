const store = require('../models/store');
const queueService = require('./queueService');

function generateReport(db, options) {
  const { startDate, endDate, status } = options || {};
  const now = store.nowIso();

  let releases = [...db.releaseRecords];

  if (status) {
    releases = releases.filter(r => r.status === status);
  }
  if (startDate) {
    releases = releases.filter(r => (r.completedAt || r.lockedAt || r.createdAt) >= startDate);
  }
  if (endDate) {
    releases = releases.filter(r => (r.completedAt || r.lockedAt || r.createdAt) <= endDate);
  }

  const report = {
    reportId: store.genId('RPT'),
    generatedAt: now,
    period: { startDate: startDate || null, endDate: endDate || null, status: status || 'all' },
    summary: {
      total: releases.length,
      completed: releases.filter(r => r.status === 'completed').length,
      failed: releases.filter(r => r.status === 'failed').length,
      pending: releases.filter(r => r.status === 'pending' || r.status === 'locked' || r.status === 'processing').length,
      cancelled: releases.filter(r => r.status === 'cancelled').length,
      totalDeposit: 0,
      totalReleased: 0,
      totalDamage: 0,
      totalLateFee: 0,
      totalShortage: 0
    },
    details: [],
    alerts: db.alerts.filter(a => !a.resolved)
  };

  for (const release of releases) {
    const order = db.orders.find(o => o.id === release.orderId);
    const damages = db.damageReports.filter(d => d.orderId === release.orderId);
    const totalDamage = damages.reduce((s, d) => s + d.amount, 0);
    const lateFee = order && order.lateCheckout ? order.lateCheckout.totalFee : 0;
    const deposit = order ? order.depositAmount : 0;
    const shortage = Math.max(0, totalDamage + lateFee - deposit);

    report.summary.totalDeposit += deposit;
    report.summary.totalReleased += release.status === 'completed' ? release.amount : 0;
    report.summary.totalDamage += totalDamage;
    report.summary.totalLateFee += lateFee;
    report.summary.totalShortage += shortage;

    report.details.push({
      releaseId: release.id,
      orderId: release.orderId,
      customerName: order ? order.customerName : 'Unknown',
      roomNo: order ? order.roomNo : 'Unknown',
      channel: order ? order.channel : 'Unknown',
      depositAmount: deposit,
      totalDamage,
      lateFee,
      releaseAmount: release.amount,
      shortage,
      status: release.status,
      lockedAt: release.lockedAt || null,
      completedAt: release.completedAt || null,
      failedAt: release.failedAt || null,
      failureReason: release.failureReason || null,
      retryCount: release.retryCount || 0,
      damageIds: damages.map(d => d.id),
      correctionTrace: release.releaseHistory || []
    });
  }

  return report;
}

function exportReport(db, format, options) {
  const report = generateReport(db, options);

  if (format === 'json') {
    return {
      contentType: 'application/json',
      content: JSON.stringify(report, null, 2),
      filename: `deposit_release_report_${report.reportId}.json`
    };
  }

  if (format === 'csv') {
    const headers = [
      '释放单号', '订单号', '客人姓名', '房间号', '渠道',
      '押金金额', '客损总额', '延迟退房费', '释放金额', '缺口金额',
      '状态', '锁定时间', '完成时间', '失败原因', '重试次数', '修正痕迹'
    ];

    const lines = [headers.join(',')];
    for (const d of report.details) {
      const trace = (d.correctionTrace || []).map(t => `${t.action}@${t.timestamp}`).join(';');
      lines.push([
        d.releaseId, d.orderId, d.customerName, d.roomNo, d.channel,
        d.depositAmount, d.totalDamage, d.lateFee, d.releaseAmount, d.shortage,
        d.status, d.lockedAt || '', d.completedAt || '', d.failureReason || '',
        d.retryCount, `"${trace}"`
      ].join(','));
    }

    const summaryLine = `\n# 汇总: 共${report.summary.total}条, 完成${report.summary.completed}条, 失败${report.summary.failed}条, 待处理${report.summary.pending}条`;
    const alertLine = `\n# 未解决告警: ${report.alerts.length}条`;
    for (const a of report.alerts) {
      lines.push(`# 告警: [${a.severity}] ${a.message}`);
    }

    return {
      contentType: 'text/csv; charset=utf-8',
      content: '\ufeff' + lines.join('\n') + summaryLine + alertLine,
      filename: `deposit_release_report_${report.reportId}.csv`
    };
  }

  if (format === 'text') {
    const lines = [];
    lines.push(`=== 酒店押金释放报告 ${report.reportId} ===`);
    lines.push(`生成时间: ${report.generatedAt}`);
    lines.push(`统计周期: ${report.period.startDate || '无'} ~ ${report.period.endDate || '无'}`);
    lines.push('');
    lines.push('--- 汇总 ---');
    lines.push(`总记录: ${report.summary.total}`);
    lines.push(`已完成: ${report.summary.completed}`);
    lines.push(`失败: ${report.summary.failed}`);
    lines.push(`待处理: ${report.summary.pending}`);
    lines.push(`已取消: ${report.summary.cancelled}`);
    lines.push(`押金总额: ¥${report.summary.totalDeposit}`);
    lines.push(`已释放总额: ¥${report.summary.totalReleased}`);
    lines.push(`客损总额: ¥${report.summary.totalDamage}`);
    lines.push(`延迟退房费: ¥${report.summary.totalLateFee}`);
    lines.push(`缺口总额: ¥${report.summary.totalShortage}`);
    lines.push('');
    lines.push('--- 明细 ---');
    for (const d of report.details) {
      lines.push(`[${d.status.toUpperCase()}] ${d.releaseId} | 订单${d.orderId} | ${d.customerName} | 房间${d.roomNo} | ${d.channel}`);
      lines.push(`  押金¥${d.depositAmount} - 客损¥${d.totalDamage} - 延迟¥${d.lateFee} = 释放¥${d.releaseAmount}`);
      if (d.shortage > 0) lines.push(`  ⚠️ 缺口 ¥${d.shortage}`);
      if (d.retryCount > 0) lines.push(`  🔄 重试次数: ${d.retryCount}`);
      if (d.failureReason) lines.push(`  ❌ 失败原因: ${d.failureReason}`);
      if (d.correctionTrace && d.correctionTrace.length > 0) {
        for (const t of d.correctionTrace) {
          lines.push(`  📝 ${t.action} @ ${t.timestamp}`);
        }
      }
    }
    if (report.alerts.length > 0) {
      lines.push('');
      lines.push('--- 未解决告警 ---');
      for (const a of report.alerts) {
        lines.push(`[${a.severity.toUpperCase()}] ${a.message}`);
      }
    }

    return {
      contentType: 'text/plain; charset=utf-8',
      content: lines.join('\n'),
      filename: `deposit_release_report_${report.reportId}.txt`
    };
  }

  throw new Error(`不支持的导出格式: ${format}`);
}

module.exports = {
  generateReport,
  exportReport
};