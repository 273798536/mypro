import { saveAs } from 'file-saver';
import type {
  FittingSession,
  DataSource,
  FittingParameter,
  Alert,
  CorrectionTrace,
  RawDataRecord,
} from '@/store/fittingStore';

export interface FittingReport {
  version: string;
  generatedAt: number;
  session: FittingSession;
  rawData: RawDataRecord[];
  dataSources: DataSource[];
  initialParams: Record<string, number>;
  parameterBounds: Record<string, { min: number; max: number }>;
  fittedParams: FittingParameter[];
  residuals: number[];
  alerts: Alert[];
  corrections: CorrectionTrace[];
  dataQuality: {
    sampleCount: number;
    samplingIntervalMs: number;
    temperatureRange: { min: number; max: number };
    gapCount: number;
    driftCount: number;
  };
  fitQuality: {
    rSquared: number;
    rmse: number;
    iterations: number;
  };
}

export const exportToJSON = (
  session: FittingSession,
  rawData: RawDataRecord[],
  dataSources: DataSource[],
  initialParams: Record<string, number>,
  parameterBounds: Record<string, { min: number; max: number }>,
  fittedParams: FittingParameter[],
  residuals: number[],
  alerts: Alert[],
  corrections: CorrectionTrace[]
): void => {
  const report: FittingReport = {
    version: '1.0.0',
    generatedAt: Date.now(),
    session,
    rawData,
    dataSources,
    initialParams,
    parameterBounds,
    fittedParams,
    residuals,
    alerts,
    corrections,
    dataQuality: {
      sampleCount: session.sampleCount,
      samplingIntervalMs: session.samplingIntervalMs,
      temperatureRange: {
        min: session.temperatureMin,
        max: session.temperatureMax,
      },
      gapCount: alerts.filter(a => a.category === 'sampling_gap').length,
      driftCount: alerts.filter(a => a.category === 'temperature_drift').length,
    },
    fitQuality: {
      rSquared: session.rSquared,
      rmse: session.rmse,
      iterations: fittedParams.length > 0 ? fittedParams[0].iteration : 0,
    },
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  const fileName = `battery-fitting-report-${session.id.slice(0, 8)}-${new Date(session.createdAt).toISOString().slice(0, 10)}.json`;
  saveAs(blob, fileName);
};

export const generateReportContent = (
  session: FittingSession,
  rawData: RawDataRecord[],
  initialParams: Record<string, number>,
  fittedParams: FittingParameter[],
  alerts: Alert[],
  corrections: CorrectionTrace[],
  dataSources: DataSource[]
): string => {
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatValue = (value: number, unit: string = ''): string => {
    if (Math.abs(value) >= 1e-3 && Math.abs(value) < 1e3) {
      return `${value.toFixed(6)}${unit}`;
    }
    return `${value.toExponential(4)}${unit}`;
  };

  const lines: string[] = [];

  lines.push('='.repeat(70));
  lines.push('电池RC等效拟合报告');
  lines.push('='.repeat(70));
  lines.push('');

  lines.push('【基本信息】');
  lines.push(`- 会话ID: ${session.id}`);
  lines.push(`- 创建时间: ${formatDate(session.createdAt)}`);
  lines.push(`- 更新时间: ${formatDate(session.updatedAt)}`);
  lines.push(`- 状态: ${session.status === 'normal' ? '正常' : session.status === 'warning' ? '警告' : '严重'}`);
  lines.push('');

  lines.push('【数据来源】');
  dataSources.forEach((ds, idx) => {
    lines.push(`${idx + 1}. ${ds.sourceLabel}`);
    if (ds.fileName) {
      lines.push(`   文件名: ${ds.fileName}`);
    }
    lines.push(`   类型: ${ds.type} | 时间: ${formatDate(ds.timestamp)}`);
    lines.push(`   修正记录: ${ds.correctionLog}`);
  });
  lines.push('');

  lines.push('【数据质量】');
  lines.push(`- 采样点数: ${session.sampleCount}`);
  lines.push(`- 采样间隔: ${session.samplingIntervalMs}ms`);
  lines.push(`- 温度范围: ${formatValue(session.temperatureMin, '°C')} ~ ${formatValue(session.temperatureMax, '°C')}`);
  lines.push(`- 数据时长: ${rawData.length > 0 ? formatValue(rawData[rawData.length - 1].time - rawData[0].time, 's') : 'N/A'}`);
  lines.push('');

  if (alerts.length > 0) {
    lines.push('【数据告警】');
    const groupedAlerts = alerts.reduce((acc, alert) => {
      if (!acc[alert.category]) acc[alert.category] = [];
      acc[alert.category].push(alert);
      return acc;
    }, {} as Record<string, Alert[]>);

    Object.entries(groupedAlerts).forEach(([category, categoryAlerts]) => {
      const categoryName = category === 'sampling_gap' ? '采样缺口' :
        category === 'temperature_drift' ? '温度漂移' : '参数发散';
      lines.push(`${categoryName} (${categoryAlerts.length}项):`);
      categoryAlerts.slice(0, 5).forEach(alert => {
        const severity = alert.severity === 'warning' ? '警告' :
          alert.severity === 'severe' ? '严重' : '致命';
        lines.push(`  [${severity}] ${alert.message}`);
      });
      if (categoryAlerts.length > 5) {
        lines.push(`  ... 另有${categoryAlerts.length - 5}项告警`);
      }
    });
    lines.push('');
  }

  if (corrections.length > 0) {
    lines.push('【修正记录】');
    corrections.slice(0, 10).forEach((corr, idx) => {
      lines.push(`${idx + 1}. ${corr.field}: ${corr.beforeValue} → ${corr.afterValue}`);
      lines.push(`   原因: ${corr.reason}`);
      lines.push(`   时间: ${formatDate(corr.timestamp)}`);
    });
    if (corrections.length > 10) {
      lines.push(`... 另有${corrections.length - 10}项修正记录`);
    }
    lines.push('');
  }

  lines.push('【初始参数】');
  Object.entries(initialParams).forEach(([name, value]) => {
    const unit = name === 'R0' || name === 'R1' ? 'Ω' :
      name === 'C1' ? 'F' : name === 'tau1' ? 's' : '';
    lines.push(`- ${name}: ${formatValue(value, unit)}`);
  });
  lines.push('');

  if (fittedParams.length > 0) {
    lines.push('【拟合结果】');
    lines.push(`- R² (决定系数): ${session.rSquared.toFixed(6)}`);
    lines.push(`- RMSE (均方根误差): ${formatValue(session.rmse, 'V')}`);
    lines.push(`- 迭代次数: ${fittedParams[0].iteration}`);
    lines.push('');

    lines.push('【拟合参数】');
    lines.push('| 参数 | 拟合值 | 标准误差 | 边界范围 | 状态 |');
    lines.push('|------|--------|----------|----------|------|');
    fittedParams.forEach(param => {
      const unit = param.name === 'R0' || param.name === 'R1' ? 'Ω' :
        param.name === 'C1' ? 'F' : param.name === 'tau1' ? 's' : '';
      const status = param.isWithinBound ? '✓ 正常' : '✗ 越界';
      lines.push(
        `| ${param.name} | ${formatValue(param.value, unit)} | ${formatValue(param.stdError, unit)} | ` +
        `[${formatValue(param.lowerBound, unit)}, ${formatValue(param.upperBound, unit)}] | ${status} |`
      );
    });
    lines.push('');
  }

  lines.push('【电路模型】');
  lines.push('一阶RC等效电路模型:');
  lines.push('  V(t) = OCV - I·R0 - I·R1·(1 - e^(-t/τ1))');
  lines.push('  其中 τ1 = R1·C1');
  lines.push('');

  lines.push('【参数说明】');
  lines.push('- R0: 欧姆内阻 (Ω)');
  lines.push('- R1: 极化电阻 (Ω)');
  lines.push('- C1: 极化电容 (F)');
  lines.push('- τ1: 时间常数 (s)');
  lines.push('');

  lines.push('='.repeat(70));
  lines.push(`报告生成时间: ${formatDate(Date.now())}`);
  lines.push('='.repeat(70));

  return lines.join('\n');
};
