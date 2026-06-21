import { Router } from 'express';
import { RecordService } from '../services';
import { idempotency } from '../middleware/idempotency';
import type { ImportRecordInput, RecordStatus, UpdateRecordInput } from '../../shared/types';

const router = Router();

router.get('/api/records', (req, res) => {
  const status = req.query.status as RecordStatus | undefined;
  const keyword = (req.query.keyword as string) || undefined;
  const list = RecordService.list({ status, keyword });
  res.json({ items: list, total: list.length });
});

router.get('/api/records/:id', (req, res) => {
  const rec = RecordService.getById(req.params.id);
  if (!rec) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  res.json(rec);
});

router.get('/api/records/:id/versions', (req, res) => {
  const rec = RecordService.getById(req.params.id);
  if (!rec) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  const versions = RecordService.listVersions(req.params.id);
  res.json({ items: versions });
});

router.get('/api/records/:id/computation', (req, res) => {
  const rec = RecordService.getById(req.params.id);
  if (!rec) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  const steps = RecordService.getComputation(req.params.id);
  res.json({ steps });
});

router.post('/api/records/import', idempotency, (req, res) => {
  const body = req.body as { items?: ImportRecordInput[]; operator?: string };
  if (!body.items || !Array.isArray(body.items)) {
    res.status(400).json({ error: 'items 字段缺失或非数组' });
    return;
  }
  const operator = body.operator || '阿乔';
  const items = RecordService.importBatch(body.items, operator);
  res.status(201).json({ items, count: items.length });
});

router.post('/api/records/:id/confirm', idempotency, (req, res) => {
  const operator = (req.body as any)?.operator || '阿乔';
  const rec = RecordService.confirm(req.params.id, operator);
  if (!rec) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  res.json(rec);
});

router.post('/api/records/:id/revoke', idempotency, (req, res) => {
  const operator = (req.body as any)?.operator || '阿乔';
  const rec = RecordService.revoke(req.params.id, operator);
  if (!rec) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  res.json(rec);
});

router.post('/api/records/:id/update', idempotency, (req, res) => {
  const input = req.body as UpdateRecordInput;
  if (!input.operator) {
    res.status(400).json({ error: 'operator 字段缺失' });
    return;
  }
  const rec = RecordService.update(req.params.id, input);
  if (!rec) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  res.json(rec);
});

router.get('/api/summary', (_req, res) => {
  res.json(RecordService.summary());
});

router.get('/api/export', (req, res) => {
  const status = req.query.status as RecordStatus | undefined;
  const keyword = (req.query.keyword as string) || undefined;
  const list = RecordService.list({ status, keyword });

  const header = ['编号', '参数版本', '状态', '边界结论', '是否迟到材料', '编号不一致', '备注', '当前版本', '创建时间', '更新时间'];
  const rows = list.map((r) => [
    r.recordNo,
    r.paramVersion,
    r.status,
    r.boundaryResult,
    r.isLateSubmission ? '是' : '否',
    r.noMismatch ? '是' : '否',
    (r.remark || '').replace(/"/g, '""'),
    String(r.currentVersion),
    r.createdAt,
    r.updatedAt,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((c) => `"${String(c)}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="topo-review-export.csv"');
  res.send('\uFEFF' + csv);
});

export default router;
