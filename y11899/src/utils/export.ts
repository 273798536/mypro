import { ScoredSupplier, WeightConfig, JudgeNote, ConsistencyReport } from '@/types';
import { DIMENSION_LABELS } from '@/types';

export function exportToCSV(
  scoredSuppliers: ScoredSupplier[],
  weights: WeightConfig,
  notes: JudgeNote[],
  report: ConsistencyReport | null
): string {
  const BOM = '\uFEFF';
  const lines: string[] = [];

  lines.push('多目标评分排序结果');
  lines.push('');

  lines.push('当前权重配置');
  lines.push(`价格权重,${weights.price}%`);
  lines.push(`能耗权重,${weights.energyConsumption}%`);
  lines.push(`售后权重,${weights.afterSales}%`);
  lines.push(`交付期权重,${weights.deliveryPeriod}%`);
  lines.push('');

  lines.push('排名结果');
  lines.push('排名,供应商,来源,价格(万元),能耗(kW·h),售后(分),交付期(天),价格得分,能耗得分,售后得分,交付期得分,加权总分,状态,淘汰原因');

  for (const s of scoredSuppliers) {
    const status = s.eliminated ? '已淘汰' : '正常';
    const reason = s.eliminationReason || '';
    const rank = s.eliminated ? '-' : String(s.rank);
    lines.push([
      rank,
      s.quote.name,
      s.quote.source,
      s.quote.price,
      s.quote.energyConsumption,
      s.quote.afterSales,
      s.quote.deliveryPeriod,
      s.dimensionScores.price,
      s.dimensionScores.energyConsumption,
      s.dimensionScores.afterSales,
      s.dimensionScores.deliveryPeriod,
      s.weightedScore,
      status,
      reason,
    ].join(','));
  }
  lines.push('');

  lines.push('评委备注');
  lines.push('供应商,评分项,评委,备注内容,时间');
  for (const n of notes) {
    lines.push([
      n.supplierId,
      DIMENSION_LABELS[n.dimension] || n.dimension,
      n.author,
      `"${n.content.replace(/"/g, '""')}"`,
      new Date(n.timestamp).toLocaleString('zh-CN'),
    ].join(','));
  }
  lines.push('');

  if (report) {
    lines.push('一致性校验报告');
    lines.push('校验项,结果,详情');
    for (const c of report.checks) {
      lines.push([
        c.name,
        c.passed ? '通过' : '未通过',
        `"${c.detail.replace(/"/g, '""')}"`,
      ].join(','));
    }
  }

  return BOM + lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
