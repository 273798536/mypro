import type { Request, Response } from 'express';
import { mockBatches } from '../data/mockData';
import { dedupService } from '../services/DedupService';
import { historyService } from '../services/HistoryService';
import { exportService } from '../services/ExportService';
import type { Batch, ReviseConclusionReq, StartBatchReq, Material } from '@shared/types';

const store: Batch[] = JSON.parse(JSON.stringify(mockBatches));

export const listBatches = (_req: Request, res: Response<Batch[]>) => {
  res.json(store);
};

export const getBatch = (req: Request<{ id: string }>, res: Response<Batch | { error: string }>) => {
  const batch = store.find((b) => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  res.json(batch);
};

export const startBatch = (req: Request<{ id: string }, any, StartBatchReq>, res: Response<Batch | { error: string }>) => {
  const idx = store.findIndex((b) => b.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '批次不存在' });
  if (store[idx].status === 'running' && !req.body.force) {
    return res.status(400).json({ error: '批次正在复核中' });
  }
  store[idx] = { ...store[idx], status: 'running', conclusionSummary: '复核中...' };
  setTimeout(() => {
    store[idx] = {
      ...store[idx],
      status: 'completed',
      conclusion: '复核完成：材料齐备，税费计算一致，回款拆分无误',
      conclusionSummary: '已完成 · 复核通过',
    };
  }, 1200);
  res.json(store[idx]);
};

export const rerunBatch = (req: Request<{ id: string }>, res: Response<Batch | { error: string }>) => {
  const idx = store.findIndex((b) => b.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '批次不存在' });
  store[idx] = { ...store[idx], status: 'running', conclusionSummary: '重跑中...' };
  setTimeout(() => {
    store[idx] = {
      ...store[idx],
      status: 'completed',
      conclusion: '重跑完成：已根据最新材料重新计算税费并核验回款拆分',
      conclusionSummary: '已完成 · 重跑通过',
    };
  }, 1200);
  res.json(store[idx]);
};

export const uploadMaterials = (
  req: Request<{ id: string }, any, { materials: Material[] }>,
  res: Response<Batch | { error: string }>
) => {
  const idx = store.findIndex((b) => b.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '批次不存在' });
  const merged = dedupService.dedup(store[idx].materials, req.body.materials || []);
  store[idx] = { ...store[idx], materials: merged, materialCount: dedupService.countUnique(merged) };
  res.json(store[idx]);
};

export const getPayments = (req: Request<{ id: string }>, res: Response) => {
  const batch = store.find((b) => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  res.json(batch.payments);
};

export const getHistory = (req: Request<{ id: string }>, res: Response) => {
  const batch = store.find((b) => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  res.json(batch.history);
};

export const reviseConclusion = (
  req: Request<{ id: string }, any, ReviseConclusionReq>,
  res: Response<Batch | { error: string }>
) => {
  const idx = store.findIndex((b) => b.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '批次不存在' });
  const { newConclusion, reviseReason, newRemark } = req.body;
  if (!newConclusion || !reviseReason) {
    return res.status(400).json({ error: '新结论与改判原因为必填' });
  }
  const record = historyService.buildRecord({
    operator: '阿敏',
    oldMaterials: store[idx].materials,
    newRemark: newRemark || '',
    reviseReason,
    oldConclusion: store[idx].conclusion,
    newConclusion,
  });
  store[idx] = historyService.appendHistory(store[idx], record);
  res.json(store[idx]);
};

export const exportCSV = (req: Request<{ id: string }>, res: Response) => {
  const batch = store.find((b) => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  const consistencyVerified = exportService.verifyConsistency(batch);
  const { filename, content } = exportService.toCSV(batch);
  res.json({ filename, content, consistencyVerified });
};
