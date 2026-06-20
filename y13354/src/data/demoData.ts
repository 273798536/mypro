import type { Snapshot, Sample, Note, Attachment, ManualOverride } from '@/types';

function generatePredictions(groundTruth: string, isHit: boolean, rankHit?: number): { docId: string; score: number; rank: number }[] {
  const predictions: { docId: string; score: number; rank: number }[] = [];
  const hitRank = rankHit ?? (isHit ? Math.floor(Math.random() * 5) + 1 : -1);
  for (let i = 1; i <= 10; i++) {
    let docId: string;
    if (i === hitRank) {
      docId = groundTruth;
    } else {
      docId = `DOC_${String(Math.floor(Math.random() * 9000) + 1000)}`;
    }
    const score = isHit && i === hitRank ? 0.85 + Math.random() * 0.15 : 0.3 + Math.random() * 0.5;
    predictions.push({ docId, score: Number(score.toFixed(4)), rank: i });
  }
  return predictions;
}

const baseSamples: Array<Partial<Sample> & { query: string; groundTruth: string; isHit: boolean; isContaminated?: boolean; contaminationSource?: string }> = [
  { query: '如何开启向量索引的灰度发布', groundTruth: 'DOC_0001', isHit: true },
  { query: '向量召回的阈值怎么调', groundTruth: 'DOC_0002', isHit: true },
  { query: '离线Recall和线上不一致怎么办', groundTruth: 'DOC_0003', isHit: true },
  { query: 'MLOps值班手册', groundTruth: 'DOC_0004', isHit: true },
  { query: '特征快照怎么导出', groundTruth: 'DOC_0005', isHit: true },
  { query: '验证集污染检测方法', groundTruth: 'DOC_0006', isHit: true },
  { query: '人工改判的审批流程', groundTruth: 'DOC_0007', isHit: true },
  { query: '向量索引重建需要多久', groundTruth: 'DOC_0008', isHit: true },
  { query: '上线守门指标有哪些', groundTruth: 'DOC_0009', isHit: true },
  { query: 'embedding模型版本对比', groundTruth: 'DOC_0010', isHit: true },
  { query: '长尾query优化方案', groundTruth: 'DOC_0011', isHit: false, contributionToMetric: -0.05 },
  { query: '极端罕见case处理', groundTruth: 'DOC_0012', isHit: false, contributionToMetric: -0.04 },
  { query: '特定方言语义理解', groundTruth: 'DOC_0013', isHit: false, contributionToMetric: -0.03 },
  { query: '专业领域术语查询', groundTruth: 'DOC_0014', isHit: true },
  { query: '模糊搜索效果差', groundTruth: 'DOC_0015', isHit: true },
  { query: '同义词映射配置', groundTruth: 'DOC_0016', isHit: true },
  { query: '多语言向量检索', groundTruth: 'DOC_0017', isHit: true },
  { query: '增量更新与全量更新', groundTruth: 'DOC_0018', isHit: true },
  { query: '索引分片策略', groundTruth: 'DOC_0019', isHit: true },
  { query: 'QPS压测报告模板', groundTruth: 'DOC_0020', isHit: true },
  { query: 'P99延迟过高排查', groundTruth: 'DOC_0021', isHit: true },
  { query: '缓存命中率低怎么办', groundTruth: 'DOC_0022', isHit: true },
  { query: '特征快照版本回滚', groundTruth: 'DOC_0023', isHit: false, contributionToMetric: -0.02 },
  { query: '改判记录怎么导出', groundTruth: 'DOC_0024', isHit: true },
  { query: '污染样本标记规范', groundTruth: 'DOC_0025', isHit: true },
];

function buildSamples(): Sample[] {
  const samples: Sample[] = [];
  baseSamples.forEach((s, idx) => {
    const id = idx < 10 ? `s_00${idx + 1}` : idx === 10 ? 'demo-override-001' : idx === 20 ? 'demo-contam-001' : idx === 21 ? 'demo-contam-002' : `s_0${idx + 1}`;
    const predictions = generatePredictions(s.groundTruth, s.isHit);
    const topHit = predictions.find((p) => p.docId === s.groundTruth);
    const isContaminated = id === 'demo-contam-001' || id === 'demo-contam-002';
    const contaminationSource =
      id === 'demo-contam-001'
        ? '该样本在训练集中出现过，特征快照#123备注：疑似泄漏'
        : id === 'demo-contam-002'
        ? '特征快照标注：这条query的embedding是从线上日志直接捞的，并非推理生成'
        : undefined;
    samples.push({
      id,
      query: s.query,
      groundTruth: s.groundTruth,
      predictions,
      score: topHit?.score ?? predictions[0].score,
      isHit: s.isHit,
      isContaminated,
      contaminationSource,
      contributionToMetric: s.contributionToMetric ?? (s.isHit ? 0.01 : -0.01),
      latencyMs: isContaminated ? 3 + Math.random() * 2 : 8 + Math.random() * 30,
      rawSnapshot: {
        feature_version: 'v1.2.0',
        embedding_model: 'bge-large-zh-v1.5',
        query_analysis: {
          has_entity: s.query.length > 5,
          intent: 'faq',
        },
        indexed_at: '2026-06-15T08:00:00Z',
        snapshot_note: id === 'demo-override-001' ? '长尾case，线上占比极低' : '常规样本',
      },
    });
  });
  return samples;
}

const demoNotes: Note[] = [
  {
    id: 'note_001',
    snapshotId: 'snap_demo_v1',
    content: '本次快照补充了5条运营反馈的bad case，已关联JIRA-3421',
    author: '小林',
    createdAt: '2026-06-18 15:30:00',
  },
  {
    id: 'note_002',
    snapshotId: 'snap_demo_v1',
    content: '发现demo-contam-001和002两条疑似验证集污染，已标记但暂未剔除，等评审决定',
    author: '小林',
    createdAt: '2026-06-18 16:45:00',
  },
  {
    id: 'note_003',
    snapshotId: 'snap_demo_v09',
    content: 'v0.9版本整体指标偏低，主要是长尾query未优化，已在v1.0修复',
    author: '小林',
    createdAt: '2026-06-10 10:00:00',
  },
];

const demoAttachments: Attachment[] = [
  {
    id: 'att_001',
    snapshotId: 'snap_demo_v09',
    type: 'screenshot',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    description: 'v0.9版本守门指标截图 - Recall仅78%',
    createdAt: '2026-06-10 10:05:00',
  },
  {
    id: 'att_002',
    snapshotId: 'snap_demo_v1',
    type: 'link',
    url: 'https://example.atlassian.net/browse/JIRA-3421',
    description: 'JIRA-3421: 长尾query优化需求',
    createdAt: '2026-06-18 15:35:00',
  },
];

const demoOverrides: ManualOverride[] = [
  {
    id: 'over_001',
    snapshotId: 'snap_demo_v1',
    metricName: 'demo-override-001',
    oldValue: '不通过（拉低Recall）',
    newValue: '通过（人工改判）',
    oldPassed: false,
    newPassed: true,
    reason: '该query为长尾case，线上真实场景占比<0.1%，不影响整体质量',
    operator: '小林',
    createdAt: '2026-06-19 09:15:00',
  },
];

const demoCurrentSnapshot: Snapshot = {
  id: 'snap_demo_v1',
  name: '向量索引模型-产品搜索-v1.2.0',
  version: 'v1.2.0',
  createdAt: '2026-06-18 14:00:00',
  createdBy: '小林',
  description: '优化长尾query召回，调整embedding模型权重，预计提升Recall 3~5个点',
  samples: buildSamples(),
  notes: demoNotes.filter((n) => n.snapshotId === 'snap_demo_v1'),
  attachments: demoAttachments.filter((a) => a.snapshotId === 'snap_demo_v1'),
  overrides: demoOverrides,
};

const demoHistorySnapshot: Snapshot = {
  id: 'snap_demo_v09',
  name: '向量索引模型-产品搜索-v1.1.0',
  version: 'v1.1.0',
  createdAt: '2026-06-10 09:00:00',
  createdBy: '小林',
  description: '上次上线版本，长尾query效果较差，作为基线版本',
  samples: buildSamples().slice(0, 20),
  notes: demoNotes.filter((n) => n.snapshotId === 'snap_demo_v09'),
  attachments: demoAttachments.filter((a) => a.snapshotId === 'snap_demo_v09'),
  overrides: [],
};

export const demoSnapshotHistory: Snapshot[] = [demoCurrentSnapshot, demoHistorySnapshot];

export function getDemoCurrentSnapshot(): Snapshot {
  return demoCurrentSnapshot;
}

export function getDemoSnapshotHistory(): Snapshot[] {
  return demoSnapshotHistory;
}
