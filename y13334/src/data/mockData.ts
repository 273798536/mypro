import { ProductRecord, ThresholdRule, FilterConditions } from '@/types';
import dayjs from 'dayjs';

const CATEGORIES = ['服饰', '美妆', '食品', '数码', '家居'];
const BRANDS = ['优选', '臻品', '尚选', '经典', '品质'];
const EVALUATORS = ['小孟', '李评测', '王审核', '张质检', '陈复核'];
const ATTRIBUTES = [
  { name: '标题规范性', weight: 0.15 },
  { name: '类目准确性', weight: 0.20 },
  { name: '属性完整性', weight: 0.20 },
  { name: '图片合规性', weight: 0.20 },
  { name: '描述真实性', weight: 0.15 },
  { name: '价格合理性', weight: 0.10 },
];

function randomScore(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return Math.round((x - Math.floor(x)) * 100);
}

function statusFromScore(score: number): 'pass' | 'warning' | 'fail' {
  if (score >= 80) return 'pass';
  if (score >= 60) return 'warning';
  return 'fail';
}

const THRESHOLD_BASE = {
  '标题规范性': { pass: 80, warning: 60 },
  '类目准确性': { pass: 85, warning: 65 },
  '属性完整性': { pass: 75, warning: 55 },
  '图片合规性': { pass: 80, warning: 60 },
  '描述真实性': { pass: 85, warning: 70 },
  '价格合理性': { pass: 70, warning: 50 },
};

export const THRESHOLD_RULES: ThresholdRule[] = Object.entries(THRESHOLD_BASE).map(([name, t], idx) => ({
  attributeName: name,
  pass: t.pass,
  warning: t.warning,
  weight: ATTRIBUTES[idx].weight,
  category: '通用',
  version: 'v2.3',
  effectiveFrom: '2026-04-01',
  changeLog: [
    {
      version: 'v2.3',
      date: '2026-03-28',
      changedBy: '规则组-老赵',
      fromPass: name === '类目准确性' ? 80 : t.pass - 5,
      toPass: t.pass,
      fromWarning: name === '类目准确性' ? 60 : t.warning - 5,
      toWarning: t.warning,
      reason: name === '类目准确性' ? 'Q2错类投诉率上升3%，收紧类目准入' : '整体质量标准提升',
    },
    {
      version: 'v2.2',
      date: '2026-01-15',
      changedBy: '规则组-老赵',
      fromPass: t.pass - 10,
      toPass: name === '类目准确性' ? 80 : t.pass - 5,
      fromWarning: t.warning - 10,
      toWarning: name === '类目准确性' ? 60 : t.warning - 5,
      reason: '年度基线调整',
    },
  ],
}));

function buildAttributes(seed: number) {
  return ATTRIBUTES.map((attr, idx) => {
    const drift = idx === 1 && seed % 7 === 0 ? -12 : 0;
    const score = Math.max(20, Math.min(100, randomScore(seed + idx) + drift));
    const t = THRESHOLD_BASE[attr.name as keyof typeof THRESHOLD_BASE];
    return {
      name: attr.name,
      score,
      label: score >= t.pass ? '通过' : score >= t.warning ? '注意' : '异常',
      status: statusFromScore(score) as 'pass' | 'warning' | 'fail',
      weight: attr.weight,
      thresholdPass: t.pass,
      thresholdWarning: t.warning,
    };
  });
}

function calcOverall(attrs: ReturnType<typeof buildAttributes>) {
  const weighted = attrs.reduce((s, a) => s + a.score * a.weight, 0);
  return Math.round(weighted * 10) / 10;
}

function generateProcessLogs(recordId: string, seed: number, finalStatus: 'pass' | 'warning' | 'fail', isOverride: boolean): ProductRecord['processLogs'] {
  const logs: ProductRecord['processLogs'] = [];
  const baseDay = dayjs('2026-06-10').add(seed % 8, 'day').add(seed % 24, 'hour');

  logs.push({
    id: `${recordId}-log-1`,
    timestamp: baseDay.format('YYYY-MM-DD HH:mm:ss'),
    operator: '模型-ATTR-v2.3',
    action: finalStatus === 'pass' ? 'auto_pass' : finalStatus === 'warning' ? 'auto_warning' : 'auto_fail',
    actionLabel: `模型自动判定:${finalStatus === 'pass' ? '通过' : finalStatus === 'warning' ? '预警' : '异常'}`,
    fromStatus: '',
    toStatus: finalStatus,
  });

  if (isOverride) {
    logs.push({
      id: `${recordId}-log-2`,
      timestamp: baseDay.add(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      operator: EVALUATORS[seed % 5],
      action: finalStatus === 'fail' ? 'overruled_pass' : 'overruled_fail',
      actionLabel: finalStatus === 'fail' ? '人工改判:通过' : '人工改判:异常',
      comment: finalStatus === 'fail'
        ? '人工复核：图片为特殊角度，不违规；描述歧义为行业通用术语'
        : '复核确认：存在类目错放 + 属性缺失，模型判断准确但置信度偏低已标记',
      fromStatus: finalStatus,
      toStatus: finalStatus === 'fail' ? 'pass' : 'fail',
    });
  }

  if (seed % 11 === 0 && !isOverride) {
    logs.push({
      id: `${recordId}-log-2`,
      timestamp: baseDay.add(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      operator: EVALUATORS[(seed + 2) % 5],
      action: 'material_requested',
      actionLabel: '补充材料请求',
      comment: '缺少品牌授权文件和质检报告，请补充后再审',
      fromStatus: finalStatus,
      toStatus: 'pending',
    });
  }

  return logs;
}

export const MOCK_RECORDS: ProductRecord[] = Array.from({ length: 48 }, (_, i) => {
  const seed = i + 1;
  const category = CATEGORIES[seed % CATEGORIES.length];
  const brand = BRANDS[seed % BRANDS.length];
  const evaluator = EVALUATORS[seed % EVALUATORS.length];
  const batchDate = dayjs('2026-06-01').add(seed % 17, 'day').format('YYYY-MM-DD');

  const attrs = buildAttributes(seed);
  const overallScore = calcOverall(attrs);
  let overallStatus = statusFromScore(overallScore) as 'pass' | 'warning' | 'fail';

  const isOverride = seed % 9 === 0 && seed > 10;
  const logs = generateProcessLogs(String(seed), seed, overallStatus, isOverride);
  const lastLog = logs[logs.length - 1];
  const finalStatus = isOverride ? lastLog.toStatus : overallStatus;
  const finalDecidedBy = isOverride ? lastLog.operator : '模型-ATTR-v2.3';
  const finalDecidedAt = lastLog.timestamp;

  const hasDrift = seed % 7 === 0;

  const exceptionMap: Record<number, ProductRecord['exceptionStatus']> = {
    3: 'manual_overruled', 9: 'manual_overruled', 18: 'manual_overruled', 27: 'manual_overruled',
    11: 'pending_material', 22: 'pending_material', 33: 'pending_material',
    5: 'handled', 10: 'handled', 15: 'handled', 25: 'handled', 35: 'handled',
  };

  const modelThresholdsApplied: ProductRecord['modelOutput']['thresholdsApplied'] = {};
  Object.keys(THRESHOLD_BASE).forEach((key, idx) => {
    const base = THRESHOLD_BASE[key as keyof typeof THRESHOLD_BASE];
    const driftFlag = hasDrift && idx === 1;
    modelThresholdsApplied[key] = {
      pass: driftFlag ? base.pass + 10 : base.pass,
      warning: driftFlag ? base.warning + 8 : base.warning,
      actualValue: attrs[idx].score,
      driftComparedTo: driftFlag ? 'v2.2→v2.3规则收紧，该批次属过渡期+8/+10漂移' : undefined,
    };
  });

  const productNames: Record<number, string> = {
    1: '夏季轻薄透气纯棉T恤男士短袖', 2: '玻尿酸保湿精华液30ml',
    3: '有机全麦面包无添加蔗糖800g', 4: '真无线蓝牙耳机主动降噪',
    5: '北欧风实木餐桌小户型家用', 6: '运动速干衣裤套装男女同款',
    7: '防水防汗防晒隔离霜SPF50+', 8: '低脂高纤代餐奶昔营养饱腹',
    9: '智能手表血氧监测GPS运动款', 10: '简约现代布艺沙发三人位',
  };

  return {
    id: `REC-${String(seed).padStart(5, '0')}`,
    productId: `SKU${100000 + seed * 37}`,
    productName: productNames[seed] || `${brand}${category}商品${seed}号`,
    category,
    brand,
    batchDate,
    evaluator,
    overallStatus: finalStatus,
    overallScore,
    attributes: attrs,
    modelOutput: {
      modelVersion: 'ATTR-v2.3.1',
      inferenceTime: dayjs(batchDate).add(seed % 24, 'hour').add(seed % 60, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      attributeScores: Object.fromEntries(attrs.map(a => [a.name, a.score])),
      attributeLabels: Object.fromEntries(attrs.map(a => [a.name, a.label])),
      confidence: Object.fromEntries(attrs.map((a, idx) => [a.name, Math.max(0.55, 0.95 - (idx * 0.07) - randomScore(seed + idx) * 0.003)])),
      rawText: `模型输出记录#${seed}: 分析维度6项，加权综合=${overallScore}。${hasDrift ? '【注意】类目准确性判定与v2.2基线存在偏差，请人工确认。' : ''}详情:${attrs.map(a => `${a.name}=${a.score}(${a.label})`).join('；')}`,
      thresholdsApplied: modelThresholdsApplied,
    },
    processLogs: logs,
    finalConclusion: {
      status: finalStatus,
      conclusionText: isOverride
        ? `人工改判为${finalStatus === 'pass' ? '通过' : '异常'}，原因为：${lastLog.comment}`
        : finalStatus === 'pass'
        ? '各项属性指标达标，自动通过。'
        : finalStatus === 'warning'
        ? '部分指标触及预警线，建议关注后序表现。'
        : '存在异常指标，请评测同学复核。',
      decidedAt: finalDecidedAt,
      decidedBy: finalDecidedBy,
      isManualOverride: isOverride,
    },
    exceptionStatus: exceptionMap[seed],
    exceptionNote: seed === 3 ? '人工改判：品牌授权已补传，类目属性经核无误' :
      seed === 11 ? '等待补充：质检报告缺失 + 产地证明' :
      seed === 5 ? '已处理：已通知商家修正图片，重新提交后通过' : undefined,
    influentialWeight: seed % 5 === 0 ? 2.5 + (seed % 3) * 0.3 : 1.0 + randomScore(seed) * 0.008,
  };
});

export const DEFAULT_FILTER: FilterConditions = {
  dateRange: null,
  categories: [],
  brands: [],
  statuses: [],
  evaluators: [],
  keyword: '',
};
