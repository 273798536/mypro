import { Batch, Run, Sample, Cluster, Anomaly, Correction, ParamConfig } from '../types';
import { ANOMALY_TYPE_MAPPING } from '../constants';
import { generateId } from '../utils';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

export const MOCK_BATCHES: Batch[] = [
  {
    id: 'batch_001',
    fingerprint: 'a1b2c3d4e5f6',
    name: '对话数据_2026Q2_v1',
    sourceFile: 'split_list_2026Q2_v1.json',
    createdAt: daysAgo(7),
    updatedAt: hoursAgo(2),
    runCount: 3,
    latestRunVersion: 3
  },
  {
    id: 'batch_002',
    fingerprint: 'f6e5d4c3b2a1',
    name: '分类任务_医疗数据',
    sourceFile: 'medical_classification_split.csv',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(3),
    runCount: 2,
    latestRunVersion: 2
  },
  {
    id: 'batch_003',
    fingerprint: '1a2b3c4d5e6f',
    name: '代码生成训练集',
    sourceFile: 'code_gen_train_split.jsonl',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(10),
    runCount: 1,
    latestRunVersion: 1
  }
];

export const MOCK_PARAM_CONFIG: ParamConfig = {
  eps: 0.5,
  minSamples: 5,
  distanceMetric: 'cosine',
  featureColumns: ['text_embedding', 'label']
};

export const MOCK_RUNS: Run[] = [
  {
    id: 'run_001',
    batchId: 'batch_001',
    version: 1,
    promptVersion: 'v1.0.0',
    executedAt: daysAgo(6),
    executedBy: '张工程师',
    dedupStats: { totalSamples: 10000, uniqueSamples: 9650, duplicateSamples: 350, duplicateGroups: 120 },
    distributionStats: { trainSplit: 7000, valSplit: 2000, testSplit: 1000, byLabel: { '类别A': 3500, '类别B': 4000, '类别C': 2500 } },
    paramConfig: { ...MOCK_PARAM_CONFIG, eps: 0.6 }
  },
  {
    id: 'run_002',
    batchId: 'batch_001',
    version: 2,
    promptVersion: 'v1.1.0',
    executedAt: daysAgo(2),
    executedBy: '李工程师',
    dedupStats: { totalSamples: 10000, uniqueSamples: 9650, duplicateSamples: 350, duplicateGroups: 120 },
    distributionStats: { trainSplit: 7000, valSplit: 2000, testSplit: 1000, byLabel: { '类别A': 3500, '类别B': 4000, '类别C': 2500 } },
    paramConfig: { ...MOCK_PARAM_CONFIG, minSamples: 3 }
  },
  {
    id: 'run_003',
    batchId: 'batch_001',
    version: 3,
    promptVersion: 'v1.2.0',
    executedAt: hoursAgo(2),
    executedBy: '王工程师',
    dedupStats: { totalSamples: 10000, uniqueSamples: 9650, duplicateSamples: 350, duplicateGroups: 120 },
    distributionStats: { trainSplit: 7000, valSplit: 2000, testSplit: 1000, byLabel: { '类别A': 3500, '类别B': 4000, '类别C': 2500 } },
    paramConfig: MOCK_PARAM_CONFIG
  },
  {
    id: 'run_004',
    batchId: 'batch_002',
    version: 1,
    promptVersion: 'v1.0.0',
    executedAt: daysAgo(14),
    executedBy: '张工程师',
    dedupStats: { totalSamples: 5000, uniqueSamples: 4920, duplicateSamples: 80, duplicateGroups: 25 },
    distributionStats: { trainSplit: 3500, valSplit: 1000, testSplit: 500, byLabel: { '阳性': 2600, '阴性': 2400 } },
    paramConfig: MOCK_PARAM_CONFIG
  },
  {
    id: 'run_005',
    batchId: 'batch_002',
    version: 2,
    promptVersion: 'v1.2.0',
    executedAt: daysAgo(3),
    executedBy: '李工程师',
    dedupStats: { totalSamples: 5000, uniqueSamples: 4920, duplicateSamples: 80, duplicateGroups: 25 },
    distributionStats: { trainSplit: 3500, valSplit: 1000, testSplit: 500, byLabel: { '阳性': 2600, '阴性': 2400 } },
    paramConfig: MOCK_PARAM_CONFIG
  },
  {
    id: 'run_006',
    batchId: 'batch_003',
    version: 1,
    promptVersion: 'v1.0.0',
    executedAt: daysAgo(30),
    executedBy: '王工程师',
    dedupStats: { totalSamples: 20000, uniqueSamples: 19800, duplicateSamples: 200, duplicateGroups: 60 },
    distributionStats: { trainSplit: 14000, valSplit: 4000, testSplit: 2000, byLabel: { 'Python': 8000, 'JavaScript': 6000, 'Java': 4000, '其他': 2000 } },
    paramConfig: MOCK_PARAM_CONFIG
  }
];

const sampleContents = [
  '如何优化深度学习模型的训练速度？可以尝试使用混合精度训练、梯度累积等技术。',
  '患者体温38.5摄氏度，伴有咳嗽症状，初步诊断为上呼吸道感染。',
  '请实现一个快速排序算法，要求时间复杂度为O(n log n)。',
  '今天的天气很好，适合户外运动。',
  '机器学习中的过拟合问题可以通过正则化和数据增强来缓解。',
  'def hello_world():\n    print("Hello, World!")',
  '神经网络的反向传播算法是训练深度模型的核心。',
  '该产品的用户满意度评分达到了4.8分（满分5分）。'
];

function generateSamples(runId: string, count: number): Sample[] {
  const splits: ('train' | 'val' | 'test')[] = ['train', 'val', 'test'];
  const samples: Sample[] = [];
  for (let i = 0; i < count; i++) {
    samples.push({
      id: generateId(),
      runId,
      originalId: `sample_${String(i + 1).padStart(5, '0')}`,
      content: sampleContents[i % sampleContents.length],
      sourceSplit: splits[i % 3],
      isDuplicate: i % 25 === 0,
      duplicateGroupId: i % 25 === 0 ? `dup_group_${Math.floor(i / 25)}` : undefined,
      clusterId: i % 10 < 3 ? `cluster_${runId}_${Math.floor(i / 30)}` : undefined,
      rawData: { index: i, embedding: Array(128).fill(0).map(() => Math.random()) }
    });
  }
  return samples;
}

export const MOCK_SAMPLES: Sample[] = [
  ...generateSamples('run_003', 50),
  ...generateSamples('run_002', 30),
  ...generateSamples('run_005', 20)
];

export const MOCK_CLUSTERS: Cluster[] = [
  {
    id: 'cluster_run_003_0',
    runId: 'run_003',
    name: '训练验证泄漏组#001',
    anomalyType: 'train_val_leakage',
    sampleCount: 23,
    severityScore: 0.92,
    metrics: { leakageRatio: 0.0033, overlapCount: 23 }
  },
  {
    id: 'cluster_run_003_1',
    runId: 'run_003',
    name: '重复样本聚簇#002',
    anomalyType: 'duplicate_cluster',
    sampleCount: 45,
    severityScore: 0.71,
    metrics: { duplicateCount: 45 }
  },
  {
    id: 'cluster_run_003_2',
    runId: 'run_003',
    name: '标签噪声组#003',
    anomalyType: 'label_noise',
    sampleCount: 12,
    severityScore: 0.65,
    metrics: { noiseCount: 12, precision: 0.87 }
  },
  {
    id: 'cluster_run_003_3',
    runId: 'run_003',
    name: '分布偏移#004',
    anomalyType: 'distribution_shift',
    sampleCount: 8,
    severityScore: 0.58,
    metrics: { feature: '文本长度分布', diff: 0.32 }
  },
  {
    id: 'cluster_run_002_0',
    runId: 'run_002',
    name: '训练验证泄漏组#001',
    anomalyType: 'train_val_leakage',
    sampleCount: 31,
    severityScore: 0.88,
    metrics: { leakageRatio: 0.0044, overlapCount: 31 }
  },
  {
    id: 'cluster_run_002_1',
    runId: 'run_002',
    name: '重复样本聚簇#002',
    anomalyType: 'duplicate_cluster',
    sampleCount: 52,
    severityScore: 0.68,
    metrics: { duplicateCount: 52 }
  },
  {
    id: 'cluster_run_005_0',
    runId: 'run_005',
    name: '标签噪声组#001',
    anomalyType: 'label_noise',
    sampleCount: 8,
    severityScore: 0.74,
    metrics: { noiseCount: 8 }
  }
];

function generateAnomalies(runId: string, batchId: string, clusters: Cluster[], samples: Sample[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const runClusters = clusters.filter(c => c.runId === runId);
  const runSamples = samples.filter(s => s.runId === runId && s.clusterId);

  runClusters.forEach(cluster => {
    const clusterSamples = runSamples.filter(s => s.clusterId === cluster.id);
    const typeInfo = ANOMALY_TYPE_MAPPING[cluster.anomalyType];

    clusterSamples.slice(0, 5).forEach((sample, idx) => {
      anomalies.push({
        id: generateId(),
        clusterId: cluster.id,
        sampleId: sample.id,
        runId,
        batchId,
        title: `${typeInfo.title} - 样本#${idx + 1}`,
        description: `样本 ${sample.originalId} 检测到${typeInfo.title}，严重程度：${Math.round(cluster.severityScore * 100)}%`,
        friendlyDescription: typeInfo.description(cluster.metrics),
        status: idx === 0 ? 'fixed' : idx === 1 ? 'confirmed' : idx === 2 ? 'rejected' : 'pending',
        metadata: { originalSample: sample.originalId, clusterName: cluster.name }
      });
    });
  });

  return anomalies;
}

export const MOCK_ANOMALIES: Anomaly[] = [
  ...generateAnomalies('run_003', 'batch_001', MOCK_CLUSTERS, MOCK_SAMPLES),
  ...generateAnomalies('run_002', 'batch_001', MOCK_CLUSTERS, MOCK_SAMPLES),
  ...generateAnomalies('run_005', 'batch_002', MOCK_CLUSTERS, MOCK_SAMPLES)
];

export const MOCK_CORRECTIONS: Correction[] = MOCK_ANOMALIES
  .filter(a => a.status !== 'pending')
  .map((anomaly, idx) => ({
    id: generateId(),
    sampleId: anomaly.sampleId,
    anomalyId: anomaly.id,
    runId: anomaly.runId,
    action: anomaly.status === 'fixed' ? 'remove' : anomaly.status === 'confirmed' ? 'relabel' : 'keep',
    reason: anomaly.status === 'fixed' ? '确认样本同时出现在训练集和验证集中，从验证集移除' : anomaly.status === 'confirmed' ? '标签标注错误，已重新标注正确类别' : '经复核为误报，样本实际无异常',
    operator: idx % 2 === 0 ? '张工程师' : '李工程师',
    correctedAt: hoursAgo(idx + 1),
    note: anomaly.status === 'fixed' ? '需要同步更新原始数据切分脚本' : ''
  }));
