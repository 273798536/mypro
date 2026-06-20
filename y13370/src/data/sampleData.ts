import type {
  ModelVersion, TrainingTask, FailureLog, SampleRecord,
  ManualCorrection, PublicNote, TimelineEvent, LateFeature, EventType
} from '@/types';
import { hashObject, hashString } from '@/utils/hash';

export const mockVersions: ModelVersion[] = [
  {
    id: 'ver_v241',
    versionCode: 'v2.4.1',
    releaseTime: '2026-06-18T10:00:00Z',
    thresholdConfig: { confidence: 0.78, coverage: 0.85, novelty: 0.62, riskScore: 0.45 },
    metrics: { precision: 0.912, recall: 0.885, f1: 0.898, auc: 0.956 },
    prevVersionId: 'ver_v240'
  },
  {
    id: 'ver_v240',
    versionCode: 'v2.4.0',
    releaseTime: '2026-06-10T14:30:00Z',
    thresholdConfig: { confidence: 0.80, coverage: 0.82, novelty: 0.60, riskScore: 0.50 },
    metrics: { precision: 0.895, recall: 0.870, f1: 0.882, auc: 0.948 },
    prevVersionId: 'ver_v239'
  }
];

export const mockTasks: TrainingTask[] = [
  { id: 'task_001', taskName: 'ranker-batch-2026-0618-A', versionId: 'ver_v241', status: 'failed', startTime: '2026-06-18T11:20:00Z', endTime: '2026-06-18T11:48:22Z', sampleBatchId: 'batch_S240618_01' },
  { id: 'task_002', taskName: 'ranker-batch-2026-0618-B', versionId: 'ver_v241', status: 'partial', startTime: '2026-06-18T11:50:00Z', endTime: '2026-06-18T12:15:10Z', sampleBatchId: 'batch_S240618_02' },
  { id: 'task_003', taskName: 'ranker-batch-2026-0618-C', versionId: 'ver_v241', status: 'failed', startTime: '2026-06-18T12:20:00Z', endTime: '2026-06-18T12:41:05Z', sampleBatchId: 'batch_S240618_03' },
  { id: 'task_004', taskName: 'critic-online-2026-0618', versionId: 'ver_v241', status: 'failed', startTime: '2026-06-18T13:05:00Z', endTime: '2026-06-18T13:08:30Z', sampleBatchId: 'batch_S240618_04' },
  { id: 'task_005', taskName: 'ranker-batch-2026-0617-A', versionId: 'ver_v240', status: 'success', startTime: '2026-06-17T09:00:00Z', endTime: '2026-06-17T09:45:00Z', sampleBatchId: 'batch_S240617_01' },
  { id: 'task_006', taskName: 'ranker-batch-2026-0617-B', versionId: 'ver_v240', status: 'failed', startTime: '2026-06-17T10:00:00Z', endTime: '2026-06-17T10:38:15Z', sampleBatchId: 'batch_S240617_02' }
];

export const mockFailureLogs: FailureLog[] = [
  {
    id: 'log_101', taskId: 'task_001', level: 'critical',
    message: '样本特征 user_click_7d 缺失率超过阈值 15% (实际 18.3%)',
    occurTime: '2026-06-18T11:35:12Z',
    stackTrace: 'at FeatureValidator.checkMissing (/opt/ranker/validators.py:42)\n→ 批次 batch_S240618_01 共 128340 样本受影响',
    relatedSampleIds: ['S240618_01_0001', 'S240618_01_0002', 'S240618_01_0003']
  },
  {
    id: 'log_102', taskId: 'task_002', level: 'error',
    message: '级联异常：特征 user_profile_tag 维度膨胀导致下游 shuffle OOM',
    occurTime: '2026-06-18T12:02:45Z',
    stackTrace: 'at ShuffleStage.run (/opt/ranker/pipeline.py:187)\n→ 内存使用峰值 31.2G / 32G 容器限制',
    relatedSampleIds: ['S240618_02_0108', 'S240618_02_0109']
  },
  {
    id: 'log_103', taskId: 'task_003', level: 'critical',
    message: '特征迟到告警：feature_item_history_30d 延迟 47 分钟到达，已揉入前一批次训练',
    occurTime: '2026-06-18T12:30:20Z',
    stackTrace: 'at FeatureArrivalGuard.monitor (/opt/ranker/guard.py:76)\n→ 原定批次 batch_S240618_02 / 实际批次 batch_S240618_03',
    relatedSampleIds: ['S240618_03_0050']
  },
  {
    id: 'log_104', taskId: 'task_004', level: 'error',
    message: '模型加载异常：checkpoint v2.4.1 权重文件 sha1 校验失败',
    occurTime: '2026-06-18T13:07:08Z',
    stackTrace: 'at ModelLoader.verifyChecksum (/opt/ranker/loader.py:91)\n→ 期望 a1b2c3d4e5 / 实际 f6g7h8i9j0',
    relatedSampleIds: []
  },
  {
    id: 'log_105', taskId: 'task_006', level: 'warning',
    message: '阈值 confidence=0.80 下误判样本 42 条，人工复核需介入',
    occurTime: '2026-06-17T10:28:30Z',
    stackTrace: 'at ThresholdEvaluator.report (/opt/ranker/eval.py:155)',
    relatedSampleIds: ['S240617_02_0201', 'S240617_02_0202']
  }
];

export const mockSamples: SampleRecord[] = [
  { id: 's_01', batchId: 'batch_S240618_01', count: 512800, source: 'impression_log', ingestTime: '2026-06-18T10:30:00Z', versionId: 'ver_v241',
    distribution: { positive: 0.12, negative: 0.75, neutral: 0.13 } },
  { id: 's_02', batchId: 'batch_S240618_02', count: 498320, source: 'impression_log', ingestTime: '2026-06-18T10:45:00Z', versionId: 'ver_v241',
    distribution: { positive: 0.11, negative: 0.76, neutral: 0.13 } },
  { id: 's_03', batchId: 'batch_S240618_03', count: 521150, source: 'impression_log', ingestTime: '2026-06-18T11:00:00Z', versionId: 'ver_v241',
    distribution: { positive: 0.13, negative: 0.74, neutral: 0.13 } },
  { id: 's_04', batchId: 'batch_S240617_01', count: 489210, source: 'impression_log', ingestTime: '2026-06-17T08:00:00Z', versionId: 'ver_v240',
    distribution: { positive: 0.10, negative: 0.77, neutral: 0.13 } },
  { id: 's_05', batchId: 'batch_S240617_02', count: 505600, source: 'impression_log', ingestTime: '2026-06-17T09:00:00Z', versionId: 'ver_v240',
    distribution: { positive: 0.11, negative: 0.76, neutral: 0.13 } }
];

export const mockCorrections: ManualCorrection[] = [
  {
    id: 'cor_01', groupId: 'grp_1', operator: '阿岑',
    originalJudgment: '缺失特征直接丢弃该样本批次',
    newJudgment: '采用上一小时特征均值填充后继续训练，标记待复核',
    createTime: '2026-06-18T11:55:00Z',
    reason: '用户侧 AB 实验窗口紧张，需避免整体流水线延后超 30 分钟'
  },
  {
    id: 'cor_02', groupId: 'grp_2', operator: '阿岑',
    originalJudgment: 'OOM 失败不影响前序批次结果',
    newJudgment: 'OOM 阶段 2412 条中间态样本梯度已污染，需从最终 checkpoint 中剔除',
    createTime: '2026-06-18T12:20:00Z',
    reason: '复盘发现 shuffle 过程中部分样本已完成梯度累加，影响后序阈值可信度'
  }
];

export const mockPublicNotes: PublicNote[] = [
  {
    id: 'note_01', groupId: 'grp_1', operator: '阿岑',
    content: '社区公示前补充说明：batch_S240618_01 批次 18.3% 特征缺失的填充决策。',
    changedJudgments: [
      '精度结论：v2.4.1 离线 AUC 0.956 中，约 0.004 来源于填充特征贡献，已单独标注',
      '发布节奏：由"无风险全量"调整为"灰度 10% 观察 12h"，观察指标覆盖填充特征样本集'
    ],
    createTime: '2026-06-18T16:42:00Z'
  }
];

function genEvent(id: string, type: EventType, refId: string, title: string, desc: string, time: string, consistent: boolean): TimelineEvent {
  const base = { id, eventType: type, refId, title, description: desc, eventTime: time, metadata: {} };
  const fh = hashObject(base);
  const ph = consistent ? fh : hashString(fh + '_drift_' + id);
  return { ...base, fileStatusHash: fh, pageStatusHash: ph, isConsistent: consistent ? 'consistent' : 'inconsistent' };
}

export const mockTimeline: TimelineEvent[] = [
  genEvent('ev_01', 'sample', 's_01', '样本批次入库 batch_S240618_01', '512,800 条样本来源 impression_log', '2026-06-18T10:30:00Z', true),
  genEvent('ev_02', 'sample', 's_02', '样本批次入库 batch_S240618_02', '498,320 条样本', '2026-06-18T10:45:00Z', true),
  genEvent('ev_03', 'version', 'ver_v241', '版本 v2.4.1 发布', 'confidence=0.78, coverage=0.85', '2026-06-18T10:00:00Z', true),
  genEvent('ev_04', 'sample', 's_03', '样本批次入库 batch_S240618_03', '521,150 条样本', '2026-06-18T11:00:00Z', true),
  genEvent('ev_05', 'failure', 'log_101', '特征缺失率超过阈值', 'user_click_7d 缺失 18.3%', '2026-06-18T11:35:12Z', true),
  genEvent('ev_06', 'correction', 'cor_01', '人工修正：填充后继续训练', '上一小时均值填充，标记待复核', '2026-06-18T11:55:00Z', true),
  genEvent('ev_07', 'failure', 'log_102', 'OOM 中断', 'user_profile_tag 维度膨胀', '2026-06-18T12:02:45Z', true),
  genEvent('ev_08', 'correction', 'cor_02', '人工修正：剔除污染梯度', '2412 条中间态样本梯度剔除', '2026-06-18T12:20:00Z', true),
  genEvent('ev_09', 'feature', 'lf_01', '特征迟到 item_history_30d', '延迟 47 分钟到达', '2026-06-18T12:30:20Z', false),
  genEvent('ev_10', 'failure', 'log_104', 'checksum 校验失败', '权重文件 sha1 不符', '2026-06-18T13:07:08Z', true),
  genEvent('ev_11', 'threshold', 'ver_v241', '阈值调整 confidence', '0.80 → 0.78', '2026-06-18T09:50:00Z', true),
  genEvent('ev_12', 'metric', 'ver_v241', 'v2.4.1 指标发布', 'precision=0.912, recall=0.885, f1=0.898, auc=0.956', '2026-06-18T14:10:00Z', true),
  genEvent('ev_13', 'failure', 'note_01', '社区公示备注补录', '填充决策对精度和灰度的影响说明', '2026-06-18T16:42:00Z', true),
  genEvent('ev_14', 'version', 'ver_v240', '版本 v2.4.0 发布', 'confidence=0.80, coverage=0.82', '2026-06-10T14:30:00Z', true),
  genEvent('ev_15', 'metric', 'ver_v240', 'v2.4.0 指标发布', 'precision=0.895, recall=0.870, f1=0.882, auc=0.948', '2026-06-11T09:20:00Z', true)
];

export const mockLateFeatures: LateFeature[] = [
  {
    id: 'lf_01', featureName: 'item_history_30d',
    delaySeconds: 2820, originalBatchId: 'batch_S240618_02', actualBatchId: 'batch_S240618_03',
    taskId: 'task_003', mixedInNormal: true, riskLevel: 'high',
    occurTime: '2026-06-18T12:30:20Z',
    impactDescription: '迟到特征被揉入 batch_S240618_03 的正常训练集，导致 AUC 虚高约 +0.003，运营主管标记隔离复查。'
  },
  {
    id: 'lf_02', featureName: 'user_session_len_1h',
    delaySeconds: 840, originalBatchId: 'batch_S240618_01', actualBatchId: 'batch_S240618_01',
    taskId: 'task_001', mixedInNormal: false, riskLevel: 'low',
    occurTime: '2026-06-18T11:15:00Z',
    impactDescription: '特征在批次内延迟但未跨批次，仅影响本批次 5% 的训练样本，已由管线自动补位处理。'
  },
  {
    id: 'lf_03', featureName: 'ctr_real_time_5m',
    delaySeconds: 1560, originalBatchId: 'batch_S240617_02', actualBatchId: 'batch_S240617_02',
    taskId: 'task_006', mixedInNormal: true, riskLevel: 'medium',
    occurTime: '2026-06-17T10:12:00Z',
    impactDescription: '实时 CTR 序列 26 分钟延迟，被揉入 v2.4.0 训练集，precision 波动 0.004，已在时间线备注。'
  },
  {
    id: 'lf_04', featureName: 'author_rank_7d',
    delaySeconds: 420, originalBatchId: 'batch_S240618_02', actualBatchId: 'batch_S240618_02',
    taskId: 'task_002', mixedInNormal: false, riskLevel: 'low',
    occurTime: '2026-06-18T11:58:00Z',
    impactDescription: '作者榜单特征 7 分钟延迟，与同一批次样本在 shuffle 前补齐，无跨批次污染。'
  }
];
