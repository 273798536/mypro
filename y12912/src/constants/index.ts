import { AnomalyType, AnomalyStatus, CorrectionAction, DistanceMetric } from '../types';

export const ANOMALY_TYPE_MAPPING: Record<AnomalyType, {
  title: string;
  shortName: string;
  color: string;
  bgColor: string;
  description: string;
  suggestion: string;
}> = {
  train_val_leakage: {
    title: '训练验证数据重叠',
    shortName: '泄漏',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
    description: '检测到{source}样本与{target}存在{similarity}的相似度重叠。这意味着模型在训练时已经"见过"验证/测试数据，会导致测试效果虚高，不能真实反映模型在新数据上的泛化能力。',
    suggestion: '请将重叠数据只保留在一个数据集中，或从两个集合中都移除。需要同步更新原始数据切分脚本，避免后续再次出现相同问题。'
  },
  duplicate_samples: {
    title: '重复样本',
    shortName: '重复',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: '该样本内容与样本ID {original_id} 完全相同，属于重复数据。当前批次共发现 {count} 条重复样本。重复样本会让模型过度记忆特定内容，降低泛化能力，并导致去重统计不准。',
    suggestion: '每组重复样本只保留一条质量最好的，其余删除。如果是数据生成流程导致的重复，需要检查上游数据清洗逻辑。'
  },
  label_noise: {
    title: '标签噪声',
    shortName: '标签',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: '相似内容组的主流标签是「{main_label}」，但该样本标签为「{this_label}」，噪声率{noise_rate}。错误的标签会误导模型学习方向，降低模型在该类别上的准确率。',
    suggestion: '人工逐条复核，修正错误标签。如果标注人员较多，可考虑使用多轮交叉标注减少人为错误。'
  },
  distribution_shift: {
    title: '数据分布偏移',
    shortName: '分布',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    description: '{split}中某类样本占比与另一侧数据集差异过大（差异{diff}），说明训练数据和验证数据的分布不一致。这会导致模型在验证集上表现下降，甚至出现"训练准确率高但实际效果差"的情况。',
    suggestion: '重新划分数据集，确保各集合分布相近；或考虑使用数据增强、加权采样等方法平衡分布。'
  },
  outlier: {
    title: '文本长度异常',
    shortName: '异常',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/30',
    description: '该样本长度为{length}字符，数据集平均长度约为{avg}字符，明显偏离正常范围。过长或过短的样本可能是脏数据、格式错误或特殊情况。',
    suggestion: '人工检查该样本是否为有效数据。如果是脏数据，建议删除；如果是特殊场景样本，可考虑单独处理或标注为特殊类别。'
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
