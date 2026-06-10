import { Sample, QCRecord, QCThresholds, FilterResult, TraceNode, LearningStep, StudentSampleView, SampleStatus } from '../types';

export class LowQualityReadFilter {
  static DEFAULT_THRESHOLDS: QCThresholds = {
    minQcScore: 30,
    minReadQuality: 20,
    maxLowQualityRatio: 0.2,
  };

  static filterSample(
    sample: Sample,
    qcRecord: QCRecord,
    thresholds: QCThresholds = this.DEFAULT_THRESHOLDS
  ): FilterResult {
    const reasons: string[] = [];

    if (qcRecord.qcScore < thresholds.minQcScore) {
      reasons.push(`质控分数 ${qcRecord.qcScore.toFixed(1)} 低于阈值 ${thresholds.minQcScore}`);
    }

    if (qcRecord.readQuality < thresholds.minReadQuality) {
      reasons.push(`读段质量 ${qcRecord.readQuality.toFixed(1)} 低于阈值 ${thresholds.minReadQuality}`);
    }

    const lowQualityRatio = qcRecord.lowQualityReads / qcRecord.totalReads;
    if (lowQualityRatio > thresholds.maxLowQualityRatio) {
      reasons.push(`低质量读段占比 ${(lowQualityRatio * 100).toFixed(1)}% 超过阈值 ${(thresholds.maxLowQualityRatio * 100).toFixed(0)}%`);
    }

    const passed = reasons.length === 0;

    let suggestedAction = '数据质量合格';
    if (!passed) {
      if (reasons.length <= 1) {
        suggestedAction = '建议人工复核后决定是否使用';
      } else {
        suggestedAction = '建议标记为不可用或重新实验';
      }
    }

    return {
      passed,
      lowQualityReads: qcRecord.lowQualityReads,
      reasons,
      suggestedAction,
    };
  }

  static batchFilter(
    samples: Sample[],
    qcRecords: QCRecord[],
    thresholds?: QCThresholds
  ): Map<string, FilterResult> {
    const results = new Map<string, FilterResult>();

    samples.forEach(sample => {
      const qc = qcRecords.find(q => q.sampleId === sample.id);
      if (qc) {
        results.set(sample.id, this.filterSample(sample, qc, thresholds));
      }
    });

    return results;
  }
}

export class SourceTracingService {
  static buildTraceChain(
    sample: Sample,
    qcRecord?: QCRecord,
    corrections?: unknown[],
    analysisResult?: unknown
  ): TraceNode[] {
    const chain: TraceNode[] = [];

    chain.push({
      id: 'material',
      type: 'material',
      title: '原始材料',
      description: sample.material,
      operator: sample.collector,
      time: sample.collectionTime,
      metadata: {
        '样本条码': sample.barcode,
        '采集人员': sample.collector,
      },
    });

    chain.push({
      id: 'experiment',
      type: 'experiment',
      title: '实验记录',
      description: '叶绿素荧光测定实验',
      operator: qcRecord?.operator,
      time: qcRecord?.testTime,
      metadata: qcRecord ? {
        '使用设备': qcRecord.equipment,
        '材料来源': qcRecord.sourceMaterial,
      } : undefined,
    });

    chain.push({
      id: 'qc',
      type: 'qc',
      title: '质控过程',
      description: qcRecord?.conclusion || '待检测',
      operator: qcRecord?.operator,
      time: qcRecord?.testTime,
      metadata: qcRecord ? {
        '质控分数': `${qcRecord.qcScore.toFixed(1)}`,
        '读段质量': `${qcRecord.readQuality.toFixed(1)}`,
        '低质量读段': `${qcRecord.lowQualityReads}/${qcRecord.totalReads}`,
      } : undefined,
    });

    if (corrections && corrections.length > 0) {
      chain.push({
        id: 'correction',
        type: 'correction',
        title: '人工修正',
        description: `共 ${corrections.length} 条修正记录`,
        metadata: {
          '修正次数': String(corrections.length),
        },
      });
    }

    chain.push({
      id: 'analysis',
      type: 'analysis',
      title: '差异分析',
      description: analysisResult ? '已完成差异分析' : '待分析',
      metadata: analysisResult ? {
        '分析状态': '已完成',
      } : { '分析状态': '未执行' },
    });

    chain.push({
      id: 'conclusion',
      type: 'conclusion',
      title: '最终结论',
      description: sample.status === SampleStatus.AVAILABLE
        ? '数据可用，可直接用于分析'
        : sample.status === SampleStatus.REVIEWING
          ? '待检验师复核'
          : '数据不可用',
      metadata: {
        '样本状态': sample.status,
        '质量等级': sample.qualityLevel,
      },
    });

    return chain;
  }
}

export class StudentViewTransformer {
  static getStatusExplanation(status: SampleStatus): {
    icon: string;
    color: string;
    title: string;
    description: string;
  } {
    switch (status) {
      case SampleStatus.AVAILABLE:
        return {
          icon: '🟢',
          color: 'text-quality-green',
          title: '直接可用',
          description: '数据完整，质控通过，可直接用于实验分析和学习。',
        };
      case SampleStatus.REVIEWING:
        return {
          icon: '🟡',
          color: 'text-quality-yellow',
          title: '待复核',
          description: '存在备注冲突或数据异常，请联系检验师确认后再使用。',
        };
      case SampleStatus.INVALID:
        return {
          icon: '🔴',
          color: 'text-quality-red',
          title: '不可用',
          description: '条码重复或质控不合格，已标记作废，不可用于分析。',
        };
      default:
        return {
          icon: '⚪',
          color: 'text-gray-500',
          title: '未知',
          description: '状态未知，请检查数据。',
        };
    }
  }

  static transformSampleForStudent(
    sample: Sample,
    qcRecord?: QCRecord,
    notes?: { content: string; isConflict: boolean }[]
  ): StudentSampleView {
    const statusInfo = this.getStatusExplanation(sample.status);
    const reviewNotes: string[] = [];

    if (sample.invalidReason) {
      reviewNotes.push(sample.invalidReason);
    }

    if (notes) {
      notes.filter(n => n.isConflict).forEach(n => {
        reviewNotes.push(`备注冲突：${n.content}`);
      });
    }

    if (qcRecord?.isLowQuality) {
      reviewNotes.push(...qcRecord.filterReasons);
    }

    return {
      sample,
      statusInfo,
      canUseDirectly: sample.status === SampleStatus.AVAILABLE,
      needsReview: sample.status === SampleStatus.REVIEWING,
      reviewNotes,
      learningPath: this.buildLearningPath(sample, qcRecord),
    };
  }

  static buildLearningPath(sample: Sample, qcRecord?: QCRecord): LearningStep[] {
    const steps: LearningStep[] = [];

    steps.push({
      id: 'step1',
      title: '了解样本基本信息',
      description: `查看${sample.name}的材料来源、采集时间和采集人员。`,
      status: 'completed',
    });

    steps.push({
      id: 'step2',
      title: '检查质控结果',
      description: qcRecord
        ? `质控分数${qcRecord.qcScore.toFixed(1)}，${qcRecord.isLowQuality ? '存在低质量读段，需要了解原因' : '质控合格'}`
        : '查看质控报告，了解数据质量。',
      status: 'current',
    });

    steps.push({
      id: 'step3',
      title: '理解实验设计',
      description: '了解该样本属于对照组还是实验组，以及实验处理条件。',
      status: 'pending',
    });

    steps.push({
      id: 'step4',
      title: '分析差异结果',
      description: '查看火山图和热图，理解显著差异的生物学意义。',
      status: 'pending',
    });

    steps.push({
      id: 'step5',
      title: '追溯数据来源',
      description: '通过溯源链条了解从原材料到最终结论的完整过程。',
      status: 'pending',
    });

    return steps;
  }
}
