import type { DataPoint, ExampleType, Embedding3D } from '../types';
import { reduceTo3D } from '../utils/dimensionalityReduction';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

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
  confidenceRange: [number, number] = [0.3, 0.95]
): DataPoint[] {
  const points: DataPoint[] = [];
  
  for (let i = 0; i < count; i++) {
    const vector = generateRandomVector(dim, center, std);
    const confidence = confidenceRange[0] + Math.random() * (confidenceRange[1] - confidenceRange[0]);
    
    points.push({
      id: generateId(),
      vector,
      embedding: [0, 0, 0],
      trueLabel: label,
      group,
      confidence,
      screenshots: [],
    });
  }
  
  return points;
}

function generateOverlapExample(): DataPoint[] {
  const dim = 8;
  const points: DataPoint[] = [];
  
  points.push(...generateCluster(80, '类别A', '训练集', [2, 2, 0, 0, 0, 0, 0, 0], 1.2, dim, [0.6, 0.95]));
  points.push(...generateCluster(80, '类别B', '训练集', [1, 1, 0, 0, 0, 0, 0, 0], 1.2, dim, [0.6, 0.95]));
  points.push(...generateCluster(60, '类别C', '训练集', [-2, -1, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.7, 0.95]));
  points.push(...generateCluster(40, '类别A', '测试集', [2, 2, 0, 0, 0, 0, 0, 0], 1.3, dim, [0.4, 0.8]));
  points.push(...generateCluster(40, '类别B', '测试集', [1, 1, 0, 0, 0, 0, 0, 0], 1.3, dim, [0.4, 0.8]));
  points.push(...generateCluster(30, '类别C', '测试集', [-2, -1, 0, 0, 0, 0, 0, 0], 1.1, dim, [0.5, 0.85]));
  
  for (let i = 0; i < 15; i++) {
    const vector = generateRandomVector(dim, [1.5, 1.5, 0, 0, 0, 0, 0, 0], 0.5);
    points.push({
      id: generateId(),
      vector,
      embedding: [0, 0, 0],
      trueLabel: Math.random() > 0.5 ? '类别A' : '类别B',
      group: '边界样本',
      confidence: 0.3 + Math.random() * 0.3,
      screenshots: [],
    });
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
  
  points.push(...generateCluster(100, '类别A', '训练集', [0, 0, 0, 0, 0, 0, 0, 0], 0.8, dim, [0.8, 0.98]));
  points.push(...generateCluster(50, '类别B', '训练集', [3, 0, 0, 0, 0, 0, 0, 0], 0.6, dim, [0.7, 0.95]));
  points.push(...generateCluster(50, '类别C', '训练集', [-3, 0, 0, 0, 0, 0, 0, 0], 0.6, dim, [0.7, 0.95]));
  points.push(...generateCluster(30, '类别D', '训练集', [0, 3, 0, 0, 0, 0, 0, 0], 0.5, dim, [0.75, 0.95]));
  
  for (let i = 0; i < 8; i++) {
    const vector = generateRandomVector(dim, [0, 0, 0, 0, 0, 0, 0, 0], 2.5);
    const isOccluded = Math.random() > 0.5;
    points.push({
      id: generateId(),
      vector,
      embedding: [0, 0, 0],
      trueLabel: ['类别A', '类别B', '类别C', '类别D'][Math.floor(Math.random() * 4)],
      group: isOccluded ? '遮挡样本' : '正常样本',
      confidence: 0.1 + Math.random() * 0.4,
      isOccluded,
      occlusionReason: isOccluded ? '高密度区域遮挡' : undefined,
      screenshots: [],
    });
  }
  
  for (let i = 0; i < 5; i++) {
    const vector = generateRandomVector(dim, [0, 0, 0, 0, 0, 0, 0, 0], 4.0);
    points.push({
      id: generateId(),
      vector,
      embedding: [0, 0, 0],
      trueLabel: '类别A',
      group: '离群点',
      confidence: 0.2 + Math.random() * 0.3,
      isOccluded: false,
      screenshots: [],
    });
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
  
  points.push(...generateCluster(60, '类别A', '批次1', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85]));
  points.push(...generateCluster(60, '类别A', '批次2', [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85]));
  points.push(...generateCluster(60, '类别B', '批次1', [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85]));
  points.push(...generateCluster(60, '类别B', '批次2', [0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1.0, dim, [0.5, 0.85]));
  points.push(...generateCluster(40, '类别C', '批次1', [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0.9, dim, [0.6, 0.9]));
  points.push(...generateCluster(40, '类别C', '批次2', [0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0.9, dim, [0.6, 0.9]));
  
  for (let i = 0; i < 20; i++) {
    const noiseVector = Array.from({ length: dim }, () => (Math.random() - 0.5) * 3);
    points.push({
      id: generateId(),
      vector: noiseVector,
      embedding: [0, 0, 0],
      trueLabel: ['类别A', '类别B', '类别C'][Math.floor(Math.random() * 3)],
      group: '高维噪声',
      confidence: 0.2 + Math.random() * 0.4,
      screenshots: [],
    });
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
