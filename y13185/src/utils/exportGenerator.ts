import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { CalculationResult, ExperimentRecord } from '@/types/experiment';
import { PARAMETER_LABELS, LEVEL_LABELS } from '@/constants/parameters';

const toCn = (date: number) => format(date, 'yyyy-MM-dd HH:mm:ss');

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
  lines.push(`复算版本: v${result.version}`);
  lines.push(`复算人: ${result.createdBy}`);
  lines.push(`复算时间: ${toCn(result.createdAt)}`);
  lines.push(`参数档位: ${LEVEL_LABELS[result.parameters.parameterLevel] || result.parameters.parameterLevel}`);
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
    lines.push('【维修备注】');
    lines.push(`  ${experiment.mappedData.maintenanceRemark || experiment.rawData.maintenanceRemark || '无'}`);
    lines.push('');
  }
  
  lines.push('='.repeat(60));
  lines.push('报告结束');
  lines.push('='.repeat(60));
  
  return lines.join('\n');
};

export const exportToPdf = async (
  result: CalculationResult,
  experiment: ExperimentRecord | undefined
): Promise<void> => {
  const doc = new jsPDF();
  const reportText = generateReportText(result, experiment);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const lines = reportText.split('\n');
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 7;
  let y = 20;
  
  lines.forEach((line) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 14, y);
    y += lineHeight;
  });
  
  doc.save(`风洞烟线实验复算报告_${toCn(result.createdAt).replace(/[:\s]/g, '-')}.pdf`);
};

export const exportToExcel = (
  results: CalculationResult[],
  experiments: ExperimentRecord[]
): void => {
  const wb = XLSX.utils.book_new();
  
  const summaryData = results.map(result => {
    const exp = experiments.find(e => e.id === result.recordId);
    return {
      '报告编号': result.id,
      '来源文件': exp?.sourceFileName || '未知',
      '复算版本': `v${result.version}`,
      '参数档位': LEVEL_LABELS[result.parameters.parameterLevel] || result.parameters.parameterLevel,
      '升力系数': result.result.liftCoefficient,
      '阻力系数': result.result.dragCoefficient,
      '雷诺数': result.result.reynoldsNumber,
      '有效流速(m/s)': result.result.flowVelocity,
      '场景标注': result.annotations.sceneNote,
      '侧边说明': result.annotations.sideNote,
      '截图说明': result.annotations.screenshotNote,
      '复算人': result.createdBy,
      '复算时间': toCn(result.createdAt),
      '状态': result.status === 'normal' ? '正常' : result.status === 'suspended' ? '已挂起' : result.status === 'confirmed' ? '已确认' : '已拒绝',
    };
  });
  
  const ws1 = XLSX.utils.json_to_sheet(summaryData);
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
  
  const ws2 = XLSX.utils.json_to_sheet(boundaryData);
  XLSX.utils.book_append_sheet(wb, ws2, '边界样本分析');
  
  const parametersData = results.map(result => ({
    '报告编号': result.id,
    '空气密度(kg/m³)': result.parameters.airDensity,
    '风速(m/s)': result.parameters.windSpeed,
    '攻角(°)': result.parameters.angleOfAttack,
    '烟线直径(mm)': result.parameters.smokeLineDiameter,
    '湍流强度(%)': result.parameters.turbulenceIntensity,
    '计算公式': result.formula.expression,
    '公式说明': result.formula.description,
    '敏感性分析': result.boundaryAnalysis?.sensitivityReport || '无',
  }));
  
  const ws3 = XLSX.utils.json_to_sheet(parametersData);
  XLSX.utils.book_append_sheet(wb, ws3, '参数与公式');
  
  XLSX.writeFile(wb, `风洞烟线实验复算数据_${toCn(Date.now()).replace(/[:\s]/g, '-')}.xlsx`);
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
