import {
  JudgmentRepository,
  FeatureSnapshotRepository,
  RunRepository,
  SampleRepository
} from './repositories';

export interface DecisionSuggestion {
  type: 'SUPPLEMENT' | 'RELEASE' | 'INVESTIGATE' | 'REPLAY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  target: string;
  target_id: string;
  title: string;
  detail: string;
  evidence: string[];
}

export interface RunSuggestions {
  run_id: string;
  run_name: string;
  summary: {
    total_suggestions: number;
    supplement_count: number;
    release_count: number;
    investigate_count: number;
    replay_count: number;
  };
  suggestions: DecisionSuggestion[];
}

export class DecisionEngine {
  static analyzeRun(runId: string): RunSuggestions {
    const run = RunRepository.get(runId);
    if (!run) throw new Error('Run not found');

    const judgments = JudgmentRepository.getByRun(runId);
    const snapshots = FeatureSnapshotRepository.getByRun(runId);
    const suggestions: DecisionSuggestion[] = [];

    snapshots.forEach(snap => {
      if (snap.metric_mismatch_reason && snap.metric_mismatch_reason.trim().length > 0) {
        suggestions.push({
          type: 'SUPPLEMENT',
          priority: 'HIGH',
          target: 'FEATURE_SNAPSHOT',
          target_id: snap.snapshot_id,
          title: `特征快照【${snap.name}】离线/线上口径不一致`,
          detail: `该特征快照的离线指标与线上口径存在差异，需要补充材料说明差异原因及影响。`,
          evidence: [
            `特征: ${snap.name} (v${snap.version})`,
            `差异说明: ${snap.metric_mismatch_reason}`,
            `离线指标: ${snap.offline_metric_json || '未记录'}`,
            `线上指标: ${snap.online_metric_json || '未记录'}`
          ]
        });
      }
    });

    snapshots.forEach(snap => {
      const notes = FeatureSnapshotRepository.getNotes(snap.snapshot_id);
      if (snap.is_temporary && notes.length === 0) {
        suggestions.push({
          type: 'SUPPLEMENT',
          priority: 'HIGH',
          target: 'SNAPSHOT_NOTE',
          target_id: snap.snapshot_id,
          title: `临时特征快照【${snap.name}】缺少备注`,
          detail: `这是彩排进场前临时补充的特征快照，必须添加备注说明它改变了哪些判断。`,
          evidence: [
            `特征快照: ${snap.name} (${snap.snapshot_id})`,
            `类型: 临时快照`,
            `创建人: ${snap.created_by}`,
            `创建时间: ${snap.created_at}`
          ]
        });
      }
    });

    const replaySamples = judgments.filter(j => {
      const sample = SampleRepository.get(j.sample_id);
      return sample?.is_replay === 1;
    });

    replaySamples.forEach(j => {
      const sample = SampleRepository.get(j.sample_id)!;
      const isChanged = sample.original_model_label !== j.model_label ||
                        (sample.original_run_id && this._checkDecisionChanged(sample.original_run_id, j.sample_id, j.final_decision));
      if (isChanged) {
        suggestions.push({
          type: 'INVESTIGATE',
          priority: 'MEDIUM',
          target: 'SAMPLE_REPLAY',
          target_id: j.sample_id,
          title: `回放样本【${j.sample_id}】发生改判`,
          detail: `该样本是旧模型的误判样本，放回后结果发生变化，请确认改判原因是否合理。`,
          evidence: [
            `样本ID: ${j.sample_id}`,
            `原始标注: ${sample.ground_truth_label}`,
            `旧模型输出: ${sample.original_model_label || '未知'}`,
            `新模型输出: ${j.model_label}`,
            `当前最终判定: ${j.final_decision}`,
            `判定理由: ${j.decision_reason || '未填写'}`
          ]
        });
      } else {
        suggestions.push({
          type: 'RELEASE',
          priority: 'LOW',
          target: 'SAMPLE_REPLAY',
          target_id: j.sample_id,
          title: `回放样本【${j.sample_id}】判定一致，可放行`,
          detail: `回放样本的判定结果与之前一致，符合预期，可以放行。`,
          evidence: [
            `样本ID: ${j.sample_id}`,
            `最终判定: ${j.final_decision}`
          ]
        });
      }
    });

    const modifiedJudgments = judgments.filter(j => j.is_modified === 1);
    modifiedJudgments.forEach(j => {
      const history = JudgmentRepository.getHistory(j.run_id, j.sample_id);
      if (history.length > 0 && !j.decision_reason) {
        suggestions.push({
          type: 'SUPPLEMENT',
          priority: 'MEDIUM',
          target: 'JUDGMENT_REASON',
          target_id: `${j.run_id}__${j.sample_id}`,
          title: `样本【${j.sample_id}】人工改判但未填写理由`,
          detail: `评测工程师修改了该样本的判定，但未补充修改理由，需要补全。`,
          evidence: [
            `样本ID: ${j.sample_id}`,
            `当前判定: ${j.final_decision}`,
            `判定人: ${j.judged_by}`,
            `历史修改次数: ${history.length}`
          ]
        });
      }
    });

    judgments.forEach(j => {
      const sample = SampleRepository.get(j.sample_id);
      if (!j.decision_reason || j.decision_reason.trim().length === 0) {
        suggestions.push({
          type: 'SUPPLEMENT',
          priority: sample?.ground_truth_label === j.final_decision ? 'LOW' : 'MEDIUM',
          target: 'JUDGMENT_REASON',
          target_id: `${j.run_id}__${j.sample_id}`,
          title: `样本【${j.sample_id}】缺少判定理由`,
          detail: `该样本的最终判定未填写理由，建议补充说明。`,
          evidence: [
            `样本ID: ${j.sample_id}`,
            `模型输出: ${j.model_label} (置信度: ${(j.confidence * 100).toFixed(1)}%)`,
            `最终判定: ${j.final_decision}`,
            `标注真值: ${sample?.ground_truth_label || '未知'}`
          ]
        });
      }
    });

    const correctJudgments = judgments.filter(j => {
      const sample = SampleRepository.get(j.sample_id);
      return sample && sample.ground_truth_label === j.final_decision && j.decision_reason;
    });
    correctJudgments.slice(0, 20).forEach(j => {
      suggestions.push({
        type: 'RELEASE',
        priority: 'LOW',
        target: 'JUDGMENT',
        target_id: `${j.run_id}__${j.sample_id}`,
        title: `样本【${j.sample_id}】材料齐全，可放行`,
        detail: `该样本判定正确且理由充分，可以放行。`,
        evidence: [
          `样本ID: ${j.sample_id}`,
          `最终判定: ${j.final_decision}`,
          `判定理由: ${j.decision_reason!.substring(0, 60)}${j.decision_reason!.length > 60 ? '...' : ''}`
        ]
      });
    });

    const lowConfidence = judgments.filter(j => j.confidence < 0.6);
    lowConfidence.forEach(j => {
      suggestions.push({
        type: 'INVESTIGATE',
        priority: 'MEDIUM',
        target: 'JUDGMENT',
        target_id: `${j.run_id}__${j.sample_id}`,
        title: `样本【${j.sample_id}】模型置信度过低`,
        detail: `模型对该样本的输出置信度低于60%，建议人工复核并补充相关特征。`,
        evidence: [
          `样本ID: ${j.sample_id}`,
          `模型输出: ${j.model_label}`,
          `置信度: ${(j.confidence * 100).toFixed(1)}%`,
          `当前判定: ${j.final_decision}`
        ]
      });
    });

    suggestions.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      run_id: run.run_id,
      run_name: run.name,
      summary: {
        total_suggestions: suggestions.length,
        supplement_count: suggestions.filter(s => s.type === 'SUPPLEMENT').length,
        release_count: suggestions.filter(s => s.type === 'RELEASE').length,
        investigate_count: suggestions.filter(s => s.type === 'INVESTIGATE').length,
        replay_count: suggestions.filter(s => s.type === 'REPLAY').length
      },
      suggestions
    };
  }

  private static _checkDecisionChanged(originalRunId: string, sampleId: string, currentDecision: string): boolean {
    try {
      const originalJudgments = JudgmentRepository.getByRun(originalRunId);
      const orig = originalJudgments.find(j => j.sample_id === sampleId);
      if (orig) return orig.final_decision !== currentDecision;
    } catch (_) {
    }
    return false;
  }
}
