import type { RiskRecord, FilterConditions, SummaryStats } from '../types';

function computeStats(records: RiskRecord[]): SummaryStats {
  const validRecords = records.filter(r => r.processingStatus !== 'currency_error' && r.processingStatus !== 'withdrawn');
  return {
    total: records.length,
    highRisk: validRecords.filter(r => r.riskLevel === 'high').length,
    mediumRisk: validRecords.filter(r => r.riskLevel === 'medium').length,
    lowRisk: validRecords.filter(r => r.riskLevel === 'low').length,
    anomalyCount: records.filter(r => r.isAnomaly).length,
    withdrawalCount: records.filter(r => r.withdrawalRecord || r.manualNotes.some(n => n.isWithdrawn)).length,
    pendingCount: records.filter(r => r.processingStatus.includes('pending')).length,
    currencyErrorCount: records.filter(r => r.processingStatus === 'currency_error').length
  };
}

function formatAmount(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)} 亿元`;
  } else if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)} 万元`;
  }
  return `${amount} 元`;
}

function riskLevelLabel(level: string): string {
  const map: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  return map[level] || level;
}

function processingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    normal_passed: '正常通过',
    normal_pending: '待复核',
    anomaly_fixed: '异常已修复',
    anomaly_pending: '异常待处理',
    currency_error: '币种错误（待修正）',
    withdrawn: '已撤回'
  };
  return map[status] || status;
}

export function generateMarkdownReport(records: RiskRecord[], filters: FilterConditions): string {
  const filtered = records.filter(record => {
    if (filters.riskLevel !== 'all' && record.riskLevel !== filters.riskLevel) return false;
    if (filters.processingStatus !== 'all' && record.processingStatus !== filters.processingStatus) return false;
    if (filters.isAnomaly !== 'all' && record.isAnomaly !== filters.isAnomaly) return false;
    if (filters.hasWithdrawal !== 'all') {
      const hasWithdrawal = !!record.withdrawalRecord || record.manualNotes.some(n => n.isWithdrawn);
      if (hasWithdrawal !== filters.hasWithdrawal) return false;
    }
    if (filters.bondCode && !record.bondCode.toLowerCase().includes(filters.bondCode.toLowerCase())) return false;
    if (filters.dateRange.start && record.raiseDate < filters.dateRange.start) return false;
    if (filters.dateRange.end && record.raiseDate > filters.dateRange.end) return false;
    return true;
  });

  const stats = computeStats(filtered);
  const today = new Date().toISOString().slice(0, 10);
  const totalAmount = filtered.reduce((sum, r) => sum + r.raiseAmount, 0);

  const filterDescription: string[] = [];
  if (filters.riskLevel !== 'all') filterDescription.push(`风险等级：${riskLevelLabel(filters.riskLevel)}`);
  if (filters.processingStatus !== 'all') filterDescription.push(`处理状态：${processingStatusLabel(filters.processingStatus)}`);
  if (filters.isAnomaly !== 'all') filterDescription.push(filters.isAnomaly ? '仅异常记录' : '仅正常记录');
  if (filters.hasWithdrawal !== 'all') filterDescription.push(filters.hasWithdrawal ? '含撤回记录' : '不含撤回记录');
  if (filters.bondCode) filterDescription.push(`债券代码包含：${filters.bondCode}`);
  if (filters.dateRange.start || filters.dateRange.end) {
    const start = filters.dateRange.start || '不限';
    const end = filters.dateRange.end || '不限';
    filterDescription.push(`募集日期：${start} ~ ${end}`);
  }

  const md: string[] = [];

  md.push('# 绿色债券募集款风险预警报告');
  md.push('');
  md.push(`> 报告生成日期：${today}  `);
  md.push(`> 统计范围：${filtered.length} 条记录（共 ${records.length} 条，经筛选后），涉及募集金额 ${formatAmount(totalAmount)}`);
  if (filterDescription.length > 0) {
    md.push(`> 筛选条件：${filterDescription.join('；')}`);
  } else {
    md.push('> 筛选条件：无（展示全部记录）');
  }
  md.push(`> 数据快照：本报告基于生成时刻的页面数据，含已持久化的人工备注和撤回结论。刷新页面后数据不会丢失。`);
  md.push('');

  md.push('## 一、风险汇总');
  md.push('');
  md.push('| 指标 | 数量 | 说明 |');
  md.push('| --- | ---: | --- |');
  md.push(`| 记录总数 | ${stats.total} | 当前筛选条件下全部记录 |`);
  md.push(`| 高风险 | ${stats.highRisk} | 不含币种错误和已撤回记录 |`);
  md.push(`| 中风险 | ${stats.mediumRisk} | 不含币种错误和已撤回记录 |`);
  md.push(`| 低风险 | ${stats.lowRisk} | 不含币种错误和已撤回记录 |`);
  md.push(`| 异常记录 | ${stats.anomalyCount} | 含数据异常和业务异常 |`);
  md.push(`| 待处理 | ${stats.pendingCount} | 需人工介入处理 |`);
  md.push(`| 含撤回记录 | ${stats.withdrawalCount} | 有历史撤回说明或撤回备注 |`);
  md.push(`| 币种错误 | ${stats.currencyErrorCount} | 数据录入错误，不计入风险统计 |`);
  md.push('');

  const anomalyRecords = filtered.filter(r => r.isAnomaly || r.processingStatus === 'currency_error' || r.processingStatus === 'withdrawn');
  if (anomalyRecords.length > 0) {
    md.push('## 二、重点关注记录');
    md.push('');
    md.push('以下记录需重点关注，异常/撤回原因与最终结论已关联：');
    md.push('');
    anomalyRecords.forEach(r => {
      md.push(`### ${r.bondName}（${r.bondCode}）`);
      md.push('');
      md.push(`- **募集日期**：${r.raiseDate}  `);
      md.push(`- **募集金额**：${formatAmount(r.raiseAmount)} ${r.currency}  `);
      md.push(`- **风险等级**：${riskLevelLabel(r.riskLevel)}  `);
      md.push(`- **处理状态**：${processingStatusLabel(r.processingStatus)}  `);
      md.push(`- **风险类型**：${r.riskType}  `);
      md.push('');
      md.push('**风险描述**：');
      md.push(`> ${r.riskDescription}`);
      md.push('');
      md.push('**处理结果**：');
      md.push(`> ${r.processingResult}`);
      md.push('');
      if (r.withdrawalRecord) {
        md.push('**撤回记录关联**：');
        md.push(`> 撤回人：${r.withdrawalRecord.withdrawnBy}  `);
        md.push(`> 撤回时间：${r.withdrawalRecord.withdrawnAt}  `);
        md.push(`> 撤回原因：${r.withdrawalRecord.withdrawnReason}  `);
        md.push(`> 关联结论编号：${r.withdrawalRecord.linkedConclusionId}`);
        md.push('');
      }
      const finalNote = r.manualNotes.find(n => !n.isWithdrawn && n.source === 'manual');
      if (finalNote) {
        md.push('**最终结论**：');
        md.push(`> ${finalNote.content}  `);
        md.push(`> —— ${finalNote.author}（${finalNote.authorRole}），${finalNote.createdAt}`);
        md.push('');
      }
      md.push(`**对汇总的影响说明**：${r.summaryImpact}`);
      md.push('');
      md.push('---');
      md.push('');
    });
  }

  const judgmentChanges = filtered.filter(r => r.historicalJudgments.length > 1);
  if (judgmentChanges.length > 0) {
    md.push('## 三、判断变更历史（资金主管干预记录）');
    md.push('');
    md.push('以下记录存在判断变更，变更内容已完整留存，可供下一班追溯：');
    md.push('');
    judgmentChanges.forEach(r => {
      md.push(`### ${r.bondName}（${r.bondCode}）`);
      md.push('');
      r.historicalJudgments.forEach((j, idx) => {
        const tag = j.isFinal ? ' 🔴 **最终结论**' : '';
        md.push(`${idx + 1}. ${j.judgedAt} —— ${j.judger}（${j.judgerRole}）${tag}`);
        md.push(`   - 判断：${j.judgment}`);
        md.push(`   - 理由：${j.reason}`);
        md.push('');
      });
      md.push('---');
      md.push('');
    });
  }

  md.push('## 四、全部记录清单');
  md.push('');
  md.push('| 债券代码 | 债券名称 | 发行人 | 募集日期 | 金额 | 风险等级 | 处理状态 | 是否异常 | 责任人 |');
  md.push('| --- | --- | --- | --- | ---: | --- | --- | --- | --- |');
  filtered.forEach(r => {
    md.push(`| ${r.bondCode} | ${r.bondName} | ${r.issuer} | ${r.raiseDate} | ${formatAmount(r.raiseAmount)} | ${riskLevelLabel(r.riskLevel)} | ${processingStatusLabel(r.processingStatus)} | ${r.isAnomaly ? '是' : '否'} | ${r.responsiblePerson} |`);
  });
  md.push('');

  md.push('---');
  md.push('');
  md.push('*本报告由绿色债券募集款风险预警系统自动生成，可直接用于与资金主管、风控部门的沟通会议。*');

  return md.join('\n');
}
