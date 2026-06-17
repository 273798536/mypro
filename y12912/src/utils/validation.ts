import { ParamConfig, ParamValidationError, DistanceMetric } from '../types';

const DISTANCE_METRICS: DistanceMetric[] = ['cosine', 'euclidean', 'manhattan'];

export function validateParamConfig(config: Partial<ParamConfig>): ParamValidationError[] {
  const errors: ParamValidationError[] = [];

  if (config.eps === undefined || config.eps === null) {
    errors.push({
      field: 'eps',
      value: config.eps,
      errorCode: 'EPS_REQUIRED',
      message: '邻域半径 eps 为必填参数',
      suggestion: '请输入一个 0 到 1 之间的数值，推荐 0.3 到 0.6',
      example: 0.5
    });
  } else if (typeof config.eps !== 'number' || isNaN(config.eps)) {
    errors.push({
      field: 'eps',
      value: config.eps,
      errorCode: 'EPS_INVALID_TYPE',
      message: `邻域半径 eps 必须是数字，当前类型为 ${typeof config.eps}`,
      suggestion: '请输入有效的数字，例如 0.5',
      example: 0.5
    });
  } else if (config.eps <= 0) {
    errors.push({
      field: 'eps',
      value: config.eps,
      errorCode: 'EPS_NON_POSITIVE',
      message: `邻域半径 eps 必须大于 0，当前值为 ${config.eps}`,
      suggestion: '请输入一个正数，推荐范围 0.1 到 1.0',
      example: 0.5
    });
  } else if (config.eps > 1) {
    errors.push({
      field: 'eps',
      value: config.eps,
      errorCode: 'EPS_TOO_LARGE',
      message: `邻域半径 eps 过大，当前值 ${config.eps} 超出推荐范围`,
      suggestion: '建议设置在 0.1 到 1.0 之间，过大的值会导致聚类过于粗糙',
      example: 0.5
    });
  }

  if (config.minSamples === undefined || config.minSamples === null) {
    errors.push({
      field: 'minSamples',
      value: config.minSamples,
      errorCode: 'MIN_SAMPLES_REQUIRED',
      message: '最小样本数 minSamples 为必填参数',
      suggestion: '请输入一个不小于 2 的整数，推荐 3 到 10',
      example: 5
    });
  } else if (!Number.isInteger(config.minSamples)) {
    errors.push({
      field: 'minSamples',
      value: config.minSamples,
      errorCode: 'MIN_SAMPLES_NOT_INTEGER',
      message: `最小样本数 minSamples 必须是整数，当前值为 ${config.minSamples}`,
      suggestion: '请输入整数，例如 5',
      example: 5
    });
  } else if (config.minSamples < 2) {
    errors.push({
      field: 'minSamples',
      value: config.minSamples,
      errorCode: 'MIN_SAMPLES_TOO_SMALL',
      message: `最小样本数 minSamples 至少为 2，当前值为 ${config.minSamples}`,
      suggestion: '值过小会导致每个样本都自成一类，失去聚类意义',
      example: 5
    });
  } else if (config.minSamples > 100) {
    errors.push({
      field: 'minSamples',
      value: config.minSamples,
      errorCode: 'MIN_SAMPLES_TOO_LARGE',
      message: `最小样本数 minSamples 过大，当前值 ${config.minSamples} 可能超过数据规模`,
      suggestion: '建议不超过样本总数的 5%，请根据数据规模调整',
      example: 5
    });
  }

  if (!config.distanceMetric) {
    errors.push({
      field: 'distanceMetric',
      value: config.distanceMetric,
      errorCode: 'METRIC_REQUIRED',
      message: '距离度量方式 distanceMetric 为必填参数',
      suggestion: '请从以下选项中选择：cosine、euclidean、manhattan',
      example: 'cosine'
    });
  } else if (!DISTANCE_METRICS.includes(config.distanceMetric as DistanceMetric)) {
    errors.push({
      field: 'distanceMetric',
      value: config.distanceMetric,
      errorCode: 'METRIC_INVALID',
      message: `距离度量方式 "${config.distanceMetric}" 无效`,
      suggestion: `支持的取值为: ${DISTANCE_METRICS.join('、')}`,
      example: 'cosine'
    });
  }

  if (!config.featureColumns || config.featureColumns.length === 0) {
    errors.push({
      field: 'featureColumns',
      value: config.featureColumns,
      errorCode: 'FEATURES_REQUIRED',
      message: '特征列 featureColumns 不能为空',
      suggestion: '请至少选择一列用于聚类的特征，如 text_embedding、label 等',
      example: ['text_embedding', 'label']
    });
  } else if (!Array.isArray(config.featureColumns)) {
    errors.push({
      field: 'featureColumns',
      value: config.featureColumns,
      errorCode: 'FEATURES_NOT_ARRAY',
      message: `特征列 featureColumns 必须是数组，当前类型为 ${typeof config.featureColumns}`,
      suggestion: '请使用数组格式传入特征列名',
      example: ['text_embedding']
    });
  }

  return errors;
}
