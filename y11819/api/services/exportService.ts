import { getCalculationDetail } from './calculationService.js';
import { getSegmentsByCalculationId } from '../db/repositories/calculationRepo.js';
import * as XLSX from 'xlsx';

export function exportToBuffer(calculationIds: string[], format: 'csv' | 'excel', includeAuditTrail: boolean): Buffer {
  const rows: Record<string, unknown>[] = [];

  for (const id of calculationIds) {
    const calc = getCalculationDetail(id);
    if (!calc) continue;

    for (const seg of calc.segments) {
      rows.push({
        船名: calc.vesselName,
        港口: calc.port,
        靠泊时间: calc.berthTime,
        时段开始: seg.startTime,
        时段结束: seg.endTime,
        时段类型: seg.type === 'free' ? '免费期' : '计费期',
        费率阶梯: seg.rateTier,
        费率: seg.rate,
        时长小时: seg.hours,
        金额: seg.amount,
        豁免时长: seg.exemptions.reduce((s, e) => s + e.hours, 0),
        需复核: seg.needsReview ? '是' : '否',
        复核原因: seg.reviewReason || '',
      });
    }

    rows.push({
      船名: calc.vesselName,
      港口: calc.port,
      靠泊时间: calc.berthTime,
      时段开始: '合计',
      时段结束: '',
      时段类型: '',
      费率阶梯: '',
      费率: '',
      时长小时: calc.chargeableHours,
      金额: calc.totalDemurrage,
      豁免时长: calc.exemptedHours,
      需复核: calc.flags.length > 0 ? '是' : '否',
      复核原因: calc.flags.join(', '),
    });

    if (includeAuditTrail) {
      for (const step of calc.auditTrail) {
        rows.push({
          船名: calc.vesselName,
          港口: calc.port,
          靠泊时间: `[计算流水] ${step.step}`,
          时段开始: step.description,
          时段结束: '',
          时段类型: '',
          费率阶梯: '',
          费率: '',
          时长小时: '',
          金额: '',
          豁免时长: '',
          需复核: '',
          复核原因: '',
        });
      }
    }
  }

  if (format === 'excel') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '滞期费试算');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  const header = Object.keys(rows[0] || {});
  const csvLines = [header.join(',')];
  for (const row of rows) {
    csvLines.push(header.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','));
  }
  return Buffer.from('\uFEFF' + csvLines.join('\n'), 'utf-8');
}
