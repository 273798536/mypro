import dayjs from 'dayjs';
import { CVExperiment, ReagentRecord, Issue, BatchSummary, DataSource, IssueSeverity } from '../types';

function uid(prefix = 'ISSUE'): string {
  return `${prefix}-${Date.now().toString(36).slice(-5)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function detectBlankControlMissing(experiments: CVExperiment[]): Issue[] {
  const byBatch = new Map<string, CVExperiment[]>();
  for (const exp of experiments) {
    if (!byBatch.has(exp.batchId)) byBatch.set(exp.batchId, []);
    byBatch.get(exp.batchId)!.push(exp);
  }
  const issues: Issue[] = [];
  for (const [batchId, exps] of byBatch) {
    const hasCompletedBlank = exps.some(e => e.sampleType === 'blank' && e.status === 'completed');
    const hasUnknown = exps.some(e => e.sampleType === 'unknown' || e.sampleType === 'qc');
    if (hasUnknown && !hasCompletedBlank) {
      const unknownIds = exps.filter(e => e.sampleType === 'unknown' || e.sampleType === 'qc').map(e => e.experimentId);
      const operators = Array.from(new Set(exps.map(e => e.operator))).join('、');
      issues.push({
        issueId: uid('BLANK'),
        batchId,
        type: 'blank_control_missing',
        severity: 'critical',
        title: `${batchId} 批次空白对照缺失`,
        description: `该批次共 ${exps.length} 条实验记录，包含 ${unknownIds.length} 个未知/质控样品，但未找到已完成的空白对照记录。`,
        studentExplanation: `空白对照是扣除背景电流和污染信号的基准。如果没有空白对照，本批次 ${unknownIds.length} 条样品数据中的峰电流无法确定是来自样品还是电解液/电极本底，定量计算和结果判断均不可靠，因此该批次样品结果被系统拦截。`,
        suggestion: '请立即补做该批次的空白对照实验，使用相同电解液、相同电极和相同扫描参数。补做完成后系统会自动更新检测结论。',
        affectedRecords: unknownIds,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return issues;
}

export function detectTemperatureCurveIssues(experiments: CVExperiment[]): Issue[] {
  const issues: Issue[] = [];
  for (const exp of experiments) {
    if ((exp.status === 'completed' || exp.status === 'running') && (!exp.temperaturePoints || exp.temperaturePoints.length < 2)) {
      issues.push({
        issueId: uid('TEMP'),
        batchId: exp.batchId,
        experimentId: exp.experimentId,
        type: 'temperature_missing',
        severity: 'warning',
        title: `${exp.experimentId} 温度曲线记录不完整`,
        description: `该实验记录仅有 ${exp.temperaturePoints?.length || 0} 个温度点，无法反映实验过程中温度波动。`,
        studentExplanation: '电化学响应对温度敏感（通常每升高1℃峰电流变化约2~3%）。温度曲线是判断实验条件稳定性、解释平行样偏差的重要依据。缺少温度记录会让后续复盘时无法判断数据漂移的原因。',
        suggestion: '请补录实验过程中的温度数据（建议至少3个时间点：开始、中间、结束），系统会根据温度波动范围自动更新复测建议。',
        affectedRecords: [exp.experimentId],
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return issues;
}

export function detectTemperatureStability(experiments: CVExperiment[]): Issue[] {
  const issues: Issue[] = [];
  for (const exp of experiments) {
    if (exp.temperaturePoints && exp.temperaturePoints.length >= 2) {
      const temps = exp.temperaturePoints.map(p => p.temperature);
      const max = Math.max(...temps);
      const min = Math.min(...temps);
      const diff = max - min;
      if (diff > 2.0) {
        issues.push({
          issueId: uid('TEMP'),
          batchId: exp.batchId,
          experimentId: exp.experimentId,
          type: 'temperature_unstable',
          severity: 'warning' as IssueSeverity,
          title: `${exp.experimentId} 实验过程温度波动过大 (${diff.toFixed(1)}℃)`,
          description: `温度范围 ${min.toFixed(1)}℃ ~ ${max.toFixed(1)}℃，波动超过 2℃ 阈值。`,
          studentExplanation: `该实验过程中温度变化达到 ${diff.toFixed(1)}℃，按 2%/℃ 估算可能引入约 ${(diff * 2).toFixed(0)}% 的峰电流偏差，超过一般定量分析的允许范围。`,
          suggestion: diff > 3.0 ? '建议复测该样品，复测时请使用恒温水浴控制温度波动在 ±1℃ 以内。' : '建议关注同批次平行样RSD，如RSD偏大需考虑复测。',
          affectedRecords: [exp.experimentId],
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return issues;
}

export function detectFailedExperiments(experiments: CVExperiment[]): Issue[] {
  const issues: Issue[] = [];
  for (const exp of experiments) {
    if (exp.status === 'failed') {
      issues.push({
        issueId: uid('FAIL'),
        batchId: exp.batchId,
        experimentId: exp.experimentId,
        type: 'experiment_failed',
        severity: 'warning',
        title: `${exp.experimentId} 实验失败/作废`,
        description: exp.manualNote || '该实验记录标记为失败状态。',
        studentExplanation: `实验状态为"失败/作废"，这条数据不参与定量计算。如果是关键样品，请尽快安排复测，避免拖到月底复盘才发现数据缺口。`,
        suggestion: '请在备注中记录失败原因，并尽快安排复测。',
        affectedRecords: [exp.experimentId],
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return issues;
}

export function detectReagentIssues(reagents: ReagentRecord[]): Issue[] {
  const issues: Issue[] = [];
  for (const r of reagents) {
    if (r.status === 'expired') {
      const daysOverdue = dayjs().diff(dayjs(r.expiryDate), 'day');
      issues.push({
        issueId: uid('REAG'),
        batchId: 'REAGENT',
        type: 'reagent_expired',
        severity: 'critical',
        title: `试剂 ${r.reagentName} (${r.reagentId}) 已过期`,
        description: `过期 ${daysOverdue} 天，有效期至 ${r.expiryDate}。${r.manualNote ? `备注: ${r.manualNote}` : ''}`,
        studentExplanation: `该试剂已过期 ${daysOverdue} 天。使用过期试剂可能导致响应灵敏度下降、空白电流增大、标准曲线不成线性等问题。如果已经用这批试剂做了实验，相关数据需要特别标注或评估是否可用。`,
        suggestion: '立即停止使用该批次试剂，核对所有使用该试剂的实验记录是否受影响，必要时安排复测。',
        affectedRecords: [r.reagentId],
        detectedAt: new Date().toISOString(),
      });
    } else if (r.status === 'invalid') {
      issues.push({
        issueId: uid('REAG'),
        batchId: 'REAGENT',
        type: 'reagent_invalid',
        severity: 'critical',
        title: `试剂 ${r.reagentName} (${r.reagentId}) 标记为无效`,
        description: r.handoverRemark || r.manualNote || '该试剂已标记为无效状态。',
        studentExplanation: '该试剂被标记为无效，不得用于任何实验。如果近期有使用该试剂的实验记录，请务必在月底转交前标记出来。',
        suggestion: r.handoverRemark || '按作废流程处理，做好台账登记。',
        affectedRecords: [r.reagentId],
        detectedAt: new Date().toISOString(),
      });
    } else if (r.status === 'review_needed') {
      issues.push({
        issueId: uid('REAG'),
        batchId: 'REAGENT',
        type: 'reagent_review',
        severity: 'warning',
        title: `试剂 ${r.reagentName} (${r.reagentId}) 待审核`,
        description: r.manualNote || '该试剂状态待确认。',
        studentExplanation: '该试剂状态需要确认，月底转交时需要重点说明。',
        suggestion: '请在月底转交前完成状态确认（有效/无效），并在台账中更新。',
        affectedRecords: [r.reagentId],
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return issues;
}

export function generateBatchSummaries(experiments: CVExperiment[], issues: Issue[]): BatchSummary[] {
  const byBatch = new Map<string, CVExperiment[]>();
  for (const exp of experiments) {
    if (!byBatch.has(exp.batchId)) byBatch.set(exp.batchId, []);
    byBatch.get(exp.batchId)!.push(exp);
  }
  const summaries: BatchSummary[] = [];
  for (const [batchId, exps] of byBatch) {
    const batchIssues = issues.filter(i => i.batchId === batchId);
    const criticalCount = batchIssues.filter(i => i.severity === 'critical').length;
    const warningCount = batchIssues.filter(i => i.severity === 'warning').length;
    const hasBlankControl = exps.some(e => e.sampleType === 'blank' && e.status === 'completed');
    const hasTemperatureCurve = exps.every(e => !e.status || e.status === 'pending' || (e.temperaturePoints && e.temperaturePoints.length >= 2));
    let status: BatchSummary['status'] = 'ok';
    let retestSuggestion: string | undefined;
    if (criticalCount > 0) {
      status = 'blocked';
      retestSuggestion = '存在严重问题（如空白对照缺失、过期试剂），该批次数据不可用，必须补做后方可进入复盘。';
    } else if (warningCount > 0) {
      status = 'warning';
      retestSuggestion = hasTemperatureCurve
        ? '存在部分警告项（如个别实验失败），建议核对后补做相应样品。'
        : '温度曲线不完整，请先补录温度数据，系统将根据补录结果自动更新复测建议。';
    }
    summaries.push({
      batchId,
      totalExperiments: exps.length,
      blankCount: exps.filter(e => e.sampleType === 'blank').length,
      standardCount: exps.filter(e => e.sampleType === 'standard').length,
      unknownCount: exps.filter(e => e.sampleType === 'unknown').length,
      hasBlankControl,
      hasTemperatureCurve,
      issues: batchIssues,
      retestSuggestion,
      status,
      lastUpdated: new Date().toISOString(),
    });
  }
  return summaries;
}

export function runAllChecks(data: { experiments: CVExperiment[]; reagents: ReagentRecord[] }): DataSource {
  const allIssues: Issue[] = [
    ...detectBlankControlMissing(data.experiments),
    ...detectTemperatureCurveIssues(data.experiments),
    ...detectTemperatureStability(data.experiments),
    ...detectFailedExperiments(data.experiments),
    ...detectReagentIssues(data.reagents),
  ];
  const batches = generateBatchSummaries(data.experiments, allIssues);
  return {
    experiments: data.experiments,
    reagents: data.reagents,
    batches,
    issues: allIssues,
    importedAt: new Date().toISOString(),
  };
}

export function updateRetestSuggestionAfterTemperature(batch: BatchSummary, experiments: CVExperiment[]): BatchSummary {
  const allHaveTemp = experiments
    .filter(e => e.batchId === batch.batchId)
    .every(e => e.status === 'pending' || (e.temperaturePoints && e.temperaturePoints.length >= 2));
  const tempIssues = batch.issues.filter(i => i.type === 'temperature_missing');
  const otherIssues = batch.issues.filter(i => i.type !== 'temperature_missing');
  const criticalCount = otherIssues.filter(i => i.severity === 'critical').length;
  const warningCount = otherIssues.filter(i => i.severity === 'warning').length;
  if (allHaveTemp) {
    let status: BatchSummary['status'] = 'ok';
    let retestSuggestion: string | undefined;
    if (criticalCount > 0) {
      status = 'blocked';
      retestSuggestion = '温度曲线已补录，但仍存在严重问题，该批次数据不可用。';
    } else if (warningCount > 0) {
      status = 'warning';
      retestSuggestion = '温度曲线已补录。仍有部分警告项，建议核对后补做相应样品。';
    } else {
      retestSuggestion = '温度曲线已补录，无警告项，该批次可进入复盘。';
    }
    return {
      ...batch,
      hasTemperatureCurve: true,
      issues: otherIssues,
      retestSuggestion,
      status,
      lastUpdated: new Date().toISOString(),
    };
  }
  return batch;
}
