import { format } from 'date-fns';
import { generateExportFileName } from './barcodeValidator';
import { CALCULATION_FORMULAS } from '@/data/formulas';
import {
  FAILURE_CATEGORY_LABELS,
  SAMPLE_STATUS_LABELS,
  QC_STATUS_LABELS,
  AREA_QUALITY_LABELS
} from '@/types';
import type {
  Sample,
  AnalysisRun,
  CultureRecord,
  TimePoint,
  ReviewRound,
  ReagentLot,
  DiffAnalysisResult,
  ExportConfig
} from '@/types';

export interface ReportData {
  sample: Sample;
  analysisRuns: AnalysisRun[];
  cultureRecord?: CultureRecord;
  timePoints: TimePoint[];
  reviewRounds: ReviewRound[];
  reagentLot?: ReagentLot;
  diffAnalysisResults?: DiffAnalysisResult[];
  exportConfig: ExportConfig;
  generatedAt: Date;
  operator: string;
}

export function generateCSVReport(data: ReportData): string {
  const rows: string[] = [];
  const { sample, analysisRuns, exportConfig, generatedAt, operator } = data;

  rows.push('细胞迁移划痕分析报告');
  rows.push(`生成时间,${format(generatedAt, 'yyyy-MM-dd HH:mm:ss')}`);
  rows.push(`操作人,${operator}`);
  rows.push('');

  rows.push('=== 样本信息 ===');
  rows.push('样本条码,细胞类型,患者ID,状态,操作人,录入时间,备注');
  rows.push([
    sample.barcode,
    sample.cellType,
    sample.patientId,
    SAMPLE_STATUS_LABELS[sample.status],
    sample.operator,
    format(sample.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    sample.notes || ''
  ].join(','));
  rows.push('');

  if (sample.isBarcodeDuplicate) {
    rows.push('=== 条码重复警告 ===');
    rows.push(`警告,该条码与 ${sample.duplicateWith} 重复，已被系统拦截`);
    rows.push('原因,避免同一样本重复计数导致统计偏差');
    rows.push('建议,检查录入错误或分配新的条码编号');
    rows.push('');
  }

  if (exportConfig.includeRawData && analysisRuns.length > 0) {
    rows.push('=== 分析运行记录 ===');
    rows.push('运行ID,运行次数,状态,分析时间,分析人,试剂批号');

    for (const run of analysisRuns) {
      rows.push([
        run.runId,
        run.runNumber,
        run.status === 'completed' ? '已完成' :
          run.status === 'failed' ? '失败' :
            run.status === 'processing' ? '处理中' : '待处理',
        format(run.analyzedAt, 'yyyy-MM-dd HH:mm:ss'),
        run.analyzedBy,
        run.reagentLotId || '未补录'
      ].join(','));

      if (run.status === 'failed' && run.failureReason) {
        rows.push(`失败原因,${FAILURE_CATEGORY_LABELS[run.failureReason.category]}`);
        rows.push(`详细描述,${run.failureReason.description}`);
        rows.push(`严重程度,${run.failureReason.severity === 'severe' ? '严重' :
          run.failureReason.severity === 'moderate' ? '中等' : '轻微'}`);
      }

      if (run.migrationData.length > 0) {
        rows.push('');
        rows.push('时间点(h),划痕面积(mm²),迁移率(%),图像质量');
        for (const point of run.migrationData) {
          rows.push([
            point.timePoint,
            point.areaMm2.toFixed(4),
            point.migrationRate.toFixed(2),
            AREA_QUALITY_LABELS[point.areaQuality]
          ].join(','));
        }
      }
      rows.push('');
    }
  }

  if (exportConfig.includeQC && analysisRuns.length > 0) {
    rows.push('=== 质控结果 ===');
    rows.push('运行ID,CV值(%),Z\'因子,细胞存活率(%),质控状态');

    for (const run of analysisRuns) {
      if (run.qcResult) {
        rows.push([
          run.runId,
          run.qcResult.cvValue.toFixed(2),
          run.qcResult.zPrimeFactor.toFixed(3),
          run.qcResult.cellViability.toFixed(1),
          QC_STATUS_LABELS[run.qcResult.status]
        ].join(','));
      }
    }
    rows.push('');
  }

  if (exportConfig.includeFormula) {
    rows.push('=== 计算公式说明 ===');
    rows.push('公式名称,公式,单位,适用范围');
    for (const formula of CALCULATION_FORMULAS) {
      rows.push([
        formula.name,
        formula.formula,
        formula.unit,
        formula.applicableRange
      ].join(','));
    }
    rows.push('');
  }

  if (exportConfig.includeHistory && data.reviewRounds.length > 0) {
    rows.push('=== 复核记录 ===');
    rows.push('轮次,复核人,复核时间,状态,培养记录检查,时间点检查');
    for (const round of data.reviewRounds) {
      rows.push([
        round.roundNumber,
        round.reviewer,
        round.reviewedAt ? format(round.reviewedAt, 'yyyy-MM-dd HH:mm:ss') : '进行中',
        round.status === 'completed' ? '已完成' : '进行中',
        round.cultureRecordCheck.isComplete ? '完整' : '不完整',
        round.timePointCheck.isComplete ? '完整' : '不完整'
      ].join(','));

      if (round.comments.length > 0) {
        rows.push('复核意见:');
        for (const comment of round.comments) {
          rows.push(`  [${comment.section}] ${comment.content}`);
          rows.push(`  建议: ${comment.suggestion}`);
        }
      }
      rows.push('');
    }
  }

  return rows.join('\n');
}

export function generateTextReport(data: ReportData): string {
  const lines: string[] = [];
  const { sample, analysisRuns, cultureRecord, timePoints, reviewRounds,
    reagentLot, diffAnalysisResults, exportConfig, generatedAt, operator } = data;

  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║              细胞迁移划痕分析报告                              ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`生成时间：${format(generatedAt, 'yyyy年MM月dd日 HH:mm:ss')}`);
  lines.push(`操作人：${operator}`);
  lines.push(`报告编号：${sample.barcode}-${format(generatedAt, 'yyyyMMddHHmmss')}`);
  lines.push('');

  lines.push('┌──────────────────────────────────────────────────────────────┐');
  lines.push('│  一、样本信息                                                 │');
  lines.push('└──────────────────────────────────────────────────────────────┘');
  lines.push(`  样本条码：${sample.barcode}`);
  lines.push(`  细胞类型：${sample.cellType}`);
  lines.push(`  患者ID：${sample.patientId}`);
  lines.push(`  样本状态：${SAMPLE_STATUS_LABELS[sample.status]}`);
  lines.push(`  操作人：${sample.operator}`);
  lines.push(`  录入时间：${format(sample.createdAt, 'yyyy年MM月dd日 HH:mm:ss')}`);
  if (sample.notes) {
    lines.push(`  备注：${sample.notes}`);
  }
  lines.push('');

  if (sample.isBarcodeDuplicate) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  ⚠️  条码重复拦截警告                                          │');
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push(`  ❌ 该条码「${sample.barcode}」已被系统拦截`);
    lines.push('');
    lines.push('  📋 拦截原因：');
    lines.push('     就像考试时不能有两个同学用同一个准考证号一样，');
    lines.push('     如果两个样本用了同一个条码，系统就无法区分它们。');
    lines.push('');
    lines.push('  ⚠️  可能导致的问题：');
    lines.push('     1. 数据混淆：不知道哪个结果属于哪个样本');
    lines.push('     2. 统计错误：同一个样本被重复计算，导致偏差');
    lines.push('     3. 报告错误：最终报告可能发错给病人');
    lines.push('');
    lines.push('  ✅ 处理建议：');
    lines.push(`     • 确认是否与已有样本「${sample.duplicateWith}」为同一批`);
    lines.push('     • 如为录入错误，请修正条码编号');
    lines.push('     • 如为新样本，请分配新的条码编号');
    lines.push('');
  }

  if (exportConfig.includeRawData && analysisRuns.length > 0) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  二、分析运行记录                                             │');
    lines.push('└──────────────────────────────────────────────────────────────┘');

    for (const run of analysisRuns) {
      lines.push(`  ▶ 第${run.runNumber}次运行（${run.runId}）`);
      lines.push(`    状态：${run.status === 'completed' ? '✅ 已完成' :
        run.status === 'failed' ? '❌ 失败' :
          run.status === 'processing' ? '⏳ 处理中' : '⏸️ 待处理'}`);
      lines.push(`    分析时间：${format(run.analyzedAt, 'yyyy-MM-dd HH:mm:ss')}`);
      lines.push(`    分析人：${run.analyzedBy}`);
      lines.push(`    试剂批号：${run.reagentLotId || '⚠️ 未补录'}`);

      if (reagentLot) {
        lines.push(`    试剂名称：${reagentLot.reagentName}`);
        lines.push(`    生产厂家：${reagentLot.manufacturer}`);
        lines.push(`    有效期至：${format(reagentLot.expiryDate, 'yyyy-MM-dd')}`);
      }

      if (run.status === 'failed' && run.failureReason) {
        lines.push('');
        lines.push('    ❌ 失败原因：');
        lines.push(`       类别：${FAILURE_CATEGORY_LABELS[run.failureReason.category]}`);
        lines.push(`       描述：${run.failureReason.description}`);
        lines.push(`       严重程度：${run.failureReason.severity === 'severe' ? '🔴 严重' :
          run.failureReason.severity === 'moderate' ? '🟡 中等' : '🟢 轻微'}`);
      }

      if (run.migrationData.length > 0) {
        lines.push('');
        lines.push('    📊 迁移率数据：');
        lines.push('    ┌──────┬──────────────┬──────────┬──────────┐');
        lines.push('    │ 时间点 │ 划痕面积(mm²) │ 迁移率(%) │ 图像质量 │');
        lines.push('    ├──────┼──────────────┼──────────┼──────────┤');
        for (const point of run.migrationData) {
          const qualityIcon = point.areaQuality === 'good' ? '🟢' :
            point.areaQuality === 'fair' ? '🟡' : '🔴';
          lines.push(`    │ ${String(point.timePoint).padStart(4)}h │ ${point.areaMm2.toFixed(4).padStart(10)}   │ ${point.migrationRate.toFixed(2).padStart(6)}  │ ${qualityIcon} ${AREA_QUALITY_LABELS[point.areaQuality].padStart(4)} │`);
        }
        lines.push('    └──────┴──────────────┴──────────┴──────────┘');
      }
      lines.push('');
    }
  }

  if (exportConfig.includeQC && analysisRuns.length > 0) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  三、质量控制结果                                             │');
    lines.push('└──────────────────────────────────────────────────────────────┘');

    for (const run of analysisRuns) {
      if (run.qcResult) {
        const statusIcon = run.qcResult.status === 'pass' ? '✅' :
          run.qcResult.status === 'warning' ? '⚠️' : '❌';
        lines.push(`  ${statusIcon} 第${run.runNumber}次运行质控结果：`);
        lines.push(`     • CV值：${run.qcResult.cvValue.toFixed(2)}% ${run.qcResult.cvValue > 10 ? '⚠️ 超过阈值10%' : '✅ 合格'}`);
        lines.push(`     • Z'因子：${run.qcResult.zPrimeFactor.toFixed(3)} ${run.qcResult.zPrimeFactor < 0.5 ? '⚠️ 低于阈值0.5' : '✅ 合格'}`);
        lines.push(`     • 细胞存活率：${run.qcResult.cellViability.toFixed(1)}% ${run.qcResult.cellViability < 90 ? '⚠️ 低于要求90%' : '✅ 合格'}`);
        lines.push(`     • 总体结论：${QC_STATUS_LABELS[run.qcResult.status]}`);
      }
    }
    lines.push('');
  }

  if (cultureRecord) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  四、培养记录                                                 │');
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push(`  培养开始时间：${format(cultureRecord.cultureStart, 'yyyy-MM-dd HH:mm')}`);
    lines.push(`  培养温度：${cultureRecord.temperature.toFixed(1)}°C`);
    lines.push(`  CO₂浓度：${cultureRecord.co2Concentration.toFixed(1)}%`);
    lines.push(`  培养基类型：${cultureRecord.mediumType}`);
    lines.push(`  操作人签字：${cultureRecord.operatorSign || '⚠️ 未签字'}`);
    if (cultureRecord.remark) {
      lines.push(`  备注：${cultureRecord.remark}`);
    }
    lines.push('');
  }

  if (timePoints.length > 0) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  五、时间点检查                                               │');
    lines.push('└──────────────────────────────────────────────────────────────┘');
    const missingPoints = timePoints.filter(t => !t.isPresent);
    const presentPoints = timePoints.filter(t => t.isPresent);

    lines.push(`  ✅ 已采集时间点：${presentPoints.map(t => `${t.hour}h`).join(', ')}`);
    if (missingPoints.length > 0) {
      lines.push(`  ⚠️ 缺失时间点：${missingPoints.map(t => `${t.hour}h`).join(', ')}`);
      for (const point of missingPoints) {
        if (point.remark) {
          lines.push(`     - ${point.hour}h：${point.remark}`);
        }
      }
    }
    lines.push('');
  }

  if (diffAnalysisResults && diffAnalysisResults.length > 0) {
    const latestDiffAnalysis = diffAnalysisResults[diffAnalysisResults.length - 1];
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  六、差异分析结果（迭代判断）                                 │');
    lines.push('└──────────────────────────────────────────────────────────────┘');
    lines.push(`  分析轮次：第${latestDiffAnalysis.roundNumber}轮`);
    lines.push(`  分析时间：${format(latestDiffAnalysis.timestamp, 'yyyy-MM-dd HH:mm:ss')}`);
    lines.push(`  分析人：${latestDiffAnalysis.operator}`);

    const conclusionIcon = latestDiffAnalysis.conclusion === 'support' ? '✅' :
      latestDiffAnalysis.conclusion === 'not_support' ? '❌' : '⚠️';
    lines.push(`  ${conclusionIcon} 结论：${latestDiffAnalysis.conclusionText}`);

    lines.push('');
    lines.push('  📝 支持证据：');
    for (const evidence of latestDiffAnalysis.evidence) {
      lines.push(`     • ${evidence}`);
    }

    lines.push('');
    lines.push('  ⚠️ 局限性说明：');
    for (const limitation of latestDiffAnalysis.limitations) {
      lines.push(`     • ${limitation}`);
    }
    lines.push('');
  }

  if (exportConfig.includeHistory && reviewRounds.length > 0) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  七、复核记录（含培养记录+复核意见+时间点检查）                │');
    lines.push('└──────────────────────────────────────────────────────────────┘');

    for (const round of reviewRounds) {
      const statusIcon = round.status === 'completed' ? '✅' : '⏳';
      lines.push(`  ${statusIcon} 第${round.roundNumber}轮复核`);
      lines.push(`     复核人：${round.reviewer}`);
      lines.push(`     复核时间：${round.reviewedAt ? format(round.reviewedAt, 'yyyy-MM-dd HH:mm:ss') : '进行中'}`);
      lines.push('');
      lines.push('     📋 培养记录检查：');
      lines.push(`        完整性：${round.cultureRecordCheck.isComplete ? '✅ 完整' : '❌ 不完整'}`);
      if (round.cultureRecordCheck.issues.length > 0) {
        lines.push('        存在问题：');
        for (const issue of round.cultureRecordCheck.issues) {
          lines.push(`          • ${issue}`);
        }
      }
      if (round.cultureRecordCheck.remark) {
        lines.push(`        备注：${round.cultureRecordCheck.remark}`);
      }
      lines.push('');
      lines.push('     ⏰ 时间点检查：');
      lines.push(`        完整性：${round.timePointCheck.isComplete ? '✅ 完整' : '❌ 不完整'}`);
      if (round.timePointCheck.issues.length > 0) {
        lines.push('        存在问题：');
        for (const issue of round.timePointCheck.issues) {
          lines.push(`          • ${issue}`);
        }
      }
      if (round.timePointCheck.remark) {
        lines.push(`        备注：${round.timePointCheck.remark}`);
      }
      lines.push('');

      if (round.comments.length > 0) {
        lines.push('     💬 复核意见：');
        for (let i = 0; i < round.comments.length; i++) {
          const comment = round.comments[i];
          const sectionLabel = comment.section === 'culture' ? '培养' :
            comment.section === 'analysis' ? '分析' :
              comment.section === 'qc' ? '质控' : '其他';
          lines.push(`       ${i + 1}. [${sectionLabel}] ${comment.content}`);
          lines.push(`          建议：${comment.suggestion}`);
        }
      }
      lines.push('');
    }
  }

  if (exportConfig.includeFormula) {
    lines.push('┌──────────────────────────────────────────────────────────────┐');
    lines.push('│  八、计算公式说明                                             │');
    lines.push('└──────────────────────────────────────────────────────────────┘');

    for (const formula of CALCULATION_FORMULAS) {
      lines.push(`  📐 ${formula.name}（${formula.unit}）`);
      lines.push(`     公式：${formula.formula}`);
      lines.push(`     说明：${formula.description}`);
      lines.push(`     适用范围：${formula.applicableRange}`);
      if (formula.notApplicable.length > 0) {
        lines.push(`     不适用：${formula.notApplicable.join('、')}`);
      }
      lines.push('');
    }
  }

  lines.push('┌──────────────────────────────────────────────────────────────┐');
  lines.push('│  九、报告说明                                                 │');
  lines.push('└──────────────────────────────────────────────────────────────┘');
  lines.push('  • 本报告由细胞迁移划痕分析系统自动生成');
  lines.push('  • 所有计算均采用标准化公式，确保结果可重复');
  lines.push('  • 异常样本已标注并给出处理建议');
  lines.push('  • 如需重新分析，请使用新的运行编号，避免数据混淆');
  lines.push('');
  lines.push(`  📄 文件名：${generateExportFileName(sample.barcode, analysisRuns.length, generatedAt, 'csv')}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                   报告结束');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function downloadReport(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFilename(
  barcode: string,
  runCount: number,
  format: 'csv' | 'txt'
): string {
  const now = new Date();
  return generateExportFileName(barcode, runCount, now, format === 'csv' ? 'csv' : 'pdf');
}
