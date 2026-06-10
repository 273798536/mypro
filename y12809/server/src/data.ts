import { v4 as uuidv4 } from 'uuid';
import {
  Sample,
  RegionAnnotation,
  CultivationRecord,
  LineageNode,
  SequencingResult,
  BatchEffectReport,
  ReviewRecord,
  MonthlyHandoverReport,
} from './types';

const generateId = () => uuidv4();

const today = new Date('2026-06-10');
const daysAgo = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const batches = ['BATCH-2026-05-A', 'BATCH-2026-05-B', 'BATCH-2026-06-A', 'BATCH-2026-06-B'];

const generateAnnotations = (count: number, seed: number): RegionAnnotation[] => {
  const categories: RegionAnnotation['category'][] = ['tumor', 'normal', 'necrosis', 'inflammation', 'artifact', 'other'];
  const labels: Record<string, string[]> = {
    tumor: ['肿瘤区域A', '肿瘤浸润区', '高恶变区'],
    normal: ['正常组织', '健康区域', '参考区域'],
    necrosis: ['坏死区域', '细胞坏死区', '凋亡区域'],
    inflammation: ['炎症浸润', '免疫细胞聚集', '淋巴细胞浸润'],
    artifact: ['折叠伪影', '染色不均', '切片破损'],
    other: ['边缘区域', '待确认区域', '异常结构'],
  };
  return Array.from({ length: count }, (_, i) => {
    const cat = categories[(seed + i) % categories.length];
    return {
      id: generateId(),
      x: 50 + ((i * 80) % 400),
      y: 50 + ((i * 60) % 300),
      width: 60 + ((i * 17) % 80),
      height: 50 + ((i * 13) % 60),
      label: labels[cat][i % labels[cat].length],
      category: cat,
      confidence: 0.55 + ((seed * i) % 45) / 100,
      notes: i % 3 === 0 ? '需要进一步确认' : undefined,
      createdAt: daysAgo(5 + i),
      updatedAt: daysAgo(2 + i),
    };
  });
};

const createSamples = (): Sample[] => {
  const samples: Sample[] = [];
  const speciesList = ['小鼠', '大鼠', '人源', '兔'];
  const tissues = ['肝脏', '肺脏', '肾脏', '脾脏', '肿瘤组织'];
  const staining = ['HE染色', '免疫组化', '特殊染色'];

  for (let i = 1; i <= 24; i++) {
    const status = i <= 10 ? 'normal' : i <= 18 ? 'boundary' : 'bad';
    const reviewStatus =
      i <= 6 ? 'approved' : i <= 12 ? 'reviewing' : i <= 18 ? 'pending' : i <= 21 ? 'flagged' : 'rejected';
    const batchId = batches[i % batches.length];
    const qualityScore =
      status === 'normal'
        ? 80 + (i % 20)
        : status === 'boundary'
        ? 55 + (i % 20)
        : 25 + (i % 25);
    const isUnavailable = status === 'bad' && i % 2 === 0;
    samples.push({
      id: generateId(),
      name: `样本-${String(i).padStart(3, '0')}`,
      code: `SMP-2026-${String(i).padStart(4, '0')}`,
      status,
      reviewStatus,
      batchId,
      lineageId: `LIN-${String(Math.ceil(i / 3))}`,
      receivedDate: daysAgo(30 - i),
      species: speciesList[i % speciesList.length],
      tissueType: tissues[i % tissues.length],
      sliceThickness: 3 + (i % 3) * 2,
      stainingMethod: staining[i % staining.length],
      imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
        `microscope pathology slide ${tissues[i % tissues.length]} tissue ${staining[i % staining.length]} sample ${i}`
      )}&image_size=square_hd`,
      annotations: generateAnnotations(4 + (i % 4), i),
      qualityScore,
      reviewer: i <= 12 ? '李研究员' : i <= 18 ? '王技术员' : undefined,
      reviewNotes:
        reviewStatus === 'flagged'
          ? '染色质量欠佳，建议重新制片'
          : reviewStatus === 'rejected'
          ? '样本污染严重，数据不可用'
          : i <= 6
          ? '复核通过，数据质量良好'
          : undefined,
      reviewedAt: i <= 18 ? daysAgo(i) : undefined,
      unavailableReason: isUnavailable
        ? i % 4 === 0
          ? '测序批次效应严重，样本污染'
          : '制片过程破损，结构不完整'
        : undefined,
      isUnavailable,
      createdAt: daysAgo(30 - i),
      updatedAt: daysAgo(Math.max(1, i - 1)),
    });
  }
  return samples;
};

export const samples: Sample[] = createSamples();

export const cultivationRecords: CultivationRecord[] = (() => {
  const records: CultivationRecord[] = [];
  const actions: CultivationRecord['action'][] = ['passage', 'medium_change', 'treatment', 'observation', 'other'];
  const details = [
    '1:3传代培养',
    '更换完全培养基',
    '加入药物A处理24h',
    '观察细胞形态正常',
    '细胞冻存记录',
    '补录：之前遗漏的传代记录',
    '更换培养基，细胞状态良好',
    '加入诱导分化处理',
  ];
  samples.forEach((sample, idx) => {
    const count = 2 + (idx % 4);
    for (let j = 0; j < count; j++) {
      records.push({
        id: generateId(),
        sampleId: sample.id,
        date: daysAgo(25 - idx - j * 3),
        operator: idx % 2 === 0 ? '张实验员' : '刘技术员',
        action: actions[(idx + j) % actions.length],
        details: details[(idx + j) % details.length],
        isSupplement: j === count - 1 && idx % 3 === 0,
        createdAt: daysAgo(20 - idx - j),
      });
    }
  });
  return records;
})();

export const lineageNodes: LineageNode[] = (() => {
  const nodes: LineageNode[] = [];
  const lineages = new Map<string, number>();
  samples.forEach((sample) => {
    const currentGen = lineages.get(sample.lineageId) || 0;
    const siblings = nodes.filter((n) => n.sampleId !== sample.id && n.id.startsWith(sample.lineageId));
    nodes.push({
      id: `${sample.lineageId}-G${currentGen}-${sample.id.slice(0, 6)}`,
      sampleId: sample.id,
      parentId: currentGen === 0 ? null : `${sample.lineageId}-G${currentGen - 1}-base`,
      childIds: [],
      generation: currentGen,
      status: sample.reviewStatus === 'flagged' ? 'corrected' : 'active',
      correctedFromId: sample.reviewStatus === 'flagged' ? `${sample.lineageId}-G${currentGen}-old` : undefined,
      createdAt: daysAgo(28 - currentGen * 5),
      updatedAt: daysAgo(3 + (sample.reviewStatus === 'flagged' ? 0 : 10)),
    });
    lineages.set(sample.lineageId, currentGen + 1);
  });
  return nodes;
})();

export const sequencingResults: SequencingResult[] = samples.map((sample, idx) => ({
  id: generateId(),
  sampleId: sample.id,
  batchId: sample.batchId,
  qualityScore: sample.qualityScore + (idx % 10) - 5,
  gcContent: 42 + (idx % 16),
  coverageDepth: 30 + (idx % 50),
  contaminationRate: sample.status === 'bad' ? 8 + (idx % 12) : sample.status === 'boundary' ? 2 + (idx % 5) : 0.5 + (idx % 2),
  batchEffectScore:
    sample.batchId === 'BATCH-2026-05-B'
      ? 75 + (idx % 20)
      : sample.batchId === 'BATCH-2026-06-B'
      ? 45 + (idx % 25)
      : 15 + (idx % 20),
  batchEffectFlags:
    sample.batchId === 'BATCH-2026-05-B'
      ? ['PC1聚类异常', 'GC偏移显著', '测序深度波动']
      : sample.batchId === 'BATCH-2026-06-B' && idx % 2 === 0
      ? ['轻度PC2分布偏移']
      : [],
  pcaCoordinates: {
    pc1: (idx % 10 - 5) * (sample.batchId.includes('05-B') ? 3 : 1),
    pc2: ((idx * 2) % 8 - 4),
    pc3: ((idx * 3) % 6 - 3),
  },
  createdAt: daysAgo(15 - (idx % 10)),
}));

export const batchEffectReports: BatchEffectReport[] = batches.map((batchId) => {
  const batchSamples = samples.filter((s) => s.batchId === batchId);
  const isBadBatch = batchId === 'BATCH-2026-05-B';
  const isMildBatch = batchId === 'BATCH-2026-06-B';
  return {
    batchId,
    detected: isBadBatch || isMildBatch,
    severity: isBadBatch ? 'severe' : isMildBatch ? 'moderate' : 'none',
    affectedSamples: isBadBatch
      ? batchSamples.map((s) => s.id)
      : isMildBatch
      ? batchSamples.filter((_, i) => i % 2 === 0).map((s) => s.id)
      : [],
    pc1Variance: isBadBatch ? 45.2 : isMildBatch ? 28.5 : 12.3,
    pc2Variance: isBadBatch ? 22.1 : isMildBatch ? 18.7 : 10.5,
    clusteringPattern: isBadBatch
      ? '批次内样本在PC1方向明显分离，与其他批次无重叠区'
      : isMildBatch
      ? '部分样本出现轻度聚类偏移'
      : '各样本分布均匀，无明显聚类',
    possibleCauses: isBadBatch
      ? [
          '测序仪批次差异（设备编号SEQ-003维护后性能波动',
          '试剂批号R-2026-05-17可能存在质量问题',
          '实验操作时间差异超过标准操作时间>4小时',
        ]
      : isMildBatch
      ? ['样本处理时间窗口差异', '试剂批次轻微差异']
      : [],
    recommendations: isBadBatch
      ? [
          '建议该批次数据单独分析，不与其他批次合并',
          '关键样本建议重新测序',
          '使用ComBat-seq进行批次效应校正',
          '排查设备SEQ-003校准状态',
        ]
      : isMildBatch
      ? ['建议使用标准化流程进行校正', '关注后续批次质量']
      : ['继续常规监控即可'],
    createdAt: daysAgo(3 + batches.indexOf(batchId) * 5),
  };
});

export const reviewRecords: ReviewRecord[] = (() => {
  const records: ReviewRecord[] = [];
  samples.forEach((sample, idx) => {
    if (sample.reviewStatus !== 'pending') {
      records.push({
        id: generateId(),
        sampleId: sample.id,
        reviewer: sample.reviewer || '系统自动',
        action:
          sample.reviewStatus === 'approved'
            ? 'approve'
            : sample.reviewStatus === 'rejected'
            ? 'reject'
            : sample.reviewStatus === 'flagged'
            ? 'flag'
            : 'comment',
        notes: sample.reviewNotes || '',
        createdAt: sample.reviewedAt || daysAgo(idx),
      });
    }
  });
  return records;
})();

export const generateMonthlyHandover = (month: string): MonthlyHandoverReport => {
  const unavailable = samples.filter((s) => s.isUnavailable);
  const flagged = samples.filter((s) => s.reviewStatus === 'flagged' || s.reviewStatus === 'rejected');
  const reasons = new Map<string, number>();
  unavailable.forEach((s) => {
    const r = s.unavailableReason || '其他原因';
    reasons.set(r, (reasons.get(r) || 0) + 1);
  });
  return {
    month,
    totalSamples: samples.length,
    reviewedSamples: samples.filter((s) => s.reviewStatus !== 'pending').length,
    pendingSamples: samples.filter((s) => s.reviewStatus === 'pending').length,
    unavailableSamples: unavailable,
    unavailableReasons: Array.from(reasons.entries()).map(([reason, count]) => ({ reason, count })),
    flaggedSamples: flagged,
    batchEffectIssues: batchEffectReports.filter((r) => r.detected),
    summary: `本月共处理样本${samples.length}例，完成复核${samples.filter((s) => s.reviewStatus !== 'pending').length}例，待复核${samples.filter((s) => s.reviewStatus === 'pending').length}例。发现${unavailable.length}例不可用样本，主要原因：${Array.from(reasons.keys()).join('、')}。检测到${batchEffectReports.filter((r) => r.detected).length}个批次存在批次效应问题，需重点关注。`,
    createdAt: today.toISOString(),
  };
};
