import type {
  QualitySample,
  CorrectionRecord,
  CitationItem,
  VersionConfig,
  KPIData,
  CitationCheckResult,
  SourceType,
  CitationStatus,
  WorkflowStatus,
  TrendItem,
  DefectDistributionItem,
} from '../types';

export function generateDefectTypes(): string[] {
  return [
    '表面划痕',
    '边缘缺损',
    '颜色偏差',
    '尺寸超差',
    '气泡空洞',
    '异物污染',
    '裂纹破损',
    '镀层不均',
    '装配偏移',
    '焊接缺陷',
  ];
}

export function generateImageUrl(idx: number): string {
  const seeds = ['inspection', 'quality', 'factory', 'product', 'line', 'camera', 'sensor', 'precision'];
  const seed = `${seeds[idx % seeds.length]}-${idx}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`;
}

const OPERATORS = ['张伟', '李娜', '王强', '赵敏', '陈磊', '刘洋', '孙芳', '周杰'];
const JUDGMENTS_PASS = ['合格', '良品', 'PASS', '通过'];
const JUDGMENTS_FAIL = ['不合格', '不良品', 'FAIL', '拒收'];
const REMARKS = [
  '经人工复核确认判级',
  '参照标准文档进行修正',
  '与工艺工程师确认后调整',
  '历史数据比对后判定',
  '现场确认实物状态',
  '客户反馈后复核',
  '首件检验特殊标注',
  '设备校准后重新判定',
];
const FIELDS = ['defectType', 'judgment', 'confidence', 'grade', 'category'];
const CITATION_NAMES = {
  standard_doc: ['GB/T 2828.1-2012 抽样标准', '企业质量规范V3.2', '行业检测标准手册', '产品技术规格书'],
  reference_image: ['缺陷标准图集-划痕类', '合格样本参照图-A批次', '边缘缺陷对比库', '颜色色卡参照图'],
  spec_sheet: ['产品BOM规格表', '工艺参数清单', '检验作业指导书', '品质管控标准'],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function randomRange(min: number, max: number, seed: number): number {
  const x = Math.sin(seed) * 10000;
  return min + (x - Math.floor(x)) * (max - min);
}

function generateId(prefix: string, num: number): string {
  return `${prefix}${String(num).padStart(5, '0')}`;
}

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(daysAgo: number, hours: number = 0, minutes: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function generateSamples(): QualitySample[] {
  const samples: QualitySample[] = [];
  const defectTypes = generateDefectTypes();
  const versions = ['v1', 'v2'];
  const batches = [
    { id: 'B001', name: '2026年6月上旬批次' },
    { id: 'B002', name: '2026年6月中旬批次' },
  ];
  const perVersion = 60;
  const total = 120;

  const sourceTypeDistribution: SourceType[] = [];
  const numOldCorrection = Math.round(total * 0.35);
  const numNormalRecord = Math.round(total * 0.45);
  const numVerbalNote = total - numOldCorrection - numNormalRecord;
  for (let i = 0; i < numOldCorrection; i++) sourceTypeDistribution.push('old_correction');
  for (let i = 0; i < numNormalRecord; i++) sourceTypeDistribution.push('normal_record');
  for (let i = 0; i < numVerbalNote; i++) sourceTypeDistribution.push('verbal_note');

  const citationStatusDistribution: CitationStatus[] = [];
  const numComplete = Math.round(total * 0.7);
  const numMissing = Math.round(total * 0.15);
  const numPartial = total - numComplete - numMissing;
  for (let i = 0; i < numComplete; i++) citationStatusDistribution.push('complete');
  for (let i = 0; i < numMissing; i++) citationStatusDistribution.push('missing');
  for (let i = 0; i < numPartial; i++) citationStatusDistribution.push('partial');

  const shuffledSource = [...sourceTypeDistribution];
  const shuffledCitation = [...citationStatusDistribution];
  for (let i = shuffledSource.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(i * 12.9898) * 43758.5453) % (i + 1));
    [shuffledSource[i], shuffledSource[j]] = [shuffledSource[j], shuffledSource[i]];
    [shuffledCitation[i], shuffledCitation[j]] = [shuffledCitation[j], shuffledCitation[i]];
  }

  const highRiskMissingIndices: number[] = [];
  let missingCount = 0;
  for (let i = 0; i < total && highRiskMissingIndices.length < 8; i++) {
    if (shuffledCitation[i] === 'missing') {
      highRiskMissingIndices.push(i);
      missingCount++;
    }
  }
  for (let i = 0; highRiskMissingIndices.length < 8; i++) {
    if (!highRiskMissingIndices.includes(i)) {
      highRiskMissingIndices.push(i);
      shuffledCitation[i] = 'missing';
    }
  }

  for (let i = 0; i < total; i++) {
    const versionIdx = Math.floor(i / perVersion);
    const version = versions[versionIdx];
    const batchIdx = Math.floor((i % perVersion) / 30);
    const batch = batches[batchIdx];
    const isRevised = i % 3 !== 0;
    const sourceType = shuffledSource[i];
    const citationStatus = shuffledCitation[i];

    const workflowSeed = i * 7 + 3;
    let workflowStatus: WorkflowStatus;
    const wfRand = Math.abs(Math.sin(workflowSeed) * 10000) % 100;
    if (wfRand < 50) workflowStatus = 'approved';
    else if (wfRand < 75) workflowStatus = 'pending';
    else if (wfRand < 90) workflowStatus = 'need_material';
    else workflowStatus = 'recheck';

    const defectIdx = Math.floor(Math.abs(Math.sin(i * 3.14) * defectTypes.length) % defectTypes.length);
    const defectType = defectTypes[defectIdx];

    const corrections: CorrectionRecord[] = [];
    if (isRevised) {
      const numCorr = 1 + (i % 3);
      for (let c = 0; c < numCorr; c++) {
        corrections.push({
          id: generateId('CORR', i * 10 + c),
          sourceType: sourceType,
          field: pick(FIELDS, i + c * 13),
          oldValue: c === 0 ? pick(JUDGMENTS_FAIL, i + c) : pick(defectTypes, i + c + 5),
          newValue: c === 0 ? pick(JUDGMENTS_PASS, i + c + 7) : defectType,
          operator: pick(OPERATORS, i + c * 11),
          remark: pick(REMARKS, i + c * 17),
          timestamp: formatDateTime(10 - (i % 10), 8 + (i % 8), (i * 7) % 60),
        });
      }
    }

    const citations: CitationItem[] = [];
    const citationTypes: Array<'standard_doc' | 'reference_image' | 'spec_sheet'> = [
      'standard_doc',
      'reference_image',
      'spec_sheet',
    ];

    if (citationStatus === 'complete') {
      citationTypes.forEach((ct, idx) => {
        citations.push({
          id: generateId('CIT', i * 10 + idx),
          type: ct,
          name: pick(CITATION_NAMES[ct], i + idx),
          url: `https://docs.example.com/${version}/${ct}/${i}-${idx}`,
          isValid: true,
        });
      });
    } else if (citationStatus === 'partial') {
      const keepIdx = i % 3;
      citationTypes.forEach((ct, idx) => {
        if (idx !== keepIdx) {
          citations.push({
            id: generateId('CIT', i * 10 + idx),
            type: ct,
            name: pick(CITATION_NAMES[ct], i + idx),
            url: `https://docs.example.com/${version}/${ct}/${i}-${idx}`,
            isValid: true,
          });
        }
      });
    }

    const daysAgo = (i % 30) + 1;
    const createdAt = formatDateTime(daysAgo + 5, 9 + (i % 6), (i * 5) % 60);
    const updatedAt = isRevised
      ? formatDateTime(daysAgo, 14 + (i % 4), (i * 11) % 60)
      : createdAt;

    const originalJudgment = isRevised ? pick(JUDGMENTS_FAIL, i) : pick(JUDGMENTS_PASS, i + 2);
    const revisedJudgment = isRevised ? pick(JUDGMENTS_PASS, i + 3) : originalJudgment;

    const baseConfidence = 60 + (i % 35);
    const confidence = isRevised
      ? Math.min(99, baseConfidence + 15)
      : Math.max(50, 100 - (i % 25));

    const sample: QualitySample = {
      sampleId: generateId('S', i + 1),
      batchId: batch.id,
      batchName: batch.name,
      version,
      imageUrl: generateImageUrl(i),
      originalJudgment,
      revisedJudgment,
      defectType,
      confidence,
      sourceType,
      citationStatus,
      workflowStatus,
      corrections,
      citations,
      createdAt,
      updatedAt,
    };

    if (i % 5 === 0) {
      sample.operatorRemark = pick(REMARKS, i + 100);
    }

    samples.push(sample);
  }

  return samples;
}

export function generateVersions(): VersionConfig[] {
  const baseThresholds: Record<string, number> = {
    scratchMaxLength: 0.3,
    edgeChippingMaxSize: 0.15,
    colorDeltaEMax: 2.0,
    dimensionTolerance: 0.05,
    bubbleMaxDiameter: 0.2,
  };

  const v1Thresholds: Record<string, number> = {};
  const v2Thresholds: Record<string, number> = {};

  Object.entries(baseThresholds).forEach(([key, value], idx) => {
    const v1Delta = value * ((idx % 2 === 0 ? -1 : 1) * (0.05 + (idx * 0.02)));
    const v2Delta = value * ((idx % 2 === 0 ? 1 : -1) * (0.08 + (idx * 0.025)));
    v1Thresholds[key] = Number((value + v1Delta).toFixed(4));
    v2Thresholds[key] = Number((value + v2Delta).toFixed(4));
  });

  return [
    {
      version: 'v1',
      name: '标准检测规则 v1.0',
      releaseDate: '2026-03-15',
      thresholds: v1Thresholds,
      description: '基于2025年第四季度数据训练的初始检测模型，适用于常规产品批次。',
    },
    {
      version: 'v2',
      name: '优化检测规则 v2.0',
      releaseDate: '2026-06-01',
      thresholds: v2Thresholds,
      description: '引入人工改判反馈训练，针对边缘缺陷和颜色偏差进行了重点优化。',
    },
  ];
}

export function generateKPIData(version: string): KPIData {
  const samplesPerVersion = 60;
  const isV2 = version === 'v2';

  const totalSamples = samplesPerVersion;
  const revisedRatio = isV2 ? 0.32 : 0.42;
  const revisedCount = Math.round(totalSamples * revisedRatio);
  const passRate = isV2 ? 91.5 : 86.2;
  const citationMissing = Math.round(totalSamples * (isV2 ? 0.11 : 0.18));
  const pendingCount = Math.round(totalSamples * (isV2 ? 0.18 : 0.28));

  const trend: TrendItem[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = formatDate(i);
    const baseRevised = isV2 ? 5 + (i % 4) : 7 + (i % 5);
    const revised = Math.max(0, baseRevised + Math.round(Math.sin(i * 0.8) * 2));
    const basePass = isV2 ? 90 : 84;
    const rate = Number((basePass + Math.sin(i * 0.5) * 3 + (isV2 ? i * 0.05 : -i * 0.02)).toFixed(1));
    trend.push({ date, revised, passRate: Math.min(99, Math.max(75, rate)) });
  }

  const defectTypes = generateDefectTypes();
  const defectDistribution: DefectDistributionItem[] = defectTypes.map((type, idx) => {
    const base = 15 - idx;
    const variation = Math.round(Math.abs(Math.sin(idx * 2.5) * 8));
    const v2Boost = isV2 && (idx === 1 || idx === 2) ? -3 : 0;
    return {
      type,
      count: Math.max(2, base + variation + v2Boost),
    };
  });

  return {
    totalSamples,
    revisedCount,
    passRate,
    citationMissing,
    pendingCount,
    trend,
    defectDistribution,
  };
}

export function generateCitationCheckResults(): CitationCheckResult[] {
  const samples = generateSamples();
  const missingSamples = samples.filter((s) => s.citationStatus === 'missing' || s.citationStatus === 'partial');
  const allTypes: Array<'standard_doc' | 'reference_image' | 'spec_sheet'> = [
    'standard_doc',
    'reference_image',
    'spec_sheet',
  ];

  const results: CitationCheckResult[] = [];
  const highRiskReasons = [
    '该缺陷类型判级存在争议，需完整引用链支撑',
    '涉及客户投诉高风险批次，必须补充标准文档',
    '改判幅度过大，缺少标准参照图和规格表双重验证',
  ];
  const mediumReasons = [
    '缺少部分引用类型，建议补充',
    '引用链不完整，存在审计风险',
    '标准文档版本已更新，建议同步引用',
  ];
  const lowReasons = [
    '引用基本完整，仅缺失次要参考文件',
    '建议补充参考图像以便后续追溯',
  ];
  const highRiskSteps = [
    '立即联系工艺工程师获取标准文档并关联',
    '暂停该批次流转，待引用补充完整后审批',
    '提交品质经理复核并补充缺失引用',
  ];
  const mediumSteps = [
    '24小时内补充缺失引用文件',
    '联系文档管理员获取最新规格表',
    '从标准图集库中上传对应参考图像',
  ];
  const lowSteps = [
    '本周内完成引用补充即可',
    '下次批量复核时一并处理',
  ];

  missingSamples.forEach((sample, idx) => {
    const isHighRisk = idx < 8;
    const presentTypes = sample.citations.map((c) => c.type);
    const missingTypes = allTypes.filter((t) => !presentTypes.includes(t));

    let riskLevel: 'high' | 'medium' | 'low';
    let reason: string;
    let suggestedNextStep: string;

    if (isHighRisk || missingTypes.length >= 2) {
      riskLevel = 'high';
      reason = pick(highRiskReasons, idx);
      suggestedNextStep = pick(highRiskSteps, idx);
    } else if (missingTypes.length === 1 && sample.workflowStatus === 'pending') {
      riskLevel = 'medium';
      reason = pick(mediumReasons, idx);
      suggestedNextStep = pick(mediumSteps, idx);
    } else {
      riskLevel = 'low';
      reason = pick(lowReasons, idx);
      suggestedNextStep = pick(lowSteps, idx);
    }

    results.push({
      sampleId: sample.sampleId,
      riskLevel,
      missingTypes: missingTypes.length > 0 ? missingTypes : [allTypes[idx % 3]],
      reason,
      suggestedNextStep,
      checkedAt: formatDateTime(idx % 5, 10 + (idx % 6), (idx * 13) % 60),
    });
  });

  return results;
}
