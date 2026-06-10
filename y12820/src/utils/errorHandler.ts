import { ActionableError, Sample, BarcodeConflict, QCRecord } from '../types';

export class ActionableErrorHandler {
  static createMissingRecordsError(missingSamples: Sample[]): ActionableError {
    return {
      errorCode: 'MISSING_RECORDS',
      title: '处理失败：缺少培养记录',
      description: '以下样本缺少必要的培养记录，无法继续分析：',
      missingItems: missingSamples.map(s => ({
        sampleId: s.id,
        sampleName: s.name,
        issue: `样本${s.barcode}的培养记录不完整`,
      })),
      nextSteps: [
        '联系检验科李老师补充上述记录',
        '补充后点击"重新处理"按钮',
        '紧急情况可勾选"跳过缺失记录继续（标记为待复核）"',
      ],
      contactInfo: {
        name: '李老师',
        role: '检验科主管',
      },
      canSkip: true,
      skipLabel: '跳过缺失记录继续（标记为待复核）',
    };
  }

  static createBarcodeConflictError(conflicts: BarcodeConflict[]): ActionableError {
    return {
      errorCode: 'BARCODE_CONFLICT',
      title: '发现重复条码',
      description: `检测到${conflicts.length}个重复条码，请先处理后再继续：`,
      missingItems: conflicts.map(c => ({
        sampleId: c.samples[0].id,
        sampleName: c.barcode,
        issue: `条码${c.barcode}存在${c.samples.length}条重复记录`,
      })),
      nextSteps: [
        '点击每条冲突记录查看详情',
        '选择保留策略（保留最新/保留最早/合并/全部作废）',
        '处理完成后重新运行分析',
      ],
      canSkip: false,
    };
  }

  static createQualityControlError(failedSamples: Sample[], qcRecords: QCRecord[]): ActionableError {
    return {
      errorCode: 'QC_FAILED',
      title: '质控未通过',
      description: `以下样本质控未通过，低质量读段过多：`,
      missingItems: failedSamples.map(s => {
        const qc = qcRecords.find(q => q.sampleId === s.id);
        return {
          sampleId: s.id,
          sampleName: s.name,
          issue: qc?.filterReasons.join('、') || '质控未通过',
        };
      }),
      nextSteps: [
        '检查低质量样本的原始数据',
        '考虑重新实验或人工复核',
        '确认无误后可手动标记为可用',
      ],
      contactInfo: {
        name: '王检验师',
        role: '质控负责人',
      },
      canSkip: true,
      skipLabel: '保留低质量样本（标记为待复核）',
    };
  }

  static createInsufficientDataError(controlCount: number, experimentalCount: number): ActionableError {
    return {
      errorCode: 'INSUFFICIENT_DATA',
      title: '样本量不足',
      description: '差异分析需要足够的样本量，请检查分组配置：',
      missingItems: [
        { sampleId: '', sampleName: '对照组', issue: `当前${controlCount}个样本，建议至少3个` },
        { sampleId: '', sampleName: '实验组', issue: `当前${experimentalCount}个样本，建议至少3个` },
      ],
      nextSteps: [
        '向对照组和实验组各添加至少3个样本',
        '检查样本分组是否正确',
        '确认后重新运行分析',
      ],
      canSkip: false,
    };
  }

  static formatForDisplay(error: ActionableError) {
    return {
      title: error.title,
      description: error.description,
      bulletPoints: error.missingItems.map(item =>
        item.sampleId
          ? `• ${item.sampleName}（${item.sampleId}）：${item.issue}`
          : `• ${item.sampleName}：${item.issue}`
      ),
      steps: error.nextSteps,
      primaryAction: {
        label: '返回修正',
        onClick: () => console.log('返回修正'),
      },
      secondaryAction: error.canSkip ? {
        label: error.skipLabel || '跳过继续',
        onClick: () => console.log('跳过继续'),
      } : undefined,
    };
  }
}
