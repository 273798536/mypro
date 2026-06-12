function formatReport(result, options = {}) {
  const { showBadRows = true, showSkipped = true, showDuplicates = true, showDetails = false } = options;
  const lines = [];

  if (!result.success) {
    lines.push('❌ 试算失败');
    lines.push(`   ${result.error}`);
    return lines.join('\n');
  }

  const { stats, details, jumpAnalysis, threshold, expectedUnit } = result;

  lines.push('===== 最短路径参数试算报告 =====');
  lines.push('');
  lines.push(`总行数:       ${stats.totalRows}`);
  lines.push(`已处理:       ${stats.processed} ${stats.processed > 0 ? `(总距离 ${formatDistance(stats.totalDistance)})` : ''}`);
  lines.push(`坏行:         ${stats.badRows}`);
  lines.push(`跳过行:       ${stats.skipped}`);
  lines.push(`重复行:       ${stats.duplicates}`);
  lines.push('');

  if (isFinite(threshold)) {
    lines.push(`阈值设置:     ${formatDistance(threshold)}`);
    lines.push(`超阈值记录:   ${stats.overThresholdCount}`);
    lines.push('');
  }

  if (expectedUnit) {
    lines.push(`期望单位:     ${expectedUnit}`);
    lines.push(`单位不匹配:   ${stats.unitMismatchCount}`);
    lines.push('');
  }

  lines.push(`平均距离:     ${formatDistance(stats.avgDistance)}`);
  lines.push('');

  if (jumpAnalysis) {
    lines.push('----- 结果跳变分析 -----');
    if (jumpAnalysis.reasons.length > 0) {
      lines.push(`可能原因: ${jumpAnalysis.reasons.join('、')}`);
    }
    if (jumpAnalysis.singleRecordImpact) {
      lines.push(`单条记录影响:`);
      lines.push(`  题目ID: ${jumpAnalysis.singleRecordImpact.questionId}`);
      lines.push(`  距离:   ${formatDistance(jumpAnalysis.singleRecordImpact.distanceInMeters)}`);
      lines.push(`  对均值影响: ${jumpAnalysis.singleRecordImpact.impactOnAvg > 0 ? '+' : ''}${formatDistance(jumpAnalysis.singleRecordImpact.impactOnAvg)}`);
    }
    lines.push('');
  }

  if (showBadRows && details.badRows.length > 0) {
    lines.push('----- 坏行明细 -----');
    for (const row of details.badRows) {
      lines.push(`  第 ${row.lineNumber} 行: ${row.errors.join('；')}`);
      if (showDetails) {
        lines.push(`    原文: ${row.raw}`);
      }
    }
    lines.push('');
  }

  if (showSkipped && details.skippedRows.length > 0) {
    lines.push('----- 跳过行明细 -----');
    for (const row of details.skippedRows) {
      lines.push(`  第 ${row.lineNumber} 行: ${row.reason}`);
    }
    lines.push('');
  }

  if (showDuplicates && details.duplicateRows.length > 0) {
    lines.push('----- 重复行明细 -----');
    for (const row of details.duplicateRows) {
      lines.push(`  第 ${row.lineNumber} 行: 题目ID "${row.questionId}" 与第 ${row.firstLine} 行重复`);
    }
    lines.push('');
  }

  lines.push('==============================');

  return lines.join('\n');
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(2)} m`;
}

module.exports = { formatReport, formatDistance };
