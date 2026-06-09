import { jsPDF } from 'jspdf';
import type {
  VerificationRecord,
  AdditiveItem,
  SourceRow,
  TemperatureProfile,
  SafetyAlert,
  RetestSuggestion,
} from '@/types';
import { statusLabel } from './consistency';

export interface ExportPayload {
  record: VerificationRecord;
  items: AdditiveItem[];
  sourceRows: SourceRow[];
  profile: TemperatureProfile | undefined;
  alerts: SafetyAlert[];
  retests: RetestSuggestion[];
  exportedAt: string;
}

export function buildJsonExport(payload: ExportPayload): Blob {
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
}

export function buildPdfExport(payload: ExportPayload): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('食品添加剂残留核验报告', pageWidth / 2, y, { align: 'center' });
  y += 30;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`批次号：${payload.record.batchNumber}`, 50, y);
  doc.text(`核验结论：${statusLabel(payload.record.status)}`, pageWidth - 200, y);
  y += 18;
  doc.text(`导出时间：${payload.exportedAt}`, 50, y);
  doc.text(`复核人：${payload.record.reviewedBy || '—'}`, pageWidth - 200, y);
  y += 18;
  if (payload.profile) {
    doc.text(`温度曲线：${payload.profile.name}（${payload.profile.version}）`, 50, y);
    y += 18;
  }
  doc.text(`来源备注：${payload.record.sourceNote || '—'}`, 50, y);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('一、核验结果汇总', 50, y);
  y += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const s = payload.record.summary;
  doc.text(`总条目 ${s.total} ｜ 通过 ${s.passCount} ｜ 待复核 ${s.reviewCount} ｜ 不合格 ${s.failCount}`, 50, y);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('二、添加剂残留明细', 50, y);
  y += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('名称', 50, y);
  doc.text('实测', 160, y);
  doc.text('换算(mg/kg)', 220, y);
  doc.text('限量', 295, y);
  doc.text('判定', 355, y);
  doc.text('原始行号/图谱', 400, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  payload.items.forEach((it) => {
    if (y > 760) { doc.addPage(); y = 50; }
    doc.text(it.name, 50, y);
    doc.text(`${it.measuredValue} ${it.measuredUnit}`, 160, y);
    doc.text(String(it.convertedMgPerKg), 220, y);
    doc.text(`${it.limitValue} mg/kg`, 295, y);
    doc.text(it.isPass ? '通过' : '不合格', 355, y);
    doc.text(`L${it.sourceRowNumber} / ${it.sourceImageName || '—'}`, 400, y);
    y += 14;
    if (it.failureReason) {
      doc.setFont('helvetica', 'italic');
      doc.text(`  → ${it.failureReason}`, 160, y);
      doc.setFont('helvetica', 'normal');
      y += 14;
    }
  });

  y += 16;
  if (y > 700) { doc.addPage(); y = 50; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('三、安全提示', 50, y);
  y += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  payload.alerts.forEach((a) => {
    if (y > 760) { doc.addPage(); y = 50; }
    const levelText = a.level === 'danger' ? '【危险】' : a.level === 'warning' ? '【警告】' : '【安全】';
    doc.text(`${levelText} ${a.message}`, 50, y);
    y += 14;
    doc.text(`     条款：${a.standardClause}`, 56, y);
    y += 16;
  });

  if (payload.retests.length > 0) {
    y += 10;
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('四、复测建议', 50, y);
    y += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    payload.retests.forEach((r) => {
      if (y > 760) { doc.addPage(); y = 50; }
      const pText = r.priority === 'high' ? '【高】' : r.priority === 'medium' ? '【中】' : '【低】';
      doc.text(`${pText} ${r.additiveName}：${r.reason}`, 50, y);
      y += 14;
      doc.text(`     建议样品数：${r.sampleCount}；方法：${r.method}`, 56, y);
      y += 16;
    });
  }

  if (payload.sourceRows.length > 0) {
    y += 10;
    if (y > 660) { doc.addPage(); y = 50; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('五、溯源信息（原始行号/图谱/备注）', 50, y);
    y += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    payload.sourceRows.forEach((row) => {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.text(`第 ${row.rowNumber} 行 ｜ ${row.imageName || '无图'} ｜ ${row.remark || '无备注'}`, 50, y);
      y += 14;
      doc.text(`    原始内容：${row.rawContent}`, 56, y);
      y += 16;
    });
  }

  return doc.output('blob');
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
