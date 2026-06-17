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
  const lineHeight = 16;

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

  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 10);
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
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 10);
  addText('二、安全规则校验', 14, true);
  y += 4;
  for (const rule of data.rules) {
    const statusFlag = rule.pageStatus === undefined ? 'pending' : rule.pageStatus ? 'pass' : 'fail';
    const ruleInfo = rule.threshold !== undefined && rule.operator !== undefined
      ? ` (阈值: ${rule.operator} ${rule.threshold})`
      : '';
    addText(
      `  [${statusFlag.toUpperCase()}] ${rule.name}${ruleInfo}`,
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
    if (rule.isConsistent !== undefined) {
      addText(`    一致性: ${rule.isConsistent ? '一致' : '不一致'}`);
    }
    y += 4;
  }
  y += 8;

  checkNewPage(20);
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 10);
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
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 10);
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
  const beforeAvg =
    data.samples.length > 0
      ? data.samples.reduce((s, x) => s + getBeforeScore(x), 0) / data.samples.length
      : 0;
  const afterAvg =
    data.samples.length > 0
      ? data.samples.reduce((s, x) => s + getEffectiveScore(x), 0) / data.samples.length
      : 0;
  addText(`  人工修正: ${corrected} 条 (${((corrected / Math.max(data.samples.length, 1)) * 100).toFixed(1)}%)`);
  addText(`  修正前平均: ${beforeAvg.toFixed(2)}`);
  addText(`  修正后平均: ${afterAvg.toFixed(2)}`);
  addText(`  平均提升: ${(afterAvg - beforeAvg).toFixed(2)}`);
  y += 8;

  if (config.includeRawData && data.samples.length > 0) {
    checkNewPage(30);
    addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 10);
    addText('六、样本明细 (前 20 条)', 14, true);
    y += 4;
    const previewSamples = data.samples.slice(0, 20);
    for (const sample of previewSamples) {
      const before = getBeforeScore(sample);
      const after = getEffectiveScore(sample);
      const corrected = isSampleCorrected(sample);
      const rowInfo = sample.originalRowNumber
        ? `行#${sample.originalRowNumber}`
        : sample.id;
      addText(
        `  ${rowInfo} | before: ${before} | after: ${after} | corrected: ${corrected ? '是' : '否'}`,
        9
      );
      if (sample.sourceFileName) {
        addText(`    文件: ${sample.sourceFileName}`, 8);
      }
      y += 2;
    }
    if (data.samples.length > 20) {
      addText(`  ... 其余 ${data.samples.length - 20} 条样本省略`, 9);
    }
  }

  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
