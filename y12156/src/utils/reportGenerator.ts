import { ThermalBridgeCalculation, CalculationResult, ReportData, ValidationIssue, DataConflict } from '../types';
import { ENERGY_PRICE_PER_KWH } from './constants';
import { formatHeatFlowRate, formatEnergyMonthly, formatPercentage, formatCurrency, formatDate, formatUValue } from './formatters';

export function generateReportData(
  calculation: ThermalBridgeCalculation,
  result: CalculationResult
): ReportData {
  const monthlyEnergyCost = result.totalHeatLossMonthly * ENERGY_PRICE_PER_KWH;

  return {
    calculation,
    result,
    generatedAt: new Date(),
    summary: {
      totalHeatLoss: result.totalHeatLoss,
      thermalBridgeLoss: result.thermalBridgeLoss,
      bridgeLossRatio: result.thermalBridgeLossRatio,
      monthlyEnergyCost,
      issuesCount: calculation.validationIssues.length,
      conflictsCount: calculation.conflicts.length,
    },
  };
}

export function generateHumanReadableSummary(reportData: ReportData): string {
  const { result, summary } = reportData;
  const lines: string[] = [];

  lines.push('=== 热桥损耗分析报告摘要 ===');
  lines.push('');
  lines.push('📊 计算结果概览');
  lines.push(`  • 总热损耗: ${formatHeatFlowRate(result.totalHeatLoss)}`);
  lines.push(`  • 月度能耗: ${formatEnergyMonthly(result.totalHeatLossMonthly)}`);
  lines.push(`  • 预估电费: ${formatCurrency(summary.monthlyEnergyCost)}`);
  lines.push(`  • 平均传热系数(U值): ${formatUValue(result.averageUValue)}`);
  lines.push('');

  lines.push('🌉 热桥影响分析');
  lines.push(`  • 热桥损耗: ${formatHeatFlowRate(result.thermalBridgeLoss)}`);
  lines.push(`  • 热桥占比: ${formatPercentage(result.thermalBridgeLossRatio)}`);

  if (result.thermalBridgeLossRatio > 20) {
    lines.push('  ⚠️  热桥损耗占比较高，建议重点优化热桥节点设计');
  } else if (result.thermalBridgeLossRatio > 10) {
    lines.push('  ℹ️  热桥损耗处于正常范围，可考虑进一步优化');
  } else {
    lines.push('  ✅ 热桥控制良好，节能设计达标');
  }
  lines.push('');

  lines.push('🔍 数据质量检查');
  lines.push(`  • 发现问题: ${summary.issuesCount} 个`);
  lines.push(`  • 数据冲突: ${summary.conflictsCount} 个`);

  if (summary.issuesCount > 0) {
    lines.push('  ⚠️  存在数据问题，计算结果可能存在偏差');
  }
  if (summary.conflictsCount > 0) {
    lines.push('  ⚠️  存在未解决的数据冲突，请仔细核对');
  }

  lines.push('');
  lines.push('📅 适用范围');
  lines.push(`  ${result.applicableScope || '未指定'}`);

  if (result.failureReasons.length > 0) {
    lines.push('');
    lines.push('❌ 计算警告');
    for (const reason of result.failureReasons) {
      lines.push(`  • ${reason}`);
    }
  }

  return lines.join('\n');
}

export function generateIssuesExplanation(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return '✅ 数据校验全部通过，未发现问题。';
  }

  const lines: string[] = [];
  const missingParams = issues.filter(i => i.type === 'missing_parameter');
  const duplicates = issues.filter(i => i.type === 'duplicate_node');
  const reversed = issues.filter(i => i.type === 'reversed_temperature');

  if (missingParams.length > 0) {
    lines.push(`📋 缺少参数 (${missingParams.length} 项):`);
    for (const issue of missingParams) {
      lines.push(`  ${issue.humanReadableExplanation}`);
    }
    lines.push('');
  }

  if (duplicates.length > 0) {
    lines.push(`🔄 重复节点 (${duplicates.length} 项):`);
    for (const issue of duplicates) {
      lines.push(`  ${issue.humanReadableExplanation}`);
    }
    lines.push('');
  }

  if (reversed.length > 0) {
    lines.push(`🌡️  温差异常 (${reversed.length} 项):`);
    for (const issue of reversed) {
      lines.push(`  ${issue.humanReadableExplanation}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function generateConflictsExplanation(conflicts: DataConflict[]): string {
  if (conflicts.length === 0) {
    return '✅ 构造数据与材料数据完全匹配，无冲突。';
  }

  const unresolved = conflicts.filter(c => !c.resolved);
  const resolved = conflicts.filter(c => c.resolved);

  const lines: string[] = [];

  if (unresolved.length > 0) {
    lines.push(`⚠️  待处理冲突 (${unresolved.length} 项):`);
    for (const conflict of unresolved) {
      lines.push(`  • ${conflict.fieldName} 不一致`);
      lines.push(`    构造数据(${conflict.constructionMaintainer}): ${conflict.constructionValue}`);
      lines.push(`    材料数据(${conflict.materialMaintainer}): ${conflict.materialValue}`);
      lines.push(`    来源: ${conflict.constructionSource} vs ${conflict.materialSource}`);
      lines.push('');
    }
  }

  if (resolved.length > 0) {
    lines.push(`✅ 已解决冲突 (${resolved.length} 项):`);
    for (const conflict of resolved) {
      lines.push(`  • ${conflict.fieldName}`);
      lines.push(`    裁决结果: ${conflict.resolvedValue}`);
      lines.push(`    裁决人: ${conflict.resolvedBy || '未知'}`);
      lines.push(`    时间: ${formatDate(conflict.resolvedAt)}`);
      if (conflict.resolutionNote) {
        lines.push(`    备注: ${conflict.resolutionNote}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function generatePlainLanguageReport(reportData: ReportData): string {
  const { calculation, result, summary } = reportData;
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║              建筑热桥损耗分析报告（通俗版）                  ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`📄 项目名称: ${calculation.name}`);
  lines.push(`📅 生成时间: ${formatDate(reportData.generatedAt)}`);
  lines.push(`🔧 计算时间: ${formatDate(result.calculatedAt)}`);
  lines.push('');

  lines.push('═══════════════════ 一、这面墙"漏"多少热？ ═══════════════════');
  lines.push('');
  lines.push('想象这面墙就像一个保温桶，保温越好，桶里的热气跑出去的越少。');
  lines.push('我们计算的就是这面墙每秒钟会让多少热量"溜出去"。');
  lines.push('');
  lines.push(`  🔥 每秒钟漏掉的热量: ${formatHeatFlowRate(result.totalHeatLoss)}`);
  lines.push(`     → 相当于同时开着 ${Math.round(result.totalHeatLoss / 1000)} 个1千瓦的电暖器在向外散热`);
  lines.push('');
  lines.push(`  💡 一个月浪费的电量: ${formatEnergyMonthly(result.totalHeatLossMonthly)}`);
  lines.push(`     → 按0.8元/度电算，一个月电费约 ${formatCurrency(summary.monthlyEnergyCost)}`);
  lines.push(`     → 一年就是 ${formatCurrency(summary.monthlyEnergyCost * 12)}`);
  lines.push('');

  lines.push('═══════════════════ 二、"热桥"是什么？ ════════════════════');
  lines.push('');
  lines.push('墙体就像一条高速公路，大部分地方是"慢车道"（保温层，热量走得慢），');
  lines.push('但在窗户边、墙角、螺栓穿透的地方，就像开了"快车道"，热量跑得特别快。');
  lines.push('这些"快车道"就是热桥。');
  lines.push('');
  lines.push(`  🌉 热桥漏掉的热量: ${formatHeatFlowRate(result.thermalBridgeLoss)}`);
  lines.push(`     → 占总漏热量的 ${formatPercentage(result.thermalBridgeLossRatio)}`);
  lines.push('');

  if (result.thermalBridgeLossRatio > 20) {
    lines.push('  ⚠️  热桥有点严重哦！');
    lines.push('     超过20%的热量是从这些"快车道"跑掉的，建议加强窗边、墙角的保温处理。');
  } else if (result.thermalBridgeLossRatio > 10) {
    lines.push('  ℹ️  热桥情况还行');
    lines.push('     约10%-20%的热量从热桥流失，属于正常范围，有优化空间。');
  } else {
    lines.push('  ✅ 热桥控制得很好！');
    lines.push('     不到10%的热量从热桥流失，保温设计到位。');
  }
  lines.push('');

  lines.push('═══════════════════ 三、数据靠谱吗？ ════════════════════');
  lines.push('');

  const issues = calculation.validationIssues;
  const conflicts = calculation.conflicts;

  if (issues.length === 0 && conflicts.length === 0) {
    lines.push('✅ 数据很完整，计算结果很靠谱！');
  } else {
    lines.push('⚠️  数据有点小问题，请留意：');
    lines.push('');

    const missingParams = issues.filter(i => i.type === 'missing_parameter' && i.severity === 'error');
    if (missingParams.length > 0) {
      lines.push(`  ❌ 缺少参数 (${missingParams.length} 个)`);
      lines.push('     有些必填的数字没填上，就像做饭缺了主要食材。');
      lines.push('     这些问题必须修正，否则计算结果不准确。');
      lines.push('');
      for (const issue of missingParams.slice(0, 3)) {
        lines.push(`     • ${issue.humanReadableExplanation}`);
      }
      if (missingParams.length > 3) {
        lines.push(`     ...还有 ${missingParams.length - 3} 项，详见完整报告`);
      }
      lines.push('');
    }

    const duplicates = issues.filter(i => i.type === 'duplicate_node');
    if (duplicates.length > 0) {
      lines.push(`  ❌ 重复记录 (${duplicates.length} 个)`);
      lines.push('     同一样东西被录入了好几次，就像点菜点了两份一样。');
      lines.push('     重复数据会让计算结果偏大。');
      lines.push('');
      for (const issue of duplicates) {
        lines.push(`     • ${issue.humanReadableExplanation}`);
      }
      lines.push('');
    }

    const reversed = issues.filter(i => i.type === 'reversed_temperature');
    if (reversed.length > 0) {
      lines.push(`  ⚠️  温度好像填反了 (${reversed.length} 个)`);
      lines.push('');
      for (const issue of reversed) {
        lines.push(`     • ${issue.humanReadableExplanation}`);
      }
      lines.push('');
    }

    const unresolvedConflicts = conflicts.filter(c => !c.resolved);
    if (unresolvedConflicts.length > 0) {
      lines.push(`  ⚠️  数据"打架"了 (${unresolvedConflicts.length} 处)`);
      lines.push('     构造部门和材料部门给的数据不一样，需要人工决定用哪个。');
      lines.push('     就像两个人对同一件事说法不同，得有人来评理。');
      lines.push('');
    }
  }

  lines.push('');
  lines.push('═══════════════════ 四、适用范围说明 ════════════════════');
  lines.push('');
  lines.push(`  本计算结果适用于：${result.applicableScope || '未指定'}`);
  lines.push('');
  lines.push('  请注意：');
  lines.push('  • 计算基于提供的材料参数和构造方案');
  lines.push('  • 实际效果可能受施工质量、使用环境等因素影响');
  lines.push('  • 建议结合现场实测数据进行复核');
  lines.push('');

  lines.push('═══════════════════ 五、数据来源追溯 ════════════════════');
  lines.push('');
  lines.push('为了保证结果透明可追溯，以下是本次计算用到的数据来源：');
  lines.push('');

  for (const source of result.dataSourceChain) {
    const typeLabel = source.type === 'construction' ? '墙体构造' :
                      source.type === 'material' ? '材料数据' : '环境参数';
    lines.push(`  📋 ${typeLabel}:`);
    lines.push(`     名称: ${source.name}`);
    lines.push(`     负责人: ${source.maintainer}`);
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('报告生成完毕。如有疑问，请联系建筑节能顾问。');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function getMonthlyEnergyCost(totalHeatLossMonthly: number): number {
  return totalHeatLossMonthly * ENERGY_PRICE_PER_KWH;
}
