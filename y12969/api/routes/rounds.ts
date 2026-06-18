import { Router, type Request, type Response } from 'express';
import { getDb, genId } from '../db/index.js';
import type { AuditRound, CapacityTrendPoint } from '../../shared/types.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, status, started_at as startedAt, archived_at as archivedAt, operator
       FROM audit_round ORDER BY started_at DESC`,
    )
    .all() as AuditRound[];
  res.json({ success: true, data: rows });
});

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, operator = '审计员' } = req.body || {};
  if (!name) {
    res.status(400).json({ success: false, error: '缺少轮次名称' });
    return;
  }
  const id = genId('round');
  const now = Date.now();
  db.prepare(
    `INSERT INTO audit_round (id, name, status, started_at, operator)
     VALUES (?, ?, 'active', ?, ?)`,
  ).run(id, name, now, operator);

  const row = db
    .prepare(
      `SELECT id, name, status, started_at as startedAt, archived_at as archivedAt, operator
       FROM audit_round WHERE id = ?`,
    )
    .get(id) as AuditRound;
  res.json({ success: true, data: row });
});

router.post('/:id/archive', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const now = Date.now();
  const result = db
    .prepare(`UPDATE audit_round SET status = 'archived', archived_at = ? WHERE id = ?`)
    .run(now, id);
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '轮次不存在' });
    return;
  }
  res.json({ success: true });
});

router.get('/:id/trend', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const round = db.prepare('SELECT * FROM audit_round WHERE id = ?').get(id);
  if (!round) {
    res.status(404).json({ success: false, error: '轮次不存在' });
    return;
  }

  const base = round.started_at as number;
  const points: CapacityTrendPoint[] = [];
  const explanations = [
    '日常业务量平稳，索引空间占比正常',
    '周末订单高峰写入，备份容量环比上升 12%',
    '新业务 product_sku 上线，表结构调整导致类型漂移预警',
    'user_order 字段扩容从 INT 升级到 BIGINT，容量增长',
    '索引优化落地，慢查询下降，整体趋势可控',
    '季度结算报表跑批，临时数据容量上浮',
    '归档策略执行，冷数据迁移后容量回落',
  ];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(base - i * 86400000 * 2);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const trend = 1 + (13 - i) * 0.05 + Math.sin(i / 2) * 0.08;
    const backupSize = Math.round(6000000 * trend);
    const indexSize = Math.round(1800000 * trend * (0.9 + Math.random() * 0.2));
    points.push({
      date,
      totalSize: backupSize + indexSize,
      backupSize,
      indexSize,
      explanation: explanations[i % explanations.length],
    });
  }
  res.json({ success: true, data: points });
});

export default router;
