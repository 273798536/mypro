import type { Sample, ScoreRecord, Attachment, Conclusion, TimelineEvent } from '@/types';

export const checkSampleReferences = (
  sampleId: string,
  scoreRecords: ScoreRecord[],
  attachments: Attachment[],
  conclusions: Conclusion[]
): { complete: boolean; missing: string[] } => {
  const missing: string[] = [];
  const sampleScores = scoreRecords.filter(sr => sr.sampleId === sampleId);
  const sampleAttachments = attachments.filter(a => a.sampleId === sampleId);
  const sampleConclusion = conclusions.find(c => c.sampleId === sampleId);

  if (sampleScores.length === 0) {
    missing.push('缺少评分记录');
  }

  const latestScore = sampleScores[sampleScores.length - 1];
  if (latestScore && !latestScore.features) {
    missing.push('评分记录缺少特征明细');
  }

  if (sampleScores.length > 0 && !sampleConclusion) {
    missing.push('缺少最终结论');
  }

  if (sampleConclusion) {
    if (sampleConclusion.referencedAttachmentIds.length > 0) {
      sampleConclusion.referencedAttachmentIds.forEach(attId => {
        const att = sampleAttachments.find(a => a.id === attId);
        if (!att) {
          missing.push(`引用的附件不存在: ${attId}`);
        }
      });
    }

    if (sampleConclusion.referencedScoreIds.length > 0) {
      sampleConclusion.referencedScoreIds.forEach(scoreId => {
        const score = sampleScores.find(s => s.id === scoreId);
        if (!score) {
          missing.push(`引用的评分记录不存在: ${scoreId}`);
        }
      });
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
};

export const generateTimeline = (
  sampleId: string,
  sample: Sample | undefined,
  scoreRecords: ScoreRecord[],
  attachments: Attachment[],
  conclusions: Conclusion[]
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  if (!sample) return events;

  const sampleScores = scoreRecords.filter(sr => sr.sampleId === sampleId);
  const sampleAttachments = attachments.filter(a => a.sampleId === sampleId);
  const sampleConclusion = conclusions.find(c => c.sampleId === sampleId);

  if (sample.isSuspended) {
    events.push({
      id: `evt_suspend_${sampleId}`,
      type: 'suspend',
      date: '2025-06-15',
      operator: '系统自动检测',
      description: '样本已挂起',
      detail: sample.suspendReason,
      status: 'suspended',
    });
  }

  if (sampleConclusion) {
    events.push({
      id: `evt_conclusion_${sampleConclusion.id}`,
      type: 'conclusion',
      date: sampleConclusion.conclusionDate,
      operator: sampleConclusion.conclusionBy,
      description: sampleConclusion.finalResult === 'approve' ? '结论：批准' : 
                   sampleConclusion.finalResult === 'reject' ? '结论：拒绝' : '结论：挂起',
      detail: sampleConclusion.explanation,
      status: sampleConclusion.finalResult === 'approve' ? 'approved' : 
              sampleConclusion.finalResult === 'reject' ? 'rejected' : 'suspended',
    });
  }

  sampleAttachments.forEach(att => {
    events.push({
      id: `evt_att_${att.id}`,
      type: 'attachment',
      date: att.uploadDate,
      operator: att.uploadedBy,
      description: att.isLateArrival ? `【晚到附件】${att.name}` : `上传附件：${att.name}`,
      detail: att.description,
    });
  });

  sampleScores.forEach(score => {
    events.push({
      id: `evt_score_${score.id}`,
      type: 'score',
      date: score.scoreDate,
      operator: score.operator,
      description: `${score.modelName} 评分: ${score.score}分 (阈值: ${score.threshold}分)`,
      detail: score.note || `结果: ${score.result === 'pass' ? '通过' : '未通过'}`,
      status: score.result,
    });
  });

  if (sample.thresholdVersion === 'threshold_2025q2' && sampleScores.some(s => s.thresholdVersion !== 'threshold_2025q2')) {
    events.push({
      id: `evt_threshold_${sampleId}`,
      type: 'threshold_change',
      date: '2025-04-01',
      operator: '系统配置',
      description: '评分阈值调整：从≥620分调整为≥650分',
      detail: '2025Q2新阈值生效',
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const checkDataIntegrityStatus = (
  samples: Sample[]
): 'complete' | 'partial' | 'suspended' => {
  const suspendedCount = samples.filter(s => s.isSuspended).length;
  const incompleteCount = samples.filter(s => !s.referenceComplete).length;
  
  if (suspendedCount > 0) return 'suspended';
  if (incompleteCount > 0) return 'partial';
  return 'complete';
};
