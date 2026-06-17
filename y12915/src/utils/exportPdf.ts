import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type {
  ConfidenceInterval,
  EvaluationSample,
  ExportConfig,
  GroupedCI,
  ModelVersion,
  PrecheckResult,
  SafetyRule,
} from '@/types';

function getEffectiveScore(sample: EvaluationSample): number {
  if (sample.afterScore !== undefined) return sample.afterScore;
  if (sample.humanCorrectedScore !== undefined) return sample.humanCorrectedScore;
  return sample.modelScore;
}

function getBeforeScore(sample: EvaluationSample): number {
  if (sample.beforeScore !== undefined) return sample.beforeScore;
  return sample.modelScore;
}

function isSampleCorrected(sample: EvaluationSample): boolean {
  if (sample.isCorrected !== undefined) return sample.isCorrected;
  return sample.humanCorrectedScore !== undefined;
}

function formatCI(ci: ConfidenceInterval): string {
  return `均值=${ci.mean.toFixed(2)} [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}] (n=${ci.n}, std=${ci.std.toFixed(2)})`;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return dateStr;
  }
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

export async function generatePdfReport(
  config: ExportConfig,
  data: {
    versions: ModelVersion[];
    samples: EvaluationSample[];
    rules: SafetyRule[];
    ci: GroupedCI[];
    precheck: PrecheckResult[];
  }
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  let y = margin;
  const lineHeight = 14;

  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(text, margin, y);
    y += lineHeight;
  };

  const addWrappedText = (text: string, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight;
  };

  const checkNewPage = (neededLines: number = 5) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + neededLines * lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  addText(config.title, 18, true);
  y += 8;
  addText(`作者: ${config.author}`);
  addText(`导出时间: ${formatDate(config.createdAt)}`);
  addText(`版本ID: ${config.versionId}`);
  y += 12;

  addText('================================================================', 10);
  addText('一、预检结果', 14, true);
  y += 4;
  for (const item of data.precheck) {
    addText(`  [${item.status.toUpperCase()}] ${item.name}`, 11, true);
    addWrappedText(`    ${item.message}`);
    if (item.details) {
      addText(`    详情: ${JSON.stringify(item.details)}`, 9);
    }
    y += 4;
  }
  y += 8;

  checkNewPage(20);
  addText('================================================================', 10);
  addText('二、安全规则校验', 14, true);
  y += 4;
  for (const rule of data.rules) {
    const pageFlag = rule.pageStatus === undefined ? 'PENDING' : rule.pageStatus ? 'PASS' : 'FAIL';
    const exportFlag = rule.exportStatus === undefined ? 'PENDING' : rule.exportStatus ? 'PASS' : 'FAIL';
    const consistency = rule.isConsistent !== undefined ? (rule.isConsistent ? '[一致]' : '[不一致]') : '';
    const ruleInfo = rule.threshold !== undefined && rule.operator !== undefined
      ? ` (阈值: ${rule.operator} ${rule.threshold})`
      : '';
    addText(
      `  [页面:${pageFlag}] [导出:${exportFlag}] ${consistency} ${rule.name}${ruleInfo}`,
      11,
      true
    );
    if (rule.actualValue !== undefined) {
      addText(`    实际值: ${typeof rule.actualValue === 'number' ? rule.actualValue.toFixed(2) : rule.actualValue}`);
    }
    if (rule.description) {
      addText(`    描述: ${rule.description}`);
    }
    if (rule.detail) {
      addWrappedText(`    详情: ${rule.detail}`);
    }
    y += 4;
  }
  y += 8;

  checkNewPage(20);
  addText('================================================================', 10);
  addText('三、置信区间分析', 14, true);
  y += 4;
  for (const group of data.ci) {
    addText(`  分组: ${group.group}`, 12, true);
    addText(`    95% CI: ${formatCI(group.ci)}`);
    addText(`    直方图分布: `, 10, false);
    const histStr = group.histogram
      .map((b) => `[${b.range[0]}-${b.range[1]}]:${b.count}`)
      .join('  ');
    addWrappedText(`      ${histStr}`);
    y += 6;
  }
  y += 8;

  checkNewPage(30);
  addText('================================================================', 10);
  addText('四、模型版本信息', 14, true);
  y += 4;
  for (const v of data.versions) {
    addText(`  版本: ${v.version}`, 11, true);
    addText(`    ID: ${v.id}`);
    if (v.batchName) addText(`    批次: ${v.batchName}`);
    if (v.trainDate) addText(`    训练日期: ${v.trainDate}`);
    if (v.commitHash) addText(`    Commit: ${v.commitHash}`);
    if (v.sampleCount !== undefined) addText(`    样本数: ${v.sampleCount}`);
    if (v.batchCount !== undefined) addText(`    批次数量: ${v.batchCount}`);
    if (v.description) addWrappedText(`    描述: ${v.description}`);
    if (v.createdAt) addText(`    创建时间: ${formatDate(v.createdAt)}`);
    y += 4;
  }
  y += 8;

  checkNewPage(25);
  addText(`五、样本摘要 (共 ${data.samples.length} 条)`, 14, true);
  y += 4;
  const corrected = data.samples.filter((s) => isSampleCorrected(s)).length;
  const withImages = data.samples.filter((s) => !!s.imageName).length;
  const withSourceNotes = data.samples.filter((s) => !!s.sourceNote).length;
  const traceComplete = data.samples.filter((s) => !!s.originalRowNumber && !!s.sourceFileName).length;
  const beforeAvg =
    data.samples.length > 0
      ? data.samples.reduce((s, x) => s + getBeforeScore(x), 0) / data.samples.length
      : 0;
  const afterAvg =
    data.samples.length > 0
      ? data.samples.reduce((s, x) => s + getEffectiveScore(x), 0) / data.samples.length
      : 0;
  addText(`  人工修正: ${corrected} 条 (${((corrected / Math.max(data.samples.length, 1)) * 100).toFixed(1)}%)`);
  addText(`  含图片: ${withImages} 条 (${((withImages / Math.max(data.samples.length, 1)) * 100).toFixed(1)}%)`);
  addText(`  含来源备注: ${withSourceNotes} 条 (${((withSourceNotes / Math.max(data.samples.length, 1)) * 100).toFixed(1)}%)`);
  addText(`  追溯完整: ${traceComplete} 条 (${((traceComplete / Math.max(data.samples.length, 1)) * 100).toFixed(1)}%)`);
  addText(`  修正前平均: ${beforeAvg.toFixed(2)}`);
  addText(`  修正后平均: ${afterAvg.toFixed(2)}`);
  addText(`  平均提升: ${(afterAvg - beforeAvg).toFixed(2)}`);
  y += 8;

  if (config.includeRawData && data.samples.length > 0) {
    checkNewPage(15);
    addText('================================================================', 10);
    addText(`六、样本明细 (共 ${data.samples.length} 条，完整导出)`, 14, true);
    y += 6;
    for (let i = 0; i < data.samples.length; i++) {
      const sample = data.samples[i];
      const before = getBeforeScore(sample);
      const after = getEffectiveScore(sample);
      const correctedFlag = isSampleCorrected(sample);
      const rowInfo = sample.originalRowNumber
        ? `行#${sample.originalRowNumber}`
        : sample.id;

      checkNewPage(6);

      addText(
        `[${i + 1}] ${rowInfo} | before:${before} | after:${after} | corrected:${correctedFlag ? '是' : '否'} | 状态:${sample.reviewStatus ?? '-'} | 置信度:${sample.confidenceLevel ?? '-'}`,
        9,
        true
      );
      if (sample.sourceFileName || sample.batchId || sample.dataSource) {
        addText(
          `    文件:${sample.sourceFileName ?? '-'} | 批次:${sample.batchId ?? '-'} | 数据源:${sample.dataSource ?? '-'}`,
          8
        );
      }
      if (sample.imageName || sample.imageType) {
        addText(
          `    图片名:${sample.imageName ?? '-'} | 类型:${sample.imageType ?? '-'} | 链接:${truncate(sample.imageUrl ?? '-', 60)}`,
          8
        );
      }
      if (sample.sourceNote) {
        addWrappedText(`    来源备注: ${sample.sourceNote}`, 8);
      }
      if (correctedFlag && (sample.correctionReason || sample.correctedBy || sample.correctedAt)) {
        addText(
          `    修正理由:${sample.correctionReason ?? '-'} | 修正人:${sample.correctedBy ?? '-'} | 修正时间:${sample.correctedAt ?? '-'}`,
          8
        );
      }
      y += 2;
    }
  }

  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
