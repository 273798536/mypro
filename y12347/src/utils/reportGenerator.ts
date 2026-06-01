import { FitResult, FitResultDiff, TimeUnit } from '../types';
import { formatNumber, formatTimeWithUnit, getUnitShortLabel } from './unitConversion';

export function generateReport(fitResult: FitResult): string {
  const { material, dataPoints, background, halfLife, halfLifeUnit, 
          decayConstant, initialActivity, rSquared, anomalies } = fitResult;

  const reportDate = new Date(fitResult.timestamp).toLocaleString('zh-CN');
  
  let report = '';
  
  report += '═══════════════════════════════════════════════════════════\n';
  report += '           放射衰变半衰期拟合报告\n';
  report += '═══════════════════════════════════════════════════════════\n\n';
  
  report += '【基本信息】\n';
  report += '───────────────────────────────────────────────────────────\n';
  report += `材料名称：${material.name}\n`;
  report += `生成时间：${reportDate}\n`;
  report += `数据点数：${dataPoints.length}\n\n`;

  report += '【实验参数】\n';
  report += '───────────────────────────────────────────────────────────\n';
  report += `背景噪声值：${background.value} 计数${background.isDeducted ? '（已扣除）' : '（未扣除）'}\n`;
  if (background.measuredTime) {
    report += `背景测量时间：${formatTimeWithUnit(background.measuredTime, halfLifeUnit)}\n`;
  }
  report += `时间单位：${getUnitShortLabel(halfLifeUnit)}\n\n`;

  report += '【原始数据】\n';
  report += '───────────────────────────────────────────────────────────\n';
  report += '序号\t时间\t计数\t校正后计数\n';
  report += '───────────────────────────────────────────────────────────\n';
  dataPoints.forEach((point, index) => {
    const mark = point.isAbnormal ? '*' : ' ';
    report += `${mark}${index + 1}\t${formatNumber(point.time, 2)}\t${point.count}\t${formatNumber(point.correctedCount ?? point.count, 2)}\n`;
  });
  report += '\n';

  report += '【拟合结果】\n';
  report += '───────────────────────────────────────────────────────────\n';
  report += `半衰期 (t₁/₂)：${formatTimeWithUnit(halfLife, halfLifeUnit)}\n`;
  report += `衰变常数 (λ)：${formatNumber(decayConstant, 6)} s⁻¹\n`;
  report += `初始活度 (N₀)：${formatNumber(initialActivity, 4)} 计数\n`;
  report += `拟合优度 (R²)：${formatNumber(rSquared, 6)}\n\n`;

  report += '【拟合公式】\n';
  report += '───────────────────────────────────────────────────────────\n';
  report += `N(t) = ${formatNumber(initialActivity, 4)} × e^(-${formatNumber(decayConstant, 6)} × t)\n\n`;

  if (anomalies.length > 0) {
    report += '【异常说明】\n';
    report += '───────────────────────────────────────────────────────────\n';
    anomalies.forEach((anomaly, index) => {
      const severity = anomaly.severity === 'error' ? '错误' : '警告';
      report += `${index + 1}. [${severity}] ${anomaly.message}\n`;
      report += `   建议：${anomaly.suggestion}\n`;
    });
    report += '\n';
  }

  if (material.halfLifeKnown) {
    const knownValue = material.halfLifeKnown;
    const deviation = Math.abs((halfLife - knownValue) / knownValue * 100);
    report += '【与已知值对比】\n';
    report += '───────────────────────────────────────────────────────────\n';
    report += `已知半衰期：${formatTimeWithUnit(knownValue, material.unit)}\n`;
    report += `拟合半衰期：${formatTimeWithUnit(halfLife, halfLifeUnit)}\n`;
    report += `相对偏差：${formatNumber(deviation, 2)}%\n\n`;
  }

  report += '═══════════════════════════════════════════════════════════\n';
  report += '报告生成完毕。如有异常，请检查原始数据后重新拟合。\n';
  report += '═══════════════════════════════════════════════════════════\n';

  return report;
}

export function compareFitResults(
  oldResult: FitResult,
  newResult: FitResult
): FitResultDiff[] {
  const diffs: FitResultDiff[] = [];

  const fields: { key: keyof FitResult; label: string; isTime?: boolean; unit?: TimeUnit }[] = [
    { key: 'halfLife', label: '半衰期', isTime: true, unit: newResult.halfLifeUnit },
    { key: 'decayConstant', label: '衰变常数' },
    { key: 'initialActivity', label: '初始活度' },
    { key: 'rSquared', label: '拟合优度 R²' },
  ];

  fields.forEach(({ key, label, isTime, unit }) => {
    const oldVal = oldResult[key] as number;
    const newVal = newResult[key] as number;
    
    if (oldVal !== newVal) {
      const difference = newVal - oldVal;
      const percentage = oldVal !== 0 ? (difference / Math.abs(oldVal)) * 100 : undefined;

      let oldDisplay = formatNumber(oldVal, 6);
      let newDisplay = formatNumber(newVal, 6);
      let diffDisplay = formatNumber(difference, 6);

      if (isTime && unit) {
        const unitLabel = getUnitShortLabel(unit);
        oldDisplay += ` ${unitLabel}`;
        newDisplay += ` ${unitLabel}`;
        diffDisplay += ` ${unitLabel}`;
      }

      diffs.push({
        field: label,
        oldValue: oldDisplay,
        newValue: newDisplay,
        difference: diffDisplay,
        percentage
      });
    }
  });

  if (oldResult.background.value !== newResult.background.value ||
      oldResult.background.isDeducted !== newResult.background.isDeducted) {
    diffs.push({
      field: '背景噪声',
      oldValue: `${oldResult.background.value}${oldResult.background.isDeducted ? '（已扣）' : '（未扣）'}`,
      newValue: `${newResult.background.value}${newResult.background.isDeducted ? '（已扣）' : '（未扣）'}`,
      difference: newResult.background.value - oldResult.background.value
    });
  }

  if (oldResult.dataPoints.length !== newResult.dataPoints.length) {
    diffs.push({
      field: '数据点数量',
      oldValue: oldResult.dataPoints.length,
      newValue: newResult.dataPoints.length,
      difference: newResult.dataPoints.length - oldResult.dataPoints.length
    });
  }

  return diffs;
}

export function generateComparisonReport(
  oldResult: FitResult,
  newResult: FitResult,
  diffs: FitResultDiff[]
): string {
  const oldDate = new Date(oldResult.timestamp).toLocaleString('zh-CN');
  const newDate = new Date(newResult.timestamp).toLocaleString('zh-CN');

  let report = '';
  
  report += '═══════════════════════════════════════════════════════════\n';
  report += '           拟合结果对比报告\n';
  report += '═══════════════════════════════════════════════════════════\n\n';
  
  report += `材料：${newResult.material.name}\n\n`;
  
  report += `【拟合1】 ${oldDate}\n`;
  report += `【拟合2】 ${newDate}\n\n`;

  report += '【参数对比】\n';
  report += '───────────────────────────────────────────────────────────\n';
  report += '参数\t\t拟合1\t\t拟合2\t\t差异\t\t变化率\n';
  report += '───────────────────────────────────────────────────────────\n';

  diffs.forEach(diff => {
    const percentage = diff.percentage !== undefined 
      ? `${formatNumber(diff.percentage, 2)}%` 
      : '-';
    const changeSign = diff.percentage !== undefined && diff.percentage > 0 ? '+' : '';
    report += `${diff.field}\t${diff.oldValue}\t${diff.newValue}\t${changeSign}${diff.difference}\t${changeSign}${percentage}\n`;
  });

  if (diffs.length === 0) {
    report += '两次拟合结果完全一致，无差异。\n';
  }

  report += '\n═══════════════════════════════════════════════════════════\n';

  return report;
}
