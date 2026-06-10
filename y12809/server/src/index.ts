import express from 'express';
import cors from 'cors';
import {
  samples,
  cultivationRecords,
  lineageNodes,
  sequencingResults,
  batchEffectReports,
  reviewRecords,
  generateMonthlyHandover,
} from './data';
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
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const generateId = () => uuidv4();

let localSamples: Sample[] = [...samples];
let localCultivation: CultivationRecord[] = [...cultivationRecords];
let localLineage: LineageNode[] = [...lineageNodes];
let localReview: ReviewRecord[] = [...reviewRecords];

app.get('/api/samples', (req, res) => {
  const { status, reviewStatus, batchId, isUnavailable } = req.query;
  let result = [...localSamples];
  if (status) {
    result = result.filter((s) => s.status === status);
  }
  if (reviewStatus) {
    result = result.filter((s) => s.reviewStatus === reviewStatus);
  }
  if (batchId) {
    result = result.filter((s) => s.batchId === batchId);
  }
  if (isUnavailable !== undefined) {
    result = result.filter((s) => s.isUnavailable === (isUnavailable === 'true'));
  }
  res.json(result);
});

app.get('/api/samples/:id', (req, res) => {
  const sample = localSamples.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  res.json(sample);
});

app.put('/api/samples/:id', (req, res) => {
  const idx = localSamples.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  localSamples[idx] = {
    ...localSamples[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  res.json(localSamples[idx]);
});

app.post('/api/samples/:id/annotations', (req, res) => {
  const sample = localSamples.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  const now = new Date().toISOString();
  const annotation: RegionAnnotation = {
    id: generateId(),
    ...req.body,
    createdAt: now,
    updatedAt: now,
  };
  sample.annotations.push(annotation);
  sample.updatedAt = now;
  res.json(annotation);
});

app.put('/api/samples/:id/annotations/:aid', (req, res) => {
  const sample = localSamples.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  const aIdx = sample.annotations.findIndex((a) => a.id === req.params.aid);
  if (aIdx === -1) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }
  const now = new Date().toISOString();
  sample.annotations[aIdx] = {
    ...sample.annotations[aIdx],
    ...req.body,
    updatedAt: now,
  };
  sample.updatedAt = now;
  res.json(sample.annotations[aIdx]);
});

app.delete('/api/samples/:id/annotations/:aid', (req, res) => {
  const sample = localSamples.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  sample.annotations = sample.annotations.filter((a) => a.id !== req.params.aid);
  sample.updatedAt = new Date().toISOString();
  res.json({ success: true });
});

app.post('/api/samples/:id/review', (req, res) => {
  const sample = localSamples.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  const { action, notes, reviewer } = req.body;
  const now = new Date().toISOString();
  const review: ReviewRecord = {
    id: generateId(),
    sampleId: sample.id,
    reviewer,
    action,
    notes,
    createdAt: now,
  };
  localReview.push(review);

  const statusMap: Record<string, Sample['reviewStatus']> = {
    approve: 'approved',
    reject: 'rejected',
    flag: 'flagged',
    comment: sample.reviewStatus,
  };
  sample.reviewStatus = statusMap[action] || sample.reviewStatus;
  sample.reviewer = reviewer;
  sample.reviewNotes = notes;
  sample.reviewedAt = now;
  sample.updatedAt = now;

  if (action === 'reject') {
    sample.isUnavailable = true;
    sample.unavailableReason = notes || '复核不通过';
  }

  if (sample.reviewStatus === 'flagged' || action === 'flag') {
    const lineage = localLineage.find((l) => l.sampleId === sample.id);
    if (lineage) {
      lineage.status = 'corrected';
      lineage.updatedAt = now;
    }
  }

  res.json({ sample, review });
});

app.get('/api/samples/:id/reviews', (req, res) => {
  const records = localReview.filter((r) => r.sampleId === req.params.id);
  res.json(records);
});

app.get('/api/batches', (req, res) => {
  const batchIds = [...new Set(localSamples.map((s) => s.batchId))];
  const result = batchIds.map((id) => {
    const batchSamples = localSamples.filter((s) => s.batchId === id);
    return {
      id,
      sampleCount: batchSamples.length,
      statuses: {
        normal: batchSamples.filter((s) => s.status === 'normal').length,
        boundary: batchSamples.filter((s) => s.status === 'boundary').length,
        bad: batchSamples.filter((s) => s.status === 'bad').length,
      },
      report: batchEffectReports.find((r) => r.batchId === id),
    };
  });
  res.json(result);
});

app.get('/api/batches/:id/report', (req, res) => {
  const report = batchEffectReports.find((r) => r.batchId === req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Batch report not found' });
    return;
  }
  res.json(report);
});

app.get('/api/sequencing/sample/:sampleId', (req, res) => {
  const result = sequencingResults.filter((r) => r.sampleId === req.params.sampleId);
  res.json(result);
});

app.get('/api/sequencing/batch/:batchId', (req, res) => {
  const results = sequencingResults.filter((r) => r.batchId === req.params.batchId);
  res.json(results);
});

app.get('/api/sequencing/all', (req, res) => {
  res.json(sequencingResults);
});

app.get('/api/lineage/:lineageId', (req, res) => {
  const lineageId = req.params.lineageId;
  const lineageNodesForSample = localLineage.filter((n) => n.sampleId.startsWith(lineageId) || n.id.startsWith(lineageId));
  const samplesInLineage = localSamples.filter((s) => s.lineageId === lineageId);
  const allNodes = samplesInLineage.map((s) => localLineage.find((n) => n.sampleId === s.id)).filter(Boolean) as LineageNode[];
  res.json({
    lineageId,
    nodes: allNodes,
    samples: samplesInLineage,
  });
});

app.get('/api/samples/:id/lineage', (req, res) => {
  const sample = localSamples.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample not found' });
    return;
  }
  const lineageId = sample.lineageId;
  const samplesInLineage = localSamples.filter((s) => s.lineageId === lineageId);
  const nodes = localLineage.filter((n) => samplesInLineage.some((s) => s.id === n.sampleId));
  res.json({ lineageId, nodes, samples: samplesInLineage });
});

app.put('/api/lineage/correct', (req, res) => {
  const { sampleId, newParentId, notes, operator } = req.body;
  const now = new Date().toISOString();
  const node = localLineage.find((n) => n.sampleId === sampleId);
  if (!node) {
    res.status(404).json({ error: 'Lineage node not found' });
    return;
  }
  const oldNode = { ...node };
  const correctedNode: LineageNode = {
    ...oldNode,
    id: `${node.id}-corrected-${generateId().slice(0, 6)}`,
    parentId: newParentId || node.parentId,
    status: 'corrected',
    correctedFromId: node.id,
    updatedAt: now,
  };
  node.status = 'superseded';
  node.updatedAt = now;
  localLineage.push(correctedNode);
  const sample = localSamples.find((s) => s.id === sampleId);
  if (sample) {
    sample.reviewStatus = 'flagged';
    sample.updatedAt = now;
    const review: ReviewRecord = {
      id: generateId(),
      sampleId,
      reviewer: operator || '系统修正',
      action: 'flag',
      notes: notes || '谱系人工修正',
      createdAt: now,
    };
    localReview.push(review);
  }
  res.json({ oldNode, correctedNode, sample });
});

app.get('/api/cultivation/:sampleId', (req, res) => {
  const records = localCultivation.filter((r) => r.sampleId === req.params.sampleId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(records);
});

app.post('/api/cultivation', (req, res) => {
  const now = new Date().toISOString();
  const record: CultivationRecord = {
    id: generateId(),
    ...req.body,
    isSupplement: true,
    createdAt: now,
  };
  localCultivation.push(record);
  const sample = localSamples.find((s) => s.id === record.sampleId);
  if (sample) {
    sample.updatedAt = now;
  }
  const relatedSamples = localSamples.filter((s) => s.lineageId === sample?.lineageId);
  relatedSamples.forEach((s) => {
    const lineage = localLineage.find((l) => l.sampleId === s.id);
    if (lineage) {
      lineage.updatedAt = now;
    }
  });
  res.json(record);
});

app.get('/api/monthly-handover/:month', (req, res) => {
  const month = req.params.month || '2026-06';
  const report = generateMonthlyHandover(month);
  res.json(report);
});

app.get('/api/report/export/:batchId?', (req, res) => {
  const batchId = req.params.batchId;
  const targetSamples = batchId ? localSamples.filter((s) => s.batchId === batchId) : localSamples;
  const targetReports = batchId ? batchEffectReports.filter((r) => r.batchId === batchId) : batchEffectReports.filter((r) => r.detected);
  const sequencingData = batchId
    ? sequencingResults.filter((r) => r.batchId === batchId)
    : sequencingResults;

  const sections: string[] = [];
  sections.push('# 病理切片区域复核报告');
  sections.push(`\n生成日期：${new Date().toLocaleDateString('zh-CN')}`);
  if (batchId) sections.push(`\n目标批次：${batchId}`);
  sections.push('\n## 一、样本概况');
  sections.push(`- 总样本数：${targetSamples.length}`);
  sections.push(`- 正常样本：${targetSamples.filter((s) => s.status === 'normal').length}`);
  sections.push(`- 边界样本：${targetSamples.filter((s) => s.status === 'boundary').length}`);
  sections.push(`- 明显坏样本：${targetSamples.filter((s) => s.status === 'bad').length}`);
  sections.push(`- 不可用记录：${targetSamples.filter((s) => s.isUnavailable).length}`);
  sections.push(`\n## 二、批次效应检测说明`);
  if (targetReports.length === 0) {
    sections.push('\n**结论：未检测到显著批次效应，各批次样本分布均匀。');
  } else {
    targetReports.forEach((report) => {
      sections.push(`\n### 批次 ${report.batchId}`);
      sections.push(`- **严重程度**：${report.severity === 'severe' ? '严重 ⚠️' : report.severity === 'moderate' ? '中度' : '轻度'}`);
      sections.push(`- **PC1方差贡献**：${report.pc1Variance.toFixed(1)}%`);
      sections.push(`- **聚类模式**：${report.clusteringPattern}`);
      sections.push(`\n**为什么被拦下来：**`);
      report.possibleCauses.forEach((cause, i) => {
        sections.push(`  ${i + 1}. ${cause}`);
      });
      sections.push(`\n**处理建议：**`);
      report.recommendations.forEach((rec, i) => {
        sections.push(`  ${i + 1}. ${rec}`);
      });
    });
  }
  sections.push('\n## 三、测序质量汇总');
  const avgQuality = sequencingData.reduce((sum, s) => sum + s.qualityScore, 0) / sequencingData.length;
  const avgContamination = sequencingData.reduce((sum, s) => sum + s.contaminationRate, 0) / sequencingData.length;
  sections.push(`- 平均质量评分：${avgQuality.toFixed(1)}`);
  sections.push(`- 平均污染率：${avgContamination.toFixed(2)}%`);
  sections.push('\n## 四、不可用样本明细');
  const unavailable = targetSamples.filter((s) => s.isUnavailable);
  if (unavailable.length === 0) {
    sections.push('\n无不可用样本。');
  } else {
    unavailable.forEach((s) => {
      sections.push(`- **${s.code} (${s.name})`);
      sections.push(`  原因：${s.unavailableReason}`);
      sections.push(`  质量评分：${s.qualityScore}`);
    });
  }
  const reportText = sections.join('\n');
  res.setHeader('Content-Type', 'application/octet');
  res.setHeader('Content-Disposition', `attachment; filename="pathology-review-report.md`);
  res.send(reportText);
});

app.get('/api/dashboard/stats', (req, res) => {
  const total = localSamples.length;
  const approved = localSamples.filter((s) => s.reviewStatus === 'approved').length;
  const pending = localSamples.filter((s) => s.reviewStatus === 'pending').length;
  const flagged = localSamples.filter((s) => s.reviewStatus === 'flagged' || s.reviewStatus === 'rejected').length;
  const unavailable = localSamples.filter((s) => s.isUnavailable).length;
  const avgQuality =
    localSamples.reduce((sum, s) => sum + s.qualityScore, 0) / total;
  res.json({
    total,
    approved,
    pending,
    flagged,
    unavailable,
    avgQuality: avgQuality.toFixed(1),
    batchCount: [...new Set(localSamples.map((s) => s.batchId))].length,
    batchesWithIssues: batchEffectReports.filter((r) => r.detected).length,
  });
});

app.listen(PORT, () => {
  console.log(`病理切片区域复核系统后端已启动: http://localhost:${PORT}`);
});
