import type { BuoyData, ErosionReport } from '../types';
import { detectDrift, DRIFT_THRESHOLD_KM } from './erosionCalculator';

export { DRIFT_THRESHOLD_KM };

export interface DriftInterception {
  buoyId: string;
  timestamp: string;
  driftDistance: number;
  expectedLocation: { lat: number; lng: number };
  actualLocation: { lat: number; lng: number };
  reason: string;
  action: string;
  severity: 'warning' | 'critical';
  excludedFromCalculation: boolean;
}

export function interceptDriftData(buoys: BuoyData[]): {
  validBuoys: BuoyData[];
  interceptedBuoys: DriftInterception[];
  summary: {
    total: number;
    valid: number;
    intercepted: number;
    interceptionRate: number;
  };
} {
  const validBuoys: BuoyData[] = [];
  const interceptedBuoys: DriftInterception[] = [];

  buoys.forEach(buoy => {
    const drift = detectDrift(buoy);
    
    if (drift.detected) {
      const isCritical = buoy.driftDistance > DRIFT_THRESHOLD_KM * 2;
      const action = isCritical 
        ? '完全排除本次计算，数据标记为不可用' 
        : '数据降权使用，需人工复核后确认';
      
      interceptedBuoys.push({
        buoyId: buoy.buoyId,
        timestamp: buoy.timestamp,
        driftDistance: buoy.driftDistance,
        expectedLocation: buoy.expectedLocation,
        actualLocation: buoy.location,
        reason: drift.reason || '未知原因',
        action,
        severity: isCritical ? 'critical' : 'warning',
        excludedFromCalculation: isCritical,
      });

      if (!isCritical) {
        validBuoys.push({ ...buoy, dataQuality: 'warning' });
      }
    } else {
      validBuoys.push(buoy);
    }
  });

  return {
    validBuoys,
    interceptedBuoys,
    summary: {
      total: buoys.length,
      valid: validBuoys.length,
      intercepted: interceptedBuoys.length,
      interceptionRate: buoys.length > 0 ? interceptedBuoys.length / buoys.length : 0,
    },
  };
}

export function generateDriftInterceptionReport(
  interceptedBuoys: DriftInterception[]
): {
  totalIntercepted: number;
  criticalCount: number;
  warningCount: number;
  byBuoyId: Record<string, DriftInterception[]>;
  commonReasons: Array<{ reason: string; count: number }>;
  explanation: string;
} {
  const criticalCount = interceptedBuoys.filter(b => b.severity === 'critical').length;
  const warningCount = interceptedBuoys.filter(b => b.severity === 'warning').length;

  const byBuoyId: Record<string, DriftInterception[]> = {};
  interceptedBuoys.forEach(b => {
    if (!byBuoyId[b.buoyId]) {
      byBuoyId[b.buoyId] = [];
    }
    byBuoyId[b.buoyId].push(b);
  });

  const reasonCounts: Record<string, number> = {};
  interceptedBuoys.forEach(b => {
    const reasonKey = b.reason.split('，')[0];
    reasonCounts[reasonKey] = (reasonCounts[reasonKey] || 0) + 1;
  });

  const commonReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  let explanation = '轨迹漂移拦截机制说明：\n\n';
  explanation += `1. 漂移阈值：${DRIFT_THRESHOLD_KM}km\n`;
  explanation += `2. 当浮标实际位置与预期位置距离超过${DRIFT_THRESHOLD_KM}km时，触发拦截\n`;
  explanation += '3. 漂移距离在阈值2倍以内：数据降权使用，需人工复核\n';
  explanation += '4. 漂移距离超过阈值2倍：数据完全排除，标记为不可用\n';
  explanation += '5. 所有被拦截数据均记录在报告中，确保可追溯';

  return {
    totalIntercepted: interceptedBuoys.length,
    criticalCount,
    warningCount,
    byBuoyId,
    commonReasons,
    explanation,
  };
}

export interface ReportExportOptions {
  includeCalculationDetails: boolean;
  includeFormula: boolean;
  highlightUnusable: boolean;
  fleetPerspective: boolean;
}

export function generateExportReport(
  report: ErosionReport,
  options: ReportExportOptions
): string {
  let content = '';

  content += '========================================\n';
  content += '       海岸侵蚀剖面监测报告\n';
  content += '========================================\n\n';
  
  content += `报告编号：${report.reportId}\n`;
  content += `报告日期：${report.reportDate}\n`;
  content += `监测周期：${report.reportPeriod.start} 至 ${report.reportPeriod.end}\n`;
  content += `监测断面：${report.sectionName}\n\n`;

  if (options.fleetPerspective) {
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    content += '  ⚠️  船队关注：不可用记录汇总\n';
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    report.unavailableRecords.forEach(category => {
      content += `【${category.type}】 共${category.count}条  原因：${category.reason}\n`;
      category.records.forEach(rec => {
        content += `  • ${rec.time} - ${rec.description}\n`;
      });
      content += '\n';
    });

    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    content += '  📍 轨迹漂移拦截记录\n';
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    content += `本月共拦截漂移数据 ${report.driftInterceptions.total} 条\n\n`;
    
    report.driftInterceptions.interceptions.forEach((interception, idx) => {
      content += `${idx + 1}. ${interception.buoyId}\n`;
      content += `   时间：${interception.timestamp}\n`;
      content += `   漂移距离：${interception.driftDistance}km\n`;
      content += `   原因：${interception.reason}\n`;
      content += `   处理：${interception.action}\n\n`;
    });

    if (report.delayedLogImpact.affectedConclusions.length > 0) {
      content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      content += '  🕐 延迟日志对结论的影响\n';
      content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

      content += '以下结论受养殖日志延迟影响，仅供参考：\n\n';
      report.delayedLogImpact.affectedConclusions.forEach((conclusion, idx) => {
        content += `${idx + 1}. ${conclusion}\n`;
      });
      content += '\n';
    }
  }

  content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  content += '  📊 报告概览\n';
  content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  const ov = report.overview;
  content += `浮标记录总数：${ov.totalBuoyRecords} 条\n`;
  content += `有效浮标记录：${ov.validBuoyRecords} 条\n`;
  content += `漂移记录数：${ov.driftRecords} 条\n`;
  content += `水质记录数：${ov.waterQualityRecords} 条\n`;
  content += `补录记录数：${ov.supplementRecords} 条\n`;
  content += `延迟日志数：${ov.delayedLogs} 条\n`;
  content += `计算任务数：${ov.totalCalculations} 个\n`;
  content += `计算成功数：${ov.successfulCalculations} 个\n\n`;

  if (options.includeCalculationDetails) {
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    content += '  📐 侵蚀剖面计算详情\n';
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    report.erosionResults.forEach((result, idx) => {
      const statusText = result.calculationStatus === 'success' ? '✓ 计算成功' 
        : result.calculationStatus === 'partial' ? '⚠ 部分有效' 
        : '✗ 计算失败';
      
      content += `【断面 ${idx + 1}】${result.sectionName}  ${statusText}\n\n`;

      if (options.includeFormula) {
        content += `计算公式：${result.formula}\n`;
        content += `公式说明：${result.formulaDescription}\n`;
        content += `适用范围：${result.applicableScope}\n\n`;
      }

      content += `岸线位置：${result.shorelinePosition} ${result.units.distance}\n`;
      content += `平均侵蚀速率：${result.averageErosionRate} ${result.units.erosionRate}\n`;
      content += `最大侵蚀深度：${result.maximumErosionDepth} ${result.units.elevation}\n`;
      content += `侵蚀体积：${result.erosionVolume} ${result.units.volume}\n`;
      content += `输沙率：${result.sedimentTransportRate} ${result.units.sedimentRate}\n\n`;

      if (result.warnings.length > 0) {
        content += '⚠️  注意事项：\n';
        result.warnings.forEach(w => content += `  • ${w}\n`);
        content += '\n';
      }

      if (result.failureReasons.length > 0) {
        content += '❌ 失败原因：\n';
        result.failureReasons.forEach(r => content += `  • ${r}\n`);
        content += '\n';
      }

      content += `数据来源：${result.dataSources.join('、')}\n\n`;

      if (result.affectedByDelayedLogs) {
        content += `🕐 受${result.delayedLogCount}份延迟日志影响，结果可能需要更新\n\n`;
      }

      content += '─── 剖面数据点 ───\n';
      content += '距离(米)\t高程(米)\t水深(米)\n';
      result.points.forEach(p => {
        content += `${p.distanceFromShore}\t\t${p.elevation}\t\t${p.depth}\n`;
      });
      content += '\n';
    });
  }

  content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  content += '  💧 水质监测摘要\n';
  content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  const wq = report.waterQualitySummary;
  content += `正常：${wq.normalCount} 条\n`;
  content += `关注：${wq.attentionCount} 条\n`;
  content += `预警：${wq.warningCount} 条\n`;
  content += `危险：${wq.dangerCount} 条\n`;
  content += `补录：${wq.supplementCount} 条\n`;
  content += `待复核：${wq.pendingReviewCount} 条\n\n`;

  if (report.monthlySummary) {
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    content += '  📅 月度汇总\n';
    content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    content += `月份：${report.monthlySummary.month}\n\n`;
    content += '不可用记录类型分布：\n';
    report.monthlySummary.unusableRecordTypes.forEach(type => {
      const bar = '█'.repeat(Math.round(type.percentage * 2));
      content += `  ${type.type}：${type.count}条 (${type.percentage}%) ${bar}\n`;
    });
    content += '\n';

    content += '重点问题：\n';
    report.monthlySummary.keyIssues.forEach((issue, idx) => {
      content += `  ${idx + 1}. ${issue}\n`;
    });
    content += '\n';
  }

  content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  content += '  报告结束\n';
  content += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  content += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
  content += '本报告由海岸侵蚀剖面监测系统自动生成\n';

  return content;
}

export function downloadReport(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
