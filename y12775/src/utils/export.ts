import type { CalculationResult, Experiment, Reagent, Batch } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportSummary {
  sampleNo: string;
  batchNo: string;
  reagentName: string;
  waterContent: number;
  unit: string;
  status: string;
  statusText: string;
  formula: string;
  formulaDetail: string;
  applicableRange: string;
  blankFallback: boolean;
  blankFallbackValue?: number;
  safetyTip: string;
  retestAdvice?: string;
  failureReason?: string;
  sourceTrace: string;
  calculatedAt: string;
  parallelDeviation?: number;
}

export function buildExportSummary(
  result: CalculationResult,
  experiment?: Experiment,
  reagent?: Reagent,
  batch?: Batch
): ExportSummary {
  const statusText: Record<string, string> = {
    PASS: '可直接使用',
    REVIEW: '需管理员复核',
    FAIL: '计算失败/数据异常',
  };

  return {
    sampleNo: experiment?.sampleNo || '未指定',
    batchNo: batch?.batchNo || '未指定',
    reagentName: reagent?.name || '未指定',
    waterContent: result.waterContent,
    unit: result.unit,
    status: result.status,
    statusText: statusText[result.status] || result.status,
    formula: result.formula,
    formulaDetail: result.formulaDetail,
    applicableRange: result.applicableRange,
    blankFallback: result.blankFallback,
    blankFallbackValue: result.blankFallbackValue,
    safetyTip: result.safetyTip,
    retestAdvice: result.retestAdvice,
    failureReason: result.failureReason,
    sourceTrace: result.sourceTrace,
    calculatedAt: new Date(result.calculatedAt).toLocaleString('zh-CN'),
    parallelDeviation: result.parallelDeviation,
  };
}

export function exportToCSV(summaries: ExportSummary[]): string {
  const headers = [
    '样品编号',
    '批次号',
    '试剂名称',
    '水含量(%)',
    '结果状态',
    '使用公式',
    '适用范围',
    '空白对照降级',
    '安全提示',
    '复测建议',
    '失败原因',
    '来源追溯',
    '计算时间',
  ];

  const rows = summaries.map((s) => [
    s.sampleNo,
    s.batchNo,
    s.reagentName,
    s.waterContent.toFixed(4),
    s.statusText,
    s.formula,
    s.applicableRange,
    s.blankFallback ? (s.blankFallbackValue ? `是(${s.blankFallbackValue})` : '是') : '否',
    s.safetyTip,
    s.retestAdvice || '',
    s.failureReason || '',
    s.sourceTrace,
    s.calculatedAt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(',')
    ),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`未找到导出元素：${elementId}`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#F8FAFC',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}
