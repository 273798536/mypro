import type { Sample, MetricConfig, MetricResult, PassCondition } from '@/types';

export const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'recall_at_10',
    name: 'Recall@10',
    formula: 'Recall@10 = 命中Top10的正样本数 / 全部正样本数',
    formulaDetail:
      '分子：Top10预测结果中包含ground_truth的样本数\n分母：验证集中所有正样本的总数',
    unit: '%',
    defaultThreshold: 85,
    passCondition: '>=',
    description: '召回率，衡量模型找回正确结果的能力',
    minValue: 0,
    maxValue: 100,
  },
  {
    key: 'precision_at_10',
    name: 'Precision@10',
    formula: 'Precision@10 = Top10预测中正样本数 / (TopK预测总数)',
    formulaDetail: '分子：Top10预测结果中实际命中ground_truth的条目数之和\n分母：所有样本 × 10（每个样本返回10条结果）',
    unit: '%',
    defaultThreshold: 80,
    passCondition: '>=',
    description: '精确率，衡量模型返回结果的准确性',
    minValue: 0,
    maxValue: 100,
  },
  {
    key: 'ndcg_at_10',
    name: 'NDCG@10',
    formula: 'NDCG@10 = DCG@10 / IDCG@10',
    formulaDetail:
      'DCG@10 = Σ(2^rel_i - 1) / log2(i+1)，i从1到10\nIDCG@10 = 理想排序下的DCG值\nrel_i=1表示命中，rel_i=0表示未命中',
    unit: '',
    defaultThreshold: 0.75,
    passCondition: '>=',
    description: '归一化折损累计增益，考虑排序位置的指标',
    minValue: 0,
    maxValue: 1,
  },
  {
    key: 'qps',
    name: 'QPS',
    formula: 'QPS = 总查询数 / 总耗时(秒)',
    formulaDetail: '分子：压测期间发出的总查询请求数\n分母：压测总耗时（秒）',
    unit: '次/秒',
    defaultThreshold: 1000,
    passCondition: '>=',
    description: '每秒查询数，衡量系统吞吐量',
    minValue: 0,
    maxValue: 5000,
  },
  {
    key: 'latency_p99',
    name: 'Latency P99',
    formula: 'P99 = 将所有查询延迟升序排列后第99百分位的值',
    formulaDetail: '将每个query的延迟升序排序，取第 ceil(总数 × 0.99) 个位置的值',
    unit: 'ms',
    defaultThreshold: 50,
    passCondition: '<=',
    description: '99分位延迟，衡量慢查询的尾延迟',
    minValue: 0,
    maxValue: 200,
  },
];

function evaluateCondition(
  value: number,
  threshold: number,
  condition: PassCondition
): boolean {
  switch (condition) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
  }
}

function calcRecallAtK(samples: Sample[], k: number): { numerator: number; denominator: number; value: number } {
  const denominator = samples.length;
  let numerator = 0;
  for (const s of samples) {
    const topK = s.predictions.slice(0, k);
    if (topK.some((p) => p.docId === s.groundTruth)) {
      numerator++;
    }
  }
  return {
    numerator,
    denominator,
    value: denominator === 0 ? 0 : (numerator / denominator) * 100,
  };
}

function calcPrecisionAtK(samples: Sample[], k: number): { numerator: number; denominator: number; value: number } {
  const denominator = samples.length * k;
  let numerator = 0;
  for (const s of samples) {
    const topK = s.predictions.slice(0, k);
    for (const p of topK) {
      if (p.docId === s.groundTruth) {
        numerator++;
      }
    }
  }
  return {
    numerator,
    denominator,
    value: denominator === 0 ? 0 : (numerator / denominator) * 100,
  };
}

function calcNDCGAtK(samples: Sample[], k: number): { numerator: number; denominator: number; value: number } {
  let totalDCG = 0;
  let totalIDCG = 0;
  for (const s of samples) {
    let dcg = 0;
    const topK = s.predictions.slice(0, k);
    for (let i = 0; i < topK.length; i++) {
      const rel = topK[i].docId === s.groundTruth ? 1 : 0;
      dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
    }
    let idcg = 0;
    for (let i = 0; i < Math.min(k, 1); i++) {
      idcg += (Math.pow(2, 1) - 1) / Math.log2(i + 2);
    }
    totalDCG += dcg;
    totalIDCG += idcg;
  }
  return {
    numerator: totalDCG,
    denominator: totalIDCG,
    value: totalIDCG === 0 ? 0 : totalDCG / totalIDCG,
  };
}

function calcQPS(samples: Sample[]): { numerator: number; denominator: number; value: number } {
  const totalLatencySec = samples.reduce((sum, s) => sum + s.latencyMs, 0) / 1000;
  const numerator = samples.length;
  const denominator = Math.max(totalLatencySec, 0.001);
  return {
    numerator,
    denominator,
    value: numerator / denominator,
  };
}

function calcP99Latency(samples: Sample[]): { numerator: number; denominator: number; value: number } {
  const latencies = samples.map((s) => s.latencyMs).sort((a, b) => a - b);
  const idx = Math.ceil(latencies.length * 0.99) - 1;
  const p99 = latencies[Math.max(0, Math.min(idx, latencies.length - 1))] || 0;
  return {
    numerator: p99,
    denominator: 1,
    value: p99,
  };
}

export function computeAllMetrics(
  samples: Sample[],
  configs: MetricConfig[],
  thresholds: Record<string, number> = {}
): MetricResult[] {
  const results: MetricResult[] = [];
  for (const cfg of configs) {
    let calc: { numerator: number; denominator: number; value: number };
    switch (cfg.key) {
      case 'recall_at_10':
        calc = calcRecallAtK(samples, 10);
        break;
      case 'precision_at_10':
        calc = calcPrecisionAtK(samples, 10);
        break;
      case 'ndcg_at_10':
        calc = calcNDCGAtK(samples, 10);
        break;
      case 'qps':
        calc = calcQPS(samples);
        break;
      case 'latency_p99':
        calc = calcP99Latency(samples);
        break;
      default:
        calc = { numerator: 0, denominator: 1, value: 0 };
    }
    const threshold = thresholds[cfg.key] ?? cfg.defaultThreshold;
    results.push({
      key: cfg.key,
      name: cfg.name,
      formula: cfg.formula,
      formulaDetail: cfg.formulaDetail,
      unit: cfg.unit,
      value: Number(calc.value.toFixed(cfg.unit === '%' || cfg.unit === '' ? 2 : 0)),
      threshold,
      passCondition: cfg.passCondition,
      isPassed: evaluateCondition(calc.value, threshold, cfg.passCondition),
      numerator: Number(calc.numerator.toFixed(4)),
      denominator: Number(calc.denominator.toFixed(4)),
    });
  }
  return results;
}

export function formatMetricValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }
  if (unit === '') {
    return value.toFixed(4);
  }
  return `${value.toFixed(0)}${unit}`;
}

export function getTopNegativeSamples(samples: Sample[], topN = 5): Sample[] {
  return [...samples]
    .filter((s) => !s.isHit || s.contributionToMetric < 0)
    .sort((a, b) => a.contributionToMetric - b.contributionToMetric)
    .slice(0, topN);
}
