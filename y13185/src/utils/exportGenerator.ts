import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { CalculationResult, ExperimentRecord, SuspendRecord, OperationLog } from '@/types/experiment';
import { PARAMETER_LABELS, LEVEL_LABELS } from '@/constants/parameters';

const toCn = (date: number) => format(date, 'yyyy-MM-dd HH:mm:ss');
const safeFileName = (date: number, suffix: string) => `风洞烟线实验复算${suffix}_${toCn(date).replace(/[:\s]/g, '-')}`;

export const generateReportText = (
  result: CalculationResult,
  experiment: ExperimentRecord | undefined,
  includeHistory: boolean = true
): string => {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('风洞烟线实验复算报告');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push('【基本信息】');
  lines.push(`报告生成时间: ${toCn(Date.now())}`);
  lines.push(`数据来源文件: ${experiment?.sourceFileName || '未知'}`);
  lines.push(`实验名称: ${experiment?.experimentName || experiment?.mappedData?.experimentName || '未命名'}`);
  lines.push(`复算版本: v${result.version}`);
  lines.push(`复算人: ${result.createdBy}`);
  lines.push(`复算时间: ${toCn(result.createdAt)}`);
  lines.push(`参数档位: ${LEVEL_LABELS[result.parameters.parameterLevel] || result.parameters.parameterLevel}`);
  lines.push(`复算状态: ${result.status === 'normal' ? '正常' : result.status === 'suspended' ? '已挂起' : result.status === 'confirmed' ? '已确认' : result.status === 'rejected' ? '已拒绝' : '待计算'}`);
  lines.push('');

  lines.push('【计算参数】');
  Object.entries(result.parameters).forEach(([key, value]) => {
    if (key !== 'parameterLevel') {
      const label = PARAMETER_LABELS[key as keyof typeof PARAMETER_LABELS] || key;
      lines.push(`  ${label}: ${value}`);
    }
  });
  lines.push('');

  lines.push('【计算公式】');
  lines.push(`  公式: ${result.formula.expression}`);
  lines.push(`  单位: ${result.formula.unit}`);
  lines.push(`  说明: ${result.formula.description}`);
  lines.push('');

  lines.push('【变量明细】');
  Object.entries(result.formula.variables).forEach(([symbol, info]) => {
    lines.push(`  ${symbol} = ${info.value} ${info.unit} (${info.description})`);
  });
  lines.push('');

  lines.push('【复算结果】');
  lines.push(`  升力系数 (C_L): ${result.result.liftCoefficient}`);
  lines.push(`  阻力系数 (C_D): ${result.result.dragCoefficient}`);
  lines.push(`  雷诺数 (Re): ${result.result.reynoldsNumber}`);
  lines.push(`  有效流速: ${result.result.flowVelocity} m/s`);
  lines.push('');

  lines.push('【边界样本敏感性分析】');
  if (result.boundaryAnalysis) {
    lines.push(`  ${result.boundaryAnalysis.sensitivityReport || '无'}`);
    lines.push('');
    if (result.boundaryAnalysis.impactFactors && result.boundaryAnalysis.impactFactors.length > 0) {
      lines.push('  影响因子分析:');
      result.boundaryAnalysis.impactFactors.forEach(factor => {
        const impactText = factor.impact === 'high' ? '高' : factor.impact === 'medium' ? '中' : '低';
        lines.push(`    ${factor.factor}: 影响程度${impactText}, 变化范围 ${factor.change}`);
      });
    }
    if (result.boundaryAnalysis.normalValue !== undefined) {
      lines.push('');
      lines.push('  边界值分析:');
      if (result.boundaryAnalysis.minValue !== undefined) {
        lines.push(`    最小值: ${result.boundaryAnalysis.minValue.toFixed(4)} (变化: ${result.boundaryAnalysis.minImpact ? ((result.boundaryAnalysis.minImpact - 1) * 100).toFixed(1) : '-'}%)`);
      }
      lines.push(`    基准值: ${result.boundaryAnalysis.normalValue.toFixed(4)}`);
      if (result.boundaryAnalysis.maxValue !== undefined) {
        lines.push(`    最大值: ${result.boundaryAnalysis.maxValue.toFixed(4)} (变化: ${result.boundaryAnalysis.maxImpact ? ((result.boundaryAnalysis.maxImpact - 1) * 100).toFixed(1) : '-'}%)`);
      }
    }
  } else {
    lines.push('  无');
  }
  lines.push('');

  lines.push('【标注信息】');
  lines.push(`  场景标注: ${result.annotations.sceneNote || '无'}`);
  lines.push(`  侧边说明: ${result.annotations.sideNote || '无'}`);
  lines.push(`  截图说明: ${result.annotations.screenshotNote || '无'}`);
  lines.push(`  标注同步状态: ${result.annotations.syncMode === 'synchronized' ? '已同步' : '独立'}`);
  lines.push('');

  if (experiment?.maintenanceRemark) {
    lines.push('【维修备注（字段来源追踪）】');
    lines.push(`  ${experiment.mappedData.maintenanceRemark || experiment.rawData.maintenanceRemark || experiment.maintenanceRemark || '无'}`);
    lines.push('');
  }

  if (experiment?.fieldMappings && experiment.fieldMappings.length > 0) {
    lines.push('【字段来源与处理状态】');
    experiment.fieldMappings.forEach(m => {
      const statusText = m.processStatus === 'processed' ? '已映射' : m.processStatus === 'pending' ? '待人工确认' : '跳过';
      const sourceText = m.fieldSource === 'manual-mapped' ? '人工' : m.matchConfidence > 0.8 ? '自动(高置信)' : '自动(低置信)';
      lines.push(`  ${m.sourceFieldName} → ${m.targetFieldName || '未映射'}  [${statusText}/${sourceText}]`);
    });
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('报告结束');
  lines.push('='.repeat(60));

  return lines.join('\n');
};

export const generateBatchReportText = (
  results: CalculationResult[],
  experimentsMap: Map<string, ExperimentRecord>,
  scopeLabel: string
): string => {
  const header: string[] = [];
  header.push('#'.repeat(70));
  header.push(`风洞烟线实验复算报告集 — ${scopeLabel}`);
  header.push(`包含报告份数: ${results.length} 份`);
  header.push(`生成时间: ${toCn(Date.now())}`);
  header.push('#'.repeat(70));
  header.push('');

  const sections = results.map((r, idx) => {
    const exp = experimentsMap.get(r.recordId) || experimentsMap.get(r.experimentRecordId || '');
    return [
      '',
      `--- 第 ${idx + 1} / ${results.length} 份报告 ---`,
      generateReportText(r, exp),
    ].join('\n');
  });

  return header.join('\n') + sections.join('\n\n');
};

const renderTextToCanvas = async (text: string): Promise<HTMLCanvasElement> => {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: fixed; left: -99999px; top: 0;
    width: 794px; padding: 40px 48px;
    background: #fff; color: #111;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
    font-size: 13px; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
  `;
  wrap.textContent = text;
  document.body.appendChild(wrap);
  try {
    const canvas = await html2canvas(wrap, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    return canvas;
  } finally {
    document.body.removeChild(wrap);
  }
};

export const exportToPdf = async (
  result: CalculationResult,
  experiment: ExperimentRecord | undefined
): Promise<void> => {
  const canvas = await renderTextToCanvas(generateReportText(result, experiment));
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - 20;

  while (heightLeft >= 0) {
    position = 10 - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20;
  }

  pdf.save(`${safeFileName(result.createdAt, '报告')}.pdf`);
};

export const exportBatchToPdf = async (
  results: CalculationResult[],
  experiments: ExperimentRecord[],
  scopeLabel: string
): Promise<void> => {
  const experimentsMap = new Map(experiments.map(e => [e.id, e] as [string, ExperimentRecord]));
  const text = generateBatchReportText(results, experimentsMap, scopeLabel);
  const canvas = await renderTextToCanvas(text);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - 20;

  while (heightLeft >= 0) {
    position = 10 - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20;
  }

  pdf.save(`${safeFileName(Date.now(), '报告集')}.pdf`);
};

export const exportToExcel = (
  results: CalculationResult[],
  experiments: ExperimentRecord[],
  scopeLabel: string = '全量'
): void => {
  const experimentsMap = new Map(experiments.map(e => [e.id, e] as [string, ExperimentRecord]));
  const wb = XLSX.utils.book_new();

  const summaryData = results.map(result => {
    const exp = experimentsMap.get(result.recordId) || experimentsMap.get(result.experimentRecordId || '');
    return {
      '报告编号': result.id,
      '来源文件': exp?.sourceFileName || '未知',
      '实验名称': exp?.experimentName || '未命名',
      '复算版本': `v${result.version}`,
      '参数档位': LEVEL_LABELS[result.parameters.parameterLevel] || result.parameters.parameterLevel,
      '升力系数': result.result.liftCoefficient,
      '阻力系数': result.result.dragCoefficient,
      '雷诺数': result.result.reynoldsNumber,
      '有效流速(m/s)': result.result.flowVelocity,
      '场景标注': result.annotations.sceneNote || '',
      '侧边说明': result.annotations.sideNote || '',
      '截图说明': result.annotations.screenshotNote || '',
      '维修备注': exp?.maintenanceRemark || exp?.mappedData?.maintenanceRemark || '',
      '复算人': result.createdBy,
      '复算时间': toCn(result.createdAt),
      '状态': result.status === 'normal' ? '正常' : result.status === 'suspended' ? '已挂起' : result.status === 'confirmed' ? '已确认' : result.status === 'rejected' ? '已拒绝' : '待计算',
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  ws1['!cols'] = [
    { wch: 28 }, { wch: 24 }, { wch: 18 }, { wch: 8 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 20 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '复算结果汇总');

  const boundaryData = results.flatMap(result =>
    result.boundaryAnalysis?.samples?.map(sample => ({
      '报告编号': result.id,
      '样本名称': sample.name,
      '参数': PARAMETER_LABELS[sample.parameter as keyof typeof PARAMETER_LABELS] || sample.parameter,
      '参数值': sample.value,
      '结果值': sample.result,
      '与基准偏差(%)': sample.deviationFromBase,
    })) || []
  );

  const ws2 = XLSX.utils.json_to_sheet(boundaryData.length > 0 ? boundaryData : [{
    '报告编号': '无', '样本名称': '无', '参数': '无', '参数值': 0, '结果值': 0, '与基准偏差(%)': 0,
  }]);
  XLSX.utils.book_append_sheet(wb, ws2, '边界样本分析');

  const parametersData = results.map(result => ({
    '报告编号': result.id,
    '空气密度(kg/m³)': result.parameters.airDensity,
    '风速(m/s)': result.parameters.windSpeed,
    '攻角(°)': result.parameters.angleOfAttack,
    '烟线直径(mm)': result.parameters.smokeLineDiameter,
    '湍流强度(%)': result.parameters.turbulenceIntensity,
    '计算公式': result.formula.expression,
    '公式单位': result.formula.unit,
    '公式说明': result.formula.description,
    '敏感性分析': result.boundaryAnalysis?.sensitivityReport || '无',
  }));

  const ws3 = XLSX.utils.json_to_sheet(parametersData);
  XLSX.utils.book_append_sheet(wb, ws3, '参数与公式');

  const fieldSourceData = experiments.length > 0 ? experiments.flatMap(exp =>
    (exp.fieldMappings || []).map(m => ({
      '实验记录ID': exp.id,
      '实验名称': exp.experimentName || '未命名',
      '来源字段': m.sourceFieldName,
      '映射字段': m.targetFieldName || '',
      '处理状态': m.processStatus,
      '映射来源': m.fieldSource,
      '匹配置信度': (m.matchConfidence * 100).toFixed(0) + '%',
      '导入时间': toCn(exp.importedAt || exp.importTimestamp),
    }))
  ) : [];

  const ws4 = XLSX.utils.json_to_sheet(fieldSourceData.length > 0 ? fieldSourceData : [{
    '实验记录ID': '无', '实验名称': '无', '来源字段': '无', '映射字段': '无', '处理状态': '无', '映射来源': '无', '匹配置信度': '无', '导入时间': '无',
  }]);
  XLSX.utils.book_append_sheet(wb, ws4, '字段来源追踪');

  const filename = `风洞烟线实验复算数据_${scopeLabel}_${toCn(Date.now()).replace(/[:\s]/g, '-')}.xlsx`;
  XLSX.writeFile(wb, filename);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
};

export const buildExportScopeLabel = (
  scope: 'selected' | 'all' | 'date-range',
  start?: number,
  end?: number
): string => {
  if (scope === 'selected') return '当前选中';
  if (scope === 'all') return '全部记录';
  if (scope === 'date-range' && start && end) {
    return `${format(start, 'yyyyMMdd')}-${format(end, 'yyyyMMdd')}`;
  }
  return '日期范围';
};
