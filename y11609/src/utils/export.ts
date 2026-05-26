import type { Claim, AnomalyType } from '@/types';
import { anomalyLabels, statusLabels } from '@/types';

export function exportToJSON(claim: Claim): void {
  const dataStr = JSON.stringify(claim, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `理赔单_${claim.id}_${claim.claimant}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(claim: Claim): void {
  const rows: string[][] = [];

  rows.push(['理赔单编号', claim.id]);
  rows.push(['保单号', claim.policyNo]);
  rows.push(['申请人', claim.claimant]);
  rows.push(['状态', statusLabels[claim.status]]);
  rows.push(['创建时间', new Date(claim.createdAt).toLocaleString('zh-CN')]);
  rows.push(['更新时间', new Date(claim.updatedAt).toLocaleString('zh-CN')]);
  rows.push([]);

  rows.push(['=== 保单信息 ===']);
  rows.push(['被保险人', claim.policy.policyholder]);
  rows.push(['产品名称', claim.policy.productName]);
  rows.push(['保额', claim.policy.coverage.toString()]);
  rows.push(['保险期间', `${claim.policy.effectiveDate} 至 ${claim.policy.expiryDate}`]);
  rows.push(['数据来源', claim.policy.source === 'system' ? '系统导入' : '人工录入']);
  rows.push([]);

  rows.push(['=== 赔付计算 ===']);
  rows.push(['总金额', claim.totalAmount.toFixed(2)]);
  rows.push(['免赔额', claim.deductible.toFixed(2)]);
  rows.push(['共保比例', `${(claim.coinsuranceRate * 100).toFixed(0)}%`]);
  rows.push(['赔付金额', claim.payoutAmount.toFixed(2)]);
  rows.push(['适用规则', claim.deductRule.ruleName]);
  rows.push([]);

  rows.push(['=== 票据信息 ===']);
  rows.push(['票据号', '金额', '开票日期', '来源', '是否重复']);
  claim.receipts.forEach((r) => {
    rows.push([
      r.receiptNo,
      r.amount.toFixed(2),
      r.issueDate,
      r.source === 'system' ? '系统导入' : '人工录入',
      r.isDuplicate ? '是' : '否',
    ]);
  });
  rows.push([]);

  rows.push(['=== 补充材料 ===']);
  rows.push(['材料名称', '状态', '备注']);
  claim.supplements.forEach((s) => {
    rows.push([
      s.itemName,
      s.status === 'pending' ? '待提供' : s.status === 'provided' ? '已提供' : '已豁免',
      s.remark,
    ]);
  });
  rows.push([]);

  if (claim.anomalies.length > 0) {
    rows.push(['=== 异常提示 ===']);
    claim.anomalies.forEach((a: AnomalyType) => {
      rows.push([anomalyLabels[a]]);
    });
    rows.push([]);
  }

  rows.push(['=== 赔付结论 ===']);
  rows.push([claim.conclusion]);

  const csvContent = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `理赔单_${claim.id}_${claim.claimant}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCalculationNote(
  claim: Claim,
  calculationSteps: string[],
  anomalies: AnomalyType[]
): void {
  let content = `保险理赔赔付计算说明\n`;
  content += `========================\n\n`;
  content += `理赔单编号：${claim.id}\n`;
  content += `申请人：${claim.claimant}\n`;
  content += `保单号：${claim.policyNo}\n`;
  content += `打印时间：${new Date().toLocaleString('zh-CN')}\n\n`;

  content += `一、保单信息\n`;
  content += `  被保险人：${claim.policy.policyholder}\n`;
  content += `  产品名称：${claim.policy.productName}\n`;
  content += `  保险期间：${claim.policy.effectiveDate} 至 ${claim.policy.expiryDate}\n\n`;

  content += `二、费用明细\n`;
  claim.receipts.forEach((r, i) => {
    content += `  ${i + 1}. 票据号 ${r.receiptNo}：${r.amount.toFixed(2)} 元（${r.issueDate}）\n`;
  });
  content += `  合计：${claim.totalAmount.toFixed(2)} 元\n\n`;

  content += `三、计算过程\n`;
  calculationSteps.forEach((step, i) => {
    content += `  ${i + 1}. ${step}\n`;
  });
  content += `\n  最终赔付金额：${claim.payoutAmount.toFixed(2)} 元\n\n`;

  if (anomalies.length > 0) {
    content += `四、异常说明\n`;
    anomalies.forEach((a) => {
      content += `  ⚠️  ${anomalyLabels[a]}\n`;
    });
    content += `\n`;
  }

  if (claim.supplements.length > 0) {
    content += `五、补充材料\n`;
    claim.supplements.forEach((s, i) => {
      const status = s.status === 'pending' ? '待提供' : s.status === 'provided' ? '已提供' : '已豁免';
      content += `  ${i + 1}. ${s.itemName}：${status}${s.remark ? ` - ${s.remark}` : ''}\n`;
    });
    content += `\n`;
  }

  content += `六、赔付结论\n`;
  content += `  ${claim.conclusion}\n\n`;

  content += `经办人：__________  日期：__________\n`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `赔付说明_${claim.id}_${claim.claimant}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
