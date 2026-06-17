import { Batch, Run, Sample, Cluster, Anomaly, Correction, ParamConfig } from '../types';
import { generateId } from '../utils';
import { parseSplitList, prepareSamplesForRun } from '../utils/parser';
import { runClustering } from '../utils/clustering';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

const sampleContents = [
  { content: '如何优化深度学习模型的训练速度？可以尝试使用混合精度训练、梯度累积等技术。', label: '深度学习', split: 'train' as const },
  { content: '患者体温38.5摄氏度，伴有咳嗽症状，初步诊断为上呼吸道感染。', label: '医疗', split: 'train' as const },
  { content: '请实现一个快速排序算法，要求时间复杂度为O(n log n)。', label: '算法', split: 'train' as const },
  { content: '机器学习中的过拟合问题可以通过正则化和数据增强来缓解。', label: '深度学习', split: 'train' as const },
  { content: '神经网络的反向传播算法是训练深度模型的核心。', label: '深度学习', split: 'train' as const },
  { content: 'Transformer架构使用自注意力机制实现并行计算。', label: '深度学习', split: 'train' as const },
  { content: '患者血压140/90mmHg，属于高血压范围，建议服用降压药。', label: '医疗', split: 'train' as const },
  { content: '二叉搜索树的查找时间复杂度为O(log n)。', label: '算法', split: 'train' as const },
  { content: '梯度下降算法是优化神经网络的常用方法。', label: '深度学习', split: 'train' as const },
  { content: '该患者血常规检查显示白细胞计数偏高。', label: '医疗', split: 'train' as const },
  { content: '动态规划可以用来解决最优子结构问题。', label: '算法', split: 'train' as const },
  { content: 'CNN卷积神经网络在图像识别领域表现出色。', label: '深度学习', split: 'val' as const },
  { content: '患者体温38.5摄氏度，伴有咳嗽症状，初步诊断为上呼吸道感染。', label: '医疗', split: 'val' as const },
  { content: '请实现一个快速排序算法，要求时间复杂度为O(n log n)。', label: '算法', split: 'val' as const },
  { content: 'BERT模型采用双向Transformer编码器。', label: '深度学习', split: 'val' as const },
  { content: '患者心电图显示窦性心律，心率正常。', label: '医疗', split: 'val' as const },
  { content: '图的深度优先搜索使用栈实现。', label: '算法', split: 'val' as const },
  { content: 'LSTM长短期记忆网络可以解决梯度消失问题。', label: '深度学习', split: 'val' as const },
  { content: '该药品每日服用三次，每次两片。', label: '医疗', split: 'val' as const },
  { content: '哈希表的平均查找时间复杂度为O(1)。', label: '算法', split: 'test' as const },
  { content: '机器学习中的过拟合问题可以通过正则化和数据增强来缓解。', label: '深度学习', split: 'test' as const },
  { content: '患者体温36.5摄氏度，各项指标正常。', label: '医疗', split: 'test' as const },
  { content: '递归算法的时间复杂度分析。', label: '算法', split: 'test' as const },
  { content: '注意力机制让模型可以关注输入的重要部分。', label: '深度学习', split: 'test' as const },
  { content: '请实现一个快速排序算法，要求时间复杂度为O(n log n)。', label: '算法', split: 'test' as const },
  { content: 'BP神经网络的训练过程包括前向传播和反向传播。', label: '深度学习', split: 'train' as const },
  { content: '患者体温38.5摄氏度，伴有咳嗽症状，初步诊断为上呼吸道感染。', label: '错误标签', split: 'train' as const },
  { content: '机器学习中的过拟合问题可以通过正则化和数据增强来缓解。', label: '错误标签', split: 'train' as const },
  { content: '神经网络的反向传播算法是训练深度模型的核心。', label: '错误标签', split: 'train' as const },
  { content: 'def hello_world():\n    print("Hello, World!")', label: '代码', split: 'train' as const },
  { content: '今天的天气很好，适合户外运动。', label: '其他', split: 'train' as const },
  { content: '该产品的用户满意度评分达到了4.8分（满分5分）。', label: '其他', split: 'train' as const },
  { content: 'a'.repeat(500), label: '异常长文本', split: 'train' as const },
];

function generateMockBatch(fileName: string, extraSamples: number = 0): Batch {
  const allContents = [...sampleContents];

  for (let i = 0; i < extraSamples; i++) {
    const base = sampleContents[i % sampleContents.length];
    allContents.push({
      ...base,
      content: base.content + ` [变体${i}]`,
      split: i % 10 < 7 ? 'train' : i % 10 < 9 ? 'val' : 'test'
    });
  }

  const jsonContent = JSON.stringify(allContents.map((s, i) => ({
    id: `mock_sample_${String(i + 1).padStart(5, '0')}`,
    content: s.content,
    label: s.label,
    split: s.split
  })), null, 2);

  const parsed = parseSplitList(fileName, jsonContent);

  return {
    id: generateId(),
    fingerprint: generateId(),
    name: fileName.replace(/\.[^.]+$/, ''),
    sourceFile: fileName,
    rawContent: jsonContent,
    parsedSamples: parsed.samples,
    importMetadata: parsed.metadata,
    createdAt: daysAgo(7),
    updatedAt: hoursAgo(2),
    runCount: 0,
    latestRunVersion: undefined
  };
}

export const MOCK_PARAM_CONFIG: ParamConfig = {
  eps: 0.5,
  minSamples: 3,
  distanceMetric: 'cosine',
  featureColumns: ['content', 'label']
};

export const MOCK_BATCHES: Batch[] = [
  generateMockBatch('split_list_2026Q2_v1.json', 20),
  generateMockBatch('medical_classification_split.json', 10),
  generateMockBatch('code_gen_train_split.jsonl', 5)
];

interface GeneratedMockData {
  batches: Batch[];
  runs: Run[];
  samples: Sample[];
  clusters: Cluster[];
  anomalies: Anomaly[];
  corrections: Correction[];
}

export function generateCompleteMockData(): GeneratedMockData {
  const batches = MOCK_BATCHES.map((b, batchIdx) => ({
    ...b,
    id: `batch_mock_${batchIdx + 1}`,
    createdAt: daysAgo(7 + batchIdx * 7),
    updatedAt: hoursAgo(2 + batchIdx * 24)
  }));

  const allRuns: Run[] = [];
  const allSamples: Sample[] = [];
  const allClusters: Cluster[] = [];
  const allAnomalies: Anomaly[] = [];
  const allCorrections: Correction[] = [];

  const operatorNames = ['张工程师', '李工程师', '王工程师', '赵工程师'];

  batches.forEach((batch, batchIdx) => {
    const runCount = batchIdx === 0 ? 3 : batchIdx === 1 ? 2 : 1;

    for (let v = 1; v <= runCount; v++) {
      const runId = `run_mock_${batchIdx + 1}_${v}`;
      const { samples, dedupStats, distributionStats } = prepareSamplesForRun(batch.parsedSamples, runId);
      const paramConfig = { ...MOCK_PARAM_CONFIG, eps: 0.4 + v * 0.1, minSamples: Math.max(2, 4 - v) };
      const { clusters, anomalies } = runClustering(samples, paramConfig, runId);

      const run: Run = {
        id: runId,
        batchId: batch.id,
        version: v,
        promptVersion: `v1.${v - 1}.0`,
        executedAt: hoursAgo(2 + (runCount - v) * 24 + batchIdx * 48),
        executedBy: operatorNames[(batchIdx + v) % operatorNames.length],
        dedupStats,
        distributionStats,
        paramConfig
      };

      allRuns.push(run);
      allSamples.push(...samples);
      allClusters.push(...clusters);
      allAnomalies.push(...anomalies);

      if (v === runCount) {
        batch.runCount = runCount;
        batch.latestRunVersion = runCount;

        anomalies.forEach((anomaly, aIdx) => {
          if (aIdx % 3 === 0) {
            const correction: Correction = {
              id: generateId(),
              sampleId: anomaly.sampleId,
              anomalyId: anomaly.id,
              runId,
              action: aIdx % 9 < 3 ? 'remove' : aIdx % 9 < 6 ? 'relabel' : 'keep',
              reason: aIdx % 9 < 3 ? '确认异常，从数据集中移除' : aIdx % 9 < 6 ? '标签标注错误，已修正' : '经复核为误报，保留原数据',
              operator: operatorNames[(aIdx + batchIdx) % operatorNames.length],
              correctedAt: hoursAgo(1 + aIdx * 0.5),
              note: aIdx % 9 < 3 ? '需要同步更新原始数据切分脚本' : ''
            };
            allCorrections.push(correction);

            const targetStatus = aIdx % 9 < 6 ? 'fixed' : 'rejected';
            anomaly.status = targetStatus;
          }
        });
      }
    }
  });

  return { batches, runs: allRuns, samples: allSamples, clusters: allClusters, anomalies: allAnomalies, corrections: allCorrections };
}

export const MOCK_DATA = generateCompleteMockData();

export const MOCK_RUNS = MOCK_DATA.runs;
export const MOCK_SAMPLES = MOCK_DATA.samples;
export const MOCK_CLUSTERS = MOCK_DATA.clusters;
export const MOCK_ANOMALIES = MOCK_DATA.anomalies;
export const MOCK_CORRECTIONS = MOCK_DATA.corrections;
