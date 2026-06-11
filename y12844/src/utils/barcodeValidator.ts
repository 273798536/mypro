import type { Sample, AnalysisRun } from '@/types';

export interface BarcodeCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'same_batch' | 'cross_batch';
  matchedBarcode?: string;
  matchedSample?: Sample;
  matchedAnalysisRuns?: AnalysisRun[];
  message: string;
  studentExplanation: string;
}

export function checkBarcodeDuplicate(
  barcode: string,
  existingSamples: Sample[],
  currentBatchId: string = 'BATCH-20260611'
): BarcodeCheckResult {
  const normalizedBarcode = barcode.trim().toUpperCase();

  if (!normalizedBarcode) {
    return {
      isDuplicate: false,
      message: '条码不能为空',
      studentExplanation: '每个样本需要一个唯一的识别编号，就像每个人的身份证号一样。'
    };
  }

  const barcodePattern = /^[A-Z]{2,4}-\d{8}-\d{3}$/;
  if (!barcodePattern.test(normalizedBarcode)) {
    return {
      isDuplicate: false,
      message: '条码格式不正确，应为：XXX-YYYYMMDD-NNN',
      studentExplanation: '条码格式应该像"WBC-20260611-001"这样：\n' +
        '• 前2-4位：细胞类型缩写（如WBC=白细胞）\n' +
        '• 中间8位：日期（YYYYMMDD）\n' +
        '• 最后3位：序号（001,002...）'
    };
  }

  const matchedSamples = existingSamples.filter(s => s.barcode === normalizedBarcode);

  if (matchedSamples.length === 0) {
    return {
      isDuplicate: false,
      message: '条码有效',
      studentExplanation: ''
    };
  }

  const matchedSample = matchedSamples[0];

  return {
    isDuplicate: true,
    duplicateType: 'same_batch',
    matchedBarcode: normalizedBarcode,
    matchedSample,
    message: `条码 ${normalizedBarcode} 已存在于当前批次，请检查或更换条码`,
    studentExplanation: `⚠️ 学习提示：为什么条码不能重复？\n\n` +
      `就像考试时不能有两个同学用同一个准考证号一样，` +
      `如果两个样本用了同一个条码"${normalizedBarcode}"，系统就无法区分它们。\n\n` +
      `这会导致：\n` +
      `1. 数据混淆：不知道哪个结果属于哪个样本\n` +
      `2. 统计错误：同一个样本被重复计算，导致偏差\n` +
      `3. 报告错误：最终报告可能发错给病人\n\n` +
      `✅ 处理建议：检查是否录入错误，或给新样本分配新的条码编号。\n\n` +
      `📋 历史记录对比：\n` +
      `• 已有样本：${matchedSample.cellType}（${matchedSample.patientId}）\n` +
      `• 录入时间：${matchedSample.createdAt.toLocaleString('zh-CN')}\n` +
      `• 操作人：${matchedSample.operator}\n` +
      `• 状态：${matchedSample.status === 'success' ? '顺利通过' :
        matchedSample.status === 'pending' ? '待确认' :
          matchedSample.status === 'bad' ? '坏数据' : '已拦截'}`
  };
}

export function generateExportFileName(
  barcode: string,
  runNumber: number,
  timestamp: Date,
  format: 'pdf' | 'csv' | 'excel' | 'txt' = 'pdf'
): string {
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = timestamp.toTimeString().slice(0, 5).replace(/:/g, '');
  const runStr = `RUN${runNumber}`;
  const formatExt = format === 'excel' ? 'xlsx' : format;

  return `细胞迁移分析_${barcode}_${dateStr}${timeStr}_${runStr}.${formatExt}`;
}

export function generateBarcode(
  cellType: string,
  date: Date = new Date()
): string {
  const typeMap: Record<string, string> = {
    '肺癌细胞': 'WBC',
    '白细胞': 'WBC',
    '红细胞': 'RBC',
    '脐静脉内皮细胞': 'HUV',
    '宫颈癌细胞': 'HEL',
    '成纤维细胞': 'FIB',
    'A549': 'WBC',
    'HUVEC': 'HUV',
    'HeLa': 'HEL'
  };

  let prefix = 'SAM';
  for (const [key, value] of Object.entries(typeMap)) {
    if (cellType.includes(key)) {
      prefix = value;
      break;
    }
  }

  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `${prefix}-${dateStr}-${randomNum}`;
}

export function getDuplicateHistoryComparison(
  newSample: Sample,
  existingSample: Sample,
  existingRuns: AnalysisRun[]
): {
  fields: string[];
  differences: string[];
  recommendations: string[];
} {
  const fields: string[] = [];
  const differences: string[] = [];
  const recommendations: string[] = [];

  if (newSample.patientId !== existingSample.patientId) {
    fields.push('患者ID');
    differences.push(`新样本: ${newSample.patientId} vs 已有: ${existingSample.patientId}`);
    recommendations.push('确认患者信息是否匹配，可能是录入错误');
  }

  if (newSample.cellType !== existingSample.cellType) {
    fields.push('细胞类型');
    differences.push(`新样本: ${newSample.cellType} vs 已有: ${existingSample.cellType}`);
    recommendations.push('不同细胞类型不应使用相同条码');
  }

  if (newSample.operator !== existingSample.operator) {
    fields.push('操作人');
    differences.push(`新样本: ${newSample.operator} vs 已有: ${existingSample.operator}`);
    recommendations.push('确认是否为同一实验的不同操作人');
  }

  if (existingRuns.length > 0) {
    const latestRun = existingRuns[existingRuns.length - 1];
    fields.push('已运行次数');
    differences.push(`该条码已有 ${existingRuns.length} 次分析记录`);
    recommendations.push('如需重新分析，请创建新的运行记录而非使用相同条码');
  }

  return { fields, differences, recommendations };
}
