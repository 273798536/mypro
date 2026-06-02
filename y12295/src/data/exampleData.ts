import type { DataPoint, ExampleType, DataPointSource } from '../types';
import { reduceTo3D } from '../utils/dimensionalityReduction';

function generateRandomVector(dim: number, mean: number[], std: number): number[] {
  return Array.from({ length: dim }, (_, i) => {
    const u = 1 - Math.random();
    const v = 1 - Math.random();
    const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return (mean[i] || 0) + n * std;
  });
}

function generateCluster(
  count: number,
  label: string,
  group: string,
  center: number[],
  std: number,
  dim: number = 8,
  confidenceRange: [number, number] = [0.3, 0.95],
  startRowIndex: number = 1,
  fileName: string = 'example-data.csv'
): DataPoint[] {
  const points: DataPoint[] = [];
  const vectorFieldNames = Array.from({ length: dim }, (_, i) => `v${i}`);
  const fieldMapping: Record<string, string> = {};
  vectorFieldNames.forEach((f, i) => {
    fieldMapping[`vector[${i}]`] = f;
  });
  fieldMapping['trueLabel'] = 'label';
  fieldMapping['group'] = 'group';

  for (let i = 0; i < count; i++) {
    const vector = generateRandomVector(dim, center, std);
    const confidence = confidenceRange[0] + Math.random() * (confidenceRange[1] - confidenceRange[0]);
    const rawRecord: Record<string, string | number | boolean | null> = { label, group, confidence };
    vector.forEach((v, idx) => {
      rawRecord[`v${idx}`] = v;
    });

    const source: DataPointSource = {
      fileName,
      rowIndex: startRowIndex + i,
      fieldMapping,
      rawRecord,
    };

    points.push({
      id: `${fileName}#L${startRowIndex + i}`,
      vector,
      cleanedVector: [...vector],
      embedding: [0, 0, 0],
      trueLabel: label,
      group,
      confidence,
      screenshots: [],
      source,
    });
  }

  return points;
}

function generateOverlapExample(): DataPoint[] {
  const dim = 8;
  const points: DataPoint[] = [];
  let rowIdx = 1;
  const fileName = 'overlap-example.csv';

  points.push(...generateCluster(80, '类别A', '训练集', [2, 2, 0, 0, 0, 0, 0, 0], 1.2, dim, [0.6, 0.95], rowIdx, fileName));
  rowIdx += 80;
  points.push(...generateCluster(80, '类别B', '训练集', [1, 1, 0, 0, 0, 0, 0, 0], 1.2, dim, [0.6, 0.95], rowIdx, fileName));
  rowIdx += 80;
  points.push(...generateCluster(60, '类别C', '训练集', [-2, -1, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.7, 0.95], rowIdx, fileName));
  rowIdx += 60;
  points.push(...generateCluster(40, '类别A', '测试集', [2, 2, 0, 0, 0, 0, 0, 0], 1.3, dim, [0.4, 0.8], rowIdx, fileName));
  rowIdx += 40;
  points.push(...generateCluster(40, '类别B', '测试集', [1, 1, 0, 0, 0, 0, 0, 0], 1.3, dim, [0.4, 0.8], rowIdx, fileName));
  rowIdx += 40;
  points.push(...generateCluster(30, '类别C', '测试集', [-2, -1, 0, 0, 0, 0, 0, 0], 1.1, dim, [0.5, 0.85], rowIdx, fileName));
  rowIdx += 30;

  const vectorFieldNames = Array.from({ length: dim }, (_, i) => `v${i}`);
  const fieldMapping: Record<string, string> = {};
  vectorFieldNames.forEach((f, i) => {
    fieldMapping[`vector[${i}]`] = f;
  });
  fieldMapping['trueLabel'] = 'label';
  fieldMapping['group'] = 'group';

  for (let i = 0; i < 15; i++) {
    const vector = generateRandomVector(dim, [1.5, 1.5, 0, 0, 0, 0, 0, 0], 0.5);
    const trueLabel = Math.random() > 0.5 ? '类别A' : '类别B';
    const rawRecord: Record<string, string | number | boolean | null> = {
      label: trueLabel,
      group: '边界样本',
      confidence: 0.3 + Math.random() * 0.3,
    };
    vector.forEach((v, idx) => {
      rawRecord[`v${idx}`] = v;
    });

    points.push({
      id: `${fileName}#L${rowIdx}`,
      vector,
      cleanedVector: [...vector],
      embedding: [0, 0, 0],
      trueLabel,
      group: '边界样本',
      confidence: 0.3 + Math.random() * 0.3,
      screenshots: [],
      source: { fileName, rowIndex: rowIdx, fieldMapping, rawRecord },
    });
    rowIdx++;
  }
  
  const vectors = points.map(p => p.vector);
  const embeddings = reduceTo3D(vectors);
  points.forEach((p, i) => {
    p.embedding = embeddings[i];
  });
  
  return points;
}

function generateOcclusionExample(): DataPoint[] {
  const dim = 8;
  const points: DataPoint[] = [];
  let rowIdx = 1;
  const fileName = 'occlusion-example.csv';

  points.push(...generateCluster(100, '类别A', '训练集', [0, 0, 0, 0, 0, 0, 0, 0], 0.8, dim, [0.8, 0.98], rowIdx, fileName));
  rowIdx += 100;
  points.push(...generateCluster(50, '类别B', '训练集', [3, 0, 0, 0, 0, 0, 0, 0], 0.6, dim, [0.7, 0.95], rowIdx, fileName));
  rowIdx += 50;
  points.push(...generateCluster(50, '类别C', '训练集', [-3, 0, 0, 0, 0, 0, 0, 0], 0.6, dim, [0.7, 0.95], rowIdx, fileName));
  rowIdx += 50;
  points.push(...generateCluster(30, '类别D', '训练集', [0, 3, 0, 0, 0, 0, 0, 0], 0.5, dim, [0.75, 0.95], rowIdx, fileName));
  rowIdx += 30;

  const vectorFieldNames = Array.from({ length: dim }, (_, i) => `v${i}`);
  const fieldMapping: Record<string, string> = {};
  vectorFieldNames.forEach((f, i) => {
    fieldMapping[`vector[${i}]`] = f;
  });
  fieldMapping['trueLabel'] = 'label';
  fieldMapping['group'] = 'group';

  for (let i = 0; i < 8; i++) {
    const vector = generateRandomVector(dim, [0, 0, 0, 0, 0, 0, 0, 0], 2.5);
    const isOccluded = Math.random() > 0.5;
    const trueLabel = ['类别A', '类别B', '类别C', '类别D'][Math.floor(Math.random() * 4)];
    const rawRecord: Record<string, string | number | boolean | null> = {
      label: trueLabel,
      group: isOccluded ? '遮挡样本' : '正常样本',
      confidence: 0.1 + Math.random() * 0.4,
    };
    vector.forEach((v, idx) => {
      rawRecord[`v${idx}`] = v;
    });

    points.push({
      id: `${fileName}#L${rowIdx}`,
      vector,
      cleanedVector: [...vector],
      embedding: [0, 0, 0],
      trueLabel,
      group: isOccluded ? '遮挡样本' : '正常样本',
      confidence: 0.1 + Math.random() * 0.4,
      isOccluded,
      occlusionReason: isOccluded ? '高密度区域遮挡' : undefined,
      screenshots: [],
      source: { fileName, rowIndex: rowIdx, fieldMapping, rawRecord },
    });
    rowIdx++;
  }

  for (let i = 0; i < 5; i++) {
    const vector = generateRandomVector(dim, [0, 0, 0, 0, 0, 0, 0, 0], 4.0);
    const rawRecord: Record<string, string | number | boolean | null> = {
      label: '类别A',
      group: '离群点',
      confidence: 0.2 + Math.random() * 0.3,
    };
    vector.forEach((v, idx) => {
      rawRecord[`v${idx}`] = v;
    });

    points.push({
      id: `${fileName}#L${rowIdx}`,
      vector,
      cleanedVector: [...vector],
      embedding: [0, 0, 0],
      trueLabel: '类别A',
      group: '离群点',
      confidence: 0.2 + Math.random() * 0.3,
      isOccluded: false,
      screenshots: [],
      source: { fileName, rowIndex: rowIdx, fieldMapping, rawRecord },
    });
    rowIdx++;
  }
  
  const vectors = points.map(p => p.vector);
  const embeddings = reduceTo3D(vectors);
  points.forEach((p, i) => {
    p.embedding = embeddings[i];
  });
  
  return points;
}

function generateInstabilityExample(): DataPoint[] {
  const dim = 16;
  const points: DataPoint[] = [];
  let rowIdx = 1;
  const fileName = 'instability-example.csv';

  points.push(...generateCluster(60, '类别A', '批次1', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85], rowIdx, fileName));
  rowIdx += 60;
  points.push(...generateCluster(60, '类别A', '批次2', [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85], rowIdx, fileName));
  rowIdx += 60;
  points.push(...generateCluster(60, '类别B', '批次1', [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85], rowIdx, fileName));
  rowIdx += 60;
  points.push(...generateCluster(60, '类别B', '批次2', [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85], rowIdx, fileName));
  rowIdx += 60;
  points.push(...generateCluster(40, '类别C', '批次1', [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0.9, dim, [0.6, 0.9], rowIdx, fileName));
  rowIdx += 40;
  points.push(...generateCluster(40, '类别C', '批次2', [0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0.9, dim, [0.6, 0.9], rowIdx, fileName));
  rowIdx += 40;

  const vectorFieldNames = Array.from({ length: dim }, (_, i) => `v${i}`);
  const fieldMapping: Record<string, string> = {};
  vectorFieldNames.forEach((f, i) => {
    fieldMapping[`vector[${i}]`] = f;
  });
  fieldMapping['trueLabel'] = 'label';
  fieldMapping['group'] = 'group';

  for (let i = 0; i < 20; i++) {
    const noiseVector = Array.from({ length: dim }, () => (Math.random() - 0.5) * 3);
    const trueLabel = ['类别A', '类别B', '类别C'][Math.floor(Math.random() * 3)];
    const rawRecord: Record<string, string | number | boolean | null> = {
      label: trueLabel,
      group: '高维噪声',
      confidence: 0.2 + Math.random() * 0.4,
    };
    noiseVector.forEach((v, idx) => {
      rawRecord[`v${idx}`] = v;
    });

    points.push({
      id: `${fileName}#L${rowIdx}`,
      vector: noiseVector,
      cleanedVector: [...noiseVector],
      embedding: [0, 0, 0],
      trueLabel,
      group: '高维噪声',
      confidence: 0.2 + Math.random() * 0.4,
      screenshots: [],
      source: { fileName, rowIndex: rowIdx, fieldMapping, rawRecord },
    });
    rowIdx++;
  }
  
  const vectors = points.map(p => p.vector);
  const embeddings = reduceTo3D(vectors);
  points.forEach((p, i) => {
    p.embedding = embeddings[i];
  });
  
  return points;
}

export function generateExample(type: ExampleType): { name: string; points: DataPoint[] } {
  switch (type) {
    case 'overlap':
      return {
        name: '类别重叠示例',
        points: generateOverlapExample(),
      };
    case 'occlusion':
      return {
        name: '异常点遮挡示例',
        points: generateOcclusionExample(),
      };
    case 'instability':
      return {
        name: '降维不稳示例',
        points: generateInstabilityExample(),
      };
    default:
      return {
        name: '类别重叠示例',
        points: generateOverlapExample(),
      };
  }
}

export const EXAMPLE_METADATA: Record<ExampleType, { name: string; description: string; icon: string }> = {
  overlap: {
    name: '类别重叠',
    description: '展示多个类别在特征空间中高度重叠的典型场景，用于讲解分类边界问题',
    icon: 'Overlap',
  },
  occlusion: {
    name: '异常点遮挡',
    description: '包含高密度区域遮挡、离群点等问题，演示如何识别被掩盖的样本',
    icon: 'EyeOff',
  },
  instability: {
    name: '降维不稳',
    description: '高维数据降维后的不稳定投影，展示批次效应和噪声带来的失真',
    icon: 'Shake',
  },
};
