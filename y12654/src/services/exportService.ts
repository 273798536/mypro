import jsPDF from 'jspdf';
import {
  ANOMALY_TYPE_LABEL,
  PROCESS_STATUS_LABEL,
} from '@/types';
import type { AnomalyType, MeasurementRecord, RunVersion, InterceptionRule } from '@/types';

const formatTimestamp = (ts: string): string => ts.replace(/[-: ]/g, '').slice(0, 12);

export const getReportFileName = (version: RunVersion): string => {
  const runNum = version.id.replace('run-', '');
  return `organelle-report-${formatTimestamp(version.timestamp)}-run${runNum}.pdf`;
};

export const generateReportPDF = async (
  version: RunVersion,
  records: MeasurementRecord[],
  rules: InterceptionRule[],
): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  const addText = (text: string, size: number, bold = false, indent = 0) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(text, margin + indent, y);
    y += size + 6;
  };

  const checkPage = (needSpace: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  addText('细胞器三维拼装 - 测量记录复核报告', 18, true);
  addText('', 6);
  addText(`运行版本: ${version.label}  (${version.id})`, 11);
  addText(`生成时间: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, 11);
  addText(`记录总数: ${records.length} 条`, 11);

  const types: AnomalyType[] = ['coordinate_mismatch', 'timing_desync', 'precision_overrun', 'data_missing'];
  const summary: Record<AnomalyType, number> = {
    coordinate_mismatch: 0, timing_desync: 0, precision_overrun: 0, data_missing: 0,
  };
  records.forEach((r) => r.anomalies.forEach((a) => { summary[a.type] += 1; }));

  checkPage(100);
  addText('', 6);
  addText('异常汇总', 14, true);
  types.forEach((t) => {
    addText(`${ANOMALY_TYPE_LABEL[t]}: ${summary[t]} 条`, 11, false, 12);
  });

  checkPage(120);
  addText('', 6);
  addText('拦截规则说明', 14, true);
  rules.forEach((rule) => {
    checkPage(140);
    addText('', 4);
    addText(`[${ANOMALY_TYPE_LABEL[rule.anomalyType]}] ${rule.ruleName}`, 12, true);
    addText(`规则描述: ${rule.ruleDescription}`, 10, false, 12);
    addText(`判定标准: ${rule.criteria}`, 10, false, 12);
    addText(`影响后果: ${rule.consequence}`, 10, false, 12);
  });

  checkPage(80);
  addText('', 6);
  addText('测量记录明细', 14, true);
  records.forEach((r, idx) => {
    checkPage(200);
    addText('', 4);
    addText(`#${idx + 1} 记录 ${r.id}  [${r.timestamp}]`, 12, true);
    addText(`来源: ${r.source.upstreamId}  |  设备: ${r.source.device}  |  操作员: ${r.source.operator}  |  位置: ${r.source.location}`, 9, false, 12);
    addText(`系统建议: ${r.opinion.systemSuggestion}`, 10, false, 12);
    if (r.opinion.manualNote) addText(`人工备注: ${r.opinion.manualNote}`, 10, false, 12);
    if (r.opinion.riskRemarks) addText(`风险备注: ${r.opinion.riskRemarks}`, 10, false, 12);
    addText(`处理决定: ${r.opinion.decision ? PROCESS_STATUS_LABEL[r.opinion.decision] : '未决定'}`, 10, false, 12);
    addText('异常项:', 10, true, 12);
    r.anomalies.forEach((a, ai) => {
      addText(
        `  ${ai + 1}. ${ANOMALY_TYPE_LABEL[a.type]} - ${a.partName}: 实测=${a.measuredValue} 标准=${a.standardValue} 偏差=${a.deviation} 阈值=${a.threshold} (${PROCESS_STATUS_LABEL[a.status]})`,
        9, false, 18,
      );
    });
  });

  checkPage(40);
  addText('', 8);
  addText(`--- 报告结束 ---`, 10, true);

  return doc.output('blob');
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
