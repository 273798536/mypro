import { AnomalyType, AnomalyStatus, CorrectionAction, DistanceMetric } from '../types';

export const ANOMALY_TYPE_MAPPING: Record<AnomalyType, {
  title: string;
  shortName: string;
  color: string;
  bgColor: string;
  description: (data: any) => string;
  suggestion: string;
}> = {
  train_val_leakage: {
    title: '训练验证数据重叠',
    shortName: '泄漏',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
    description: (d) => `检测到有 ${d.overlapCount ?? d.sampleCount ?? '多'} 条数据同时出现在训练集和验证集中。` +
      '这意味着模型在训练时已经"见过"验证数据，会导致验证结果虚高，不能真实反映模型在新数据上的表现。',
    suggestion: '建议：请将重叠数据只保留在一个数据集中，或从两个集合中都移除。'
  },
  duplicate_cluster: {
    title: '重复样本聚集',
    shortName: '重复',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: (d) => `发现 ${d.duplicateCount ?? d.sampleCount ?? '多'} 组高度相似的重复样本。` +
      '重复样本会让模型过度记忆这些内容，降低泛化能力。',
    suggestion: '建议：每组重复样本只保留一条质量最好的，其余删除。'
  },
  label_noise: {
    title: '标签异常',
    shortName: '标签',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: (d) => `有 ${d.noiseCount ?? d.sampleCount ?? '多'} 条数据的标签与其内容特征不一致。` +
      '错误的标签会误导模型学习方向。',
    suggestion: '建议：人工逐条复核，修正错误标签。'
  },
  distribution_shift: {
    title: '数据分布偏移',
    shortName: '分布',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    description: (d) => `训练集与验证集在「${d.feature ?? '关键'}」特征上的分布差异较大（差异度: ${d.diff ?? '显著'}）。` +
      '分布不一致会导致模型在验证集上表现下降。',
    suggestion: '建议：重新划分数据集，确保各集合分布相近；或考虑使用数据增强。'
  },
  other: {
    title: '其他异常',
    shortName: '其他',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/30',
    description: () => '该异常类型需要进一步人工分析。',
    suggestion: '建议：联系模型训练工程师做深入分析。'
  }
};

export const ANOMALY_STATUS_MAPPING: Record<AnomalyStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: { label: '待处理', color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  confirmed: { label: '已确认', color: 'text-rose-500', bgColor: 'bg-rose-500/10 border-rose-500/30' },
  rejected: { label: '已驳回', color: 'text-slate-400', bgColor: 'bg-slate-500/10 border-slate-500/30' },
  fixed: { label: '已修复', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
};

export const CORRECTION_ACTION_MAPPING: Record<CorrectionAction, {
  label: string;
  description: string;
}> = {
  keep: { label: '保留', description: '确认样本无问题，保持原样' },
  remove: { label: '移除', description: '从数据集中删除该样本' },
  relabel: { label: '重标', description: '修改样本的标签' },
  move_split: { label: '调整切分', description: '将样本移动到其他数据集（训练/验证/测试）' },
};

export const DISTANCE_METRIC_MAPPING: Record<DistanceMetric, {
  label: string;
  description: string;
}> = {
  cosine: { label: '余弦距离', description: '衡量向量方向差异，适合文本嵌入' },
  euclidean: { label: '欧氏距离', description: '直线距离，通用数值特征' },
  manhattan: { label: '曼哈顿距离', description: '各维度差绝对值之和，对异常值更鲁棒' },
};

export const PROMPT_VERSIONS = [
  { id: 'v1.0.0', label: 'v1.0.0 - 基线版本', date: '2026-05-01' },
  { id: 'v1.1.0', label: 'v1.1.0 - 优化泄漏检测', date: '2026-05-15' },
  { id: 'v1.2.0', label: 'v1.2.0 - 新增标签噪声识别', date: '2026-06-01' },
  { id: 'v2.0.0-beta', label: 'v2.0.0-beta - 多模态支持', date: '2026-06-10' },
];

export const STORAGE_KEYS = {
  BATCHES: 'anomaly_cluster_batches',
  RUNS: 'anomaly_cluster_runs',
  SAMPLES: 'anomaly_cluster_samples',
  CLUSTERS: 'anomaly_cluster_clusters',
  ANOMALIES: 'anomaly_cluster_anomalies',
  CORRECTIONS: 'anomaly_cluster_corrections',
};
