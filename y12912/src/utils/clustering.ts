import { Sample, Cluster, Anomaly, AnomalyType, ParamConfig, AnomalyStatus } from '../types';
import { generateId } from './index';
import { ANOMALY_TYPE_MAPPING } from '../constants';

export interface ClusteringResult {
  clusters: Cluster[];
  anomalies: Anomaly[];
  stats: {
    totalClusters: number;
    totalAnomalies: number;
    byType: Record<AnomalyType, number>;
    avgSeverity: number;
  };
}

export function runClustering(
  samples: Sample[],
  params: ParamConfig,
  runId: string
): ClusteringResult {
  const clusters: Cluster[] = [];
  const anomalies: Anomaly[] = [];
  const byType: Record<AnomalyType, number> = {
    train_val_leakage: 0,
    duplicate_samples: 0,
    label_noise: 0,
    distribution_shift: 0,
    outlier: 0
  };

  const trainSamples = samples.filter(s => s.sourceSplit === 'train');
  const valSamples = samples.filter(s => s.sourceSplit === 'val');
  const testSamples = samples.filter(s => s.sourceSplit === 'test');

  const leakageResult = detectTrainValLeakage(trainSamples, valSamples, testSamples, runId, params);
  clusters.push(...leakageResult.clusters);
  anomalies.push(...leakageResult.anomalies);
  byType.train_val_leakage = leakageResult.anomalies.length;

  const dupResult = detectDuplicateSamples(samples, runId, params);
  clusters.push(...dupResult.clusters);
  anomalies.push(...dupResult.anomalies);
  byType.duplicate_samples = dupResult.anomalies.length;

  const noiseResult = detectLabelNoise(samples, runId, params);
  clusters.push(...noiseResult.clusters);
  anomalies.push(...noiseResult.anomalies);
  byType.label_noise = noiseResult.anomalies.length;

  const shiftResult = detectDistributionShift(trainSamples, valSamples, samples, runId, params);
  clusters.push(...shiftResult.clusters);
  anomalies.push(...shiftResult.anomalies);
  byType.distribution_shift = shiftResult.anomalies.length;

  const outlierResult = detectOutliers(samples, runId, params);
  clusters.push(...outlierResult.clusters);
  anomalies.push(...outlierResult.anomalies);
  byType.outlier = outlierResult.anomalies.length;

  const totalAnomalies = anomalies.length;
  const avgSeverity = totalAnomalies > 0
    ? anomalies.reduce((sum, a) => {
        const cluster = clusters.find(c => c.id === a.clusterId);
        return sum + (cluster?.severityScore ?? 0);
      }, 0) / totalAnomalies
    : 0;

  return {
    clusters,
    anomalies,
    stats: {
      totalClusters: clusters.length,
      totalAnomalies,
      byType,
      avgSeverity
    }
  };
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface DetectionResult {
  clusters: Cluster[];
  anomalies: Anomaly[];
}

function detectTrainValLeakage(
  trainSamples: Sample[],
  valSamples: Sample[],
  testSamples: Sample[],
  runId: string,
  params: ParamConfig
): DetectionResult {
  const clusters: Cluster[] = [];
  const anomalies: Anomaly[] = [];

  const checkPairs = (source: Sample[], target: Sample[], sourceName: string, targetName: string) => {
    if (source.length === 0 || target.length === 0) return;

    const threshold = 0.85 - (params.eps ?? 0.1) * 0.5;
    const leakageGroups: { samples: Sample[]; targetSample: Sample; score: number }[] = [];

    source.forEach(sourceSample => {
      target.forEach(targetSample => {
        const score = jaccardSimilarity(sourceSample.content, targetSample.content);
        if (score > threshold) {
          const existing = leakageGroups.find(g =>
            g.samples.some(s => s.content === sourceSample.content) &&
            g.targetSample.content === targetSample.content
          );
          if (!existing) {
            leakageGroups.push({
              samples: [sourceSample],
              targetSample,
              score
            });
          } else if (!existing.samples.some(s => s.content === sourceSample.content)) {
            existing.samples.push(sourceSample);
          }
        }
      });
    });

    leakageGroups.forEach((group, idx) => {
      if (group.samples.length > 0) {
        const clusterId = generateId();
        const typeInfo = ANOMALY_TYPE_MAPPING.train_val_leakage;
        const severityScore = group.score;

        const cluster: Cluster = {
          id: clusterId,
          runId,
          clusterIndex: idx,
          anomalyType: 'train_val_leakage',
          sampleIds: [...group.samples.map(s => s.id), group.targetSample.id],
          severityScore,
          size: group.samples.length + 1,
          representativeSampleId: group.samples[0].id,
          summary: `${typeInfo.title}：${sourceName}与${targetName}共有${group.samples.length}条相似样本，相似度${Math.round(severityScore * 100)}%`
        };
        clusters.push(cluster);

        const allSamples = [...group.samples, group.targetSample];
        allSamples.forEach((sample, sampleIdx) => {
          const sourceLabel = sample.sourceSplit === 'train' ? '训练集' :
                             sample.sourceSplit === 'val' ? '验证集' : '测试集';
          const isSource = group.samples.some(s => s.id === sample.id);
          const otherSplit = isSource ? targetName : sourceName;

          const anomaly: Anomaly = {
            id: generateId(),
            runId,
            clusterId,
            sampleId: sample.id,
            status: 'pending',
            detectedAt: new Date().toISOString(),
            description: `${sourceLabel}样本与${otherSplit}存在高度重叠（相似度${Math.round(severityScore * 100)}%），会导致模型测试效果虚高。涉及样本ID：${group.samples.map(s => s.originalId).slice(0, 3).join('、')}${group.samples.length > 3 ? '等' : ''}`,
            friendlyDescription: typeInfo.description
              .replace('{source}', sourceLabel)
              .replace('{target}', otherSplit)
              .replace('{similarity}', `${Math.round(severityScore * 100)}%`)
          };
          anomalies.push(anomaly);
        });
      }
    });
  };

  checkPairs(trainSamples, valSamples, '训练集', '验证集');
  checkPairs(trainSamples, testSamples, '训练集', '测试集');
  checkPairs(valSamples, testSamples, '验证集', '测试集');

  return { clusters, anomalies };
}

function detectDuplicateSamples(
  samples: Sample[],
  runId: string,
  params: ParamConfig
): DetectionResult {
  const clusters: Cluster[] = [];
  const anomalies: Anomaly[] = [];

  const duplicates = samples.filter(s => s.isDuplicate && s.duplicateGroupId);
  const groups = new Map<string, Sample[]>();

  duplicates.forEach(s => {
    if (s.duplicateGroupId) {
      if (!groups.has(s.duplicateGroupId)) groups.set(s.duplicateGroupId, []);
      groups.get(s.duplicateGroupId)!.push(s);
    }
  });

  let groupIdx = 0;
  groups.forEach((dupSamples, groupId) => {
    const firstOriginal = samples.find(s => s.duplicateGroupId === groupId && !s.isDuplicate);
    if (firstOriginal && dupSamples.length > 0) {
      const allGroup = [firstOriginal, ...dupSamples];
      const clusterId = generateId();
      const typeInfo = ANOMALY_TYPE_MAPPING.duplicate_samples;
      const severityScore = Math.min(0.5 + dupSamples.length * 0.1, 0.95);

      const cluster: Cluster = {
        id: clusterId,
        runId,
        clusterIndex: groupIdx++,
        anomalyType: 'duplicate_samples',
        sampleIds: allGroup.map(s => s.id),
        severityScore,
        size: allGroup.length,
        representativeSampleId: firstOriginal.id,
        summary: `${typeInfo.title}：共${dupSamples.length}条重复样本，内容相同可能导致过拟合`
      };
      clusters.push(cluster);

      dupSamples.forEach(sample => {
        const anomaly: Anomaly = {
          id: generateId(),
          runId,
          clusterId,
          sampleId: sample.id,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          description: `该样本与样本ID ${firstOriginal.originalId} 内容完全重复。重复组内共有${allGroup.length}条相同内容。`,
          friendlyDescription: typeInfo.description
            .replace('{count}', String(dupSamples.length))
            .replace('{original_id}', firstOriginal.originalId)
        };
        anomalies.push(anomaly);
      });
    }
  });

  return { clusters, anomalies };
}

function detectLabelNoise(
  samples: Sample[],
  runId: string,
  params: ParamConfig
): DetectionResult {
  const clusters: Cluster[] = [];
  const anomalies: Anomaly[] = [];

  const minSamples = params.minSamples ?? 5;
  const contentGroups = new Map<string, Sample[]>();

  samples.forEach(s => {
    if (!s.isDuplicate) {
      const key = s.content.slice(0, 50);
      if (!contentGroups.has(key)) contentGroups.set(key, []);
      contentGroups.get(key)!.push(s);
    }
  });

  let clusterIdx = 0;
  contentGroups.forEach((group, key) => {
    if (group.length >= minSamples) {
      const labelCounts = new Map<string, number>();
      group.forEach(s => {
        const label = s.rawData?.label ?? '未标注';
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      });

      const labels = Array.from(labelCounts.entries()).sort((a, b) => b[1] - a[1]);
      if (labels.length >= 2) {
        const dominantLabel = labels[0][0];
        const dominantCount = labels[0][1];
        const noiseRatio = 1 - dominantCount / group.length;

        if (noiseRatio > 0.2) {
          const clusterId = generateId();
          const typeInfo = ANOMALY_TYPE_MAPPING.label_noise;
          const severityScore = Math.min(noiseRatio * 1.5, 0.9);

          const noiseSamples = group.filter(s => (s.rawData?.label ?? '未标注') !== dominantLabel);

          const cluster: Cluster = {
            id: clusterId,
            runId,
            clusterIndex: clusterIdx++,
            anomalyType: 'label_noise',
            sampleIds: group.map(s => s.id),
            severityScore,
            size: group.length,
            representativeSampleId: group[0].id,
            summary: `${typeInfo.title}：相似内容组共${group.length}条，主流标签「${dominantLabel}」${dominantCount}条，${labels.slice(1).map(l => `「${l[0]}」${l[1]}条`).join('、')}，噪声率${Math.round(noiseRatio * 100)}%`
          };
          clusters.push(cluster);

          noiseSamples.forEach(sample => {
            const anomaly: Anomaly = {
              id: generateId(),
              runId,
              clusterId,
              sampleId: sample.id,
              status: 'pending',
              detectedAt: new Date().toISOString(),
              description: `相似内容组的主流标签是「${dominantLabel}」，该样本标签为「${sample.rawData?.label ?? '未标注'}」，可能是标注错误。组内共${group.length}条样本，噪声率${Math.round(noiseRatio * 100)}%。`,
              friendlyDescription: typeInfo.description
                .replace('{main_label}', dominantLabel)
                .replace('{this_label}', sample.rawData?.label ?? '未标注')
                .replace('{noise_rate}', `${Math.round(noiseRatio * 100)}%`)
            };
            anomalies.push(anomaly);
          });
        }
      }
    }
  });

  return { clusters, anomalies };
}

function detectDistributionShift(
  trainSamples: Sample[],
  valSamples: Sample[],
  allSamples: Sample[],
  runId: string,
  params: ParamConfig
): DetectionResult {
  const clusters: Cluster[] = [];
  const anomalies: Anomaly[] = [];

  if (trainSamples.length === 0 || valSamples.length === 0) {
    return { clusters, anomalies };
  }

  const hashToBucket = (samples: Sample[], buckets: number): number[] => {
    const counts = new Array(buckets).fill(0);
    samples.forEach(s => {
      const bucket = simpleHash(s.content) % buckets;
      counts[bucket]++;
    });
    return counts;
  };

  const buckets = 20;
  const trainDist = hashToBucket(trainSamples, buckets);
  const valDist = hashToBucket(valSamples, buckets);

  const trainTotal = trainSamples.length;
  const valTotal = valSamples.length;

  let maxDiff = 0;
  let diffBucket = -1;

  for (let i = 0; i < buckets; i++) {
    const trainRatio = trainDist[i] / trainTotal;
    const valRatio = valDist[i] / valTotal;
    const diff = Math.abs(trainRatio - valRatio);
    if (diff > maxDiff) {
      maxDiff = diff;
      diffBucket = i;
    }
  }

  if (maxDiff > 0.08 && trainTotal > 50 && valTotal > 20) {
    const clusterId = generateId();
    const typeInfo = ANOMALY_TYPE_MAPPING.distribution_shift;
    const severityScore = Math.min(maxDiff * 3, 0.85);

    const affectedTrain = trainSamples.filter(s => simpleHash(s.content) % buckets === diffBucket);
    const affectedVal = valSamples.filter(s => simpleHash(s.content) % buckets === diffBucket);
    const affected = [...affectedTrain.slice(0, 10), ...affectedVal.slice(0, 10)];

    if (affected.length >= 3) {
      const cluster: Cluster = {
        id: clusterId,
        runId,
        clusterIndex: 0,
        anomalyType: 'distribution_shift',
        sampleIds: affected.map(s => s.id),
        severityScore,
        size: affected.length,
        representativeSampleId: affected[0].id,
        summary: `${typeInfo.title}：训练集与验证集分布差异${Math.round(maxDiff * 100)}%，某类内容占比训练集${Math.round(trainDist[diffBucket] / trainTotal * 100)}% vs 验证集${Math.round(valDist[diffBucket] / valTotal * 100)}%`
      };
      clusters.push(cluster);

      affected.slice(0, Math.min(20, affected.length)).forEach((sample, idx) => {
        const split = sample.sourceSplit === 'train' ? '训练集' : '验证集';
        const anomaly: Anomaly = {
          id: generateId(),
          runId,
          clusterId,
          sampleId: sample.id,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          description: `${split}中该类样本占比与另一侧差异过大（差异${Math.round(maxDiff * 100)}%），可能导致泛化能力差。训练集占比${Math.round(trainDist[diffBucket] / trainTotal * 100)}%，验证集占比${Math.round(valDist[diffBucket] / valTotal * 100)}%。`,
          friendlyDescription: typeInfo.description
            .replace('{split}', split)
            .replace('{diff}', `${Math.round(maxDiff * 100)}%`)
        };
        anomalies.push(anomaly);
      });
    }
  }

  return { clusters, anomalies };
}

function detectOutliers(
  samples: Sample[],
  runId: string,
  params: ParamConfig
): DetectionResult {
  const clusters: Cluster[] = [];
  const anomalies: Anomaly[] = [];

  const uniqueSamples = samples.filter(s => !s.isDuplicate);
  if (uniqueSamples.length < 20) return { clusters, anomalies };

  const lengths = uniqueSamples.map(s => s.content.length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const stdLen = Math.sqrt(lengths.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / lengths.length);

  const lengthOutliers = uniqueSamples.filter(s =>
    s.content.length > avgLen + 3 * stdLen ||
    s.content.length < Math.max(10, avgLen - 3 * stdLen)
  );

  if (lengthOutliers.length > 0 && lengthOutliers.length < uniqueSamples.length * 0.1) {
    const clusterId = generateId();
    const typeInfo = ANOMALY_TYPE_MAPPING.outlier;
    const severityScore = Math.min(0.4 + lengthOutliers.length * 0.05, 0.7);

    const cluster: Cluster = {
      id: clusterId,
      runId,
      clusterIndex: 0,
      anomalyType: 'outlier',
      sampleIds: lengthOutliers.map(s => s.id),
      severityScore,
      size: lengthOutliers.length,
      representativeSampleId: lengthOutliers[0].id,
      summary: `${typeInfo.title}：${lengthOutliers.length}条样本长度明显偏离平均值（均值${Math.round(avgLen)}字符，标准差${Math.round(stdLen)}）`
    };
    clusters.push(cluster);

    lengthOutliers.forEach(sample => {
      const isLong = sample.content.length > avgLen;
      const anomaly: Anomaly = {
        id: generateId(),
        runId,
        clusterId,
        sampleId: sample.id,
        status: 'pending',
        detectedAt: new Date().toISOString(),
        description: `该样本长度${sample.content.length}字符，${isLong ? '远大于' : '远小于'}数据集平均长度${Math.round(avgLen)}字符，可能是脏数据或噪声。`,
        friendlyDescription: typeInfo.description
          .replace('{length}', String(sample.content.length))
          .replace('{avg}', String(Math.round(avgLen)))
      };
      anomalies.push(anomaly);
    });
  }

  return { clusters, anomalies };
}
