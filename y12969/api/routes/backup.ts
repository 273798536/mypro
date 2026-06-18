import { Router, type Request, type Response } from 'express';
import { getDb, genId } from '../db/index.js';
import type { BackupRecord, TypeDriftDetail } from '../../shared/types.js';

const router = Router();

router.post('/import', (req: Request, res: Response) => {
  const db = getDb();
  const { roundId, records, operator = '审计员' } = req.body || {};
  if (!roundId || !Array.isArray(records)) {
    res.status(400).json({ success: false, error: '缺少 roundId 或 records' });
    return;
  }

  const insertRecord = db.prepare(`
    INSERT INTO backup_record
    (id, round_id, table_name, field_name, backup_type, report_type,
     backup_size, report_size, has_type_drift, has_size_mismatch, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  const insertAnomaly = db.prepare(`
    INSERT INTO anomaly
    (id, round_id, record_id, type, description, evidence, suggested_action, interception_rule, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  const now = Date.now();
  const imported: string[] = [];

  const tx = db.transaction(() => {
    for (const r of records) {
      const id = genId('rec');
      const hasTypeDrift = r.backupType !== r.reportType;
      const hasSizeMismatch = Math.abs((r.backupSize ?? 0) - (r.reportSize ?? 0)) > 0.05 * (r.backupSize ?? 0);
      insertRecord.run(
        id,
        roundId,
        r.tableName,
        r.fieldName,
        r.backupType,
        r.reportType,
        r.backupSize ?? 0,
        r.reportSize ?? 0,
        hasTypeDrift ? 1 : 0,
        hasSizeMismatch ? 1 : 0,
        now,
        now,
      );
      imported.push(id);

      if (hasTypeDrift) {
        const aId = genId('anom');
        insertAnomaly.run(
          aId,
          roundId,
          id,
          'type_drift',
          `字段 ${r.tableName}.${r.field} 类型漂移：备份为 ${r.backupType}，报表统计为 ${r.reportType}`,
          `备份：${r.backupType} / 报表：${r.reportType}`,
          'supply_material',
          '规则 #AUD-203：字段类型精度缩窄将导致数据截断，审计合规要求备份与报表口径完全一致',
          now,
          now,
        );
      }
      if (hasSizeMismatch && !hasTypeDrift) {
        const aId = genId('anom');
        insertAnomaly.run(
          aId,
          roundId,
          id,
          'data_mismatch',
          `字段 ${r.tableName}.${r.field} 容量数据不一致`,
          `备份 ${r.backupSize} 字节 / 报表 ${r.reportSize} 字节`,
          'adjust_caliber',
          null,
          now,
          now,
        );
      }
    }
  });
  tx();

  res.json({ success: true, data: { importedCount: imported.length, ids: imported } });
});

router.get('/records', (req: Request, res: Response) => {
  const db = getDb();
  const { roundId } = req.query;
  if (!roundId) {
    res.status(400).json({ success: false, error: '缺少 roundId' });
    return;
  }
  const rows = db
    .prepare(
      `SELECT id, round_id as roundId, table_name as tableName, field_name as fieldName,
              backup_type as backupType, report_type as reportType,
              backup_size as backupSize, report_size as reportSize,
              has_type_drift as hasTypeDrift, has_size_mismatch as hasSizeMismatch,
              status, created_at as createdAt, updated_at as updatedAt
       FROM backup_record WHERE round_id = ? ORDER BY table_name, field_name`,
    )
    .all(roundId) as BackupRecord[];
  const mapped = rows.map((r) => ({
    ...r,
    hasTypeDrift: Boolean(r.hasTypeDrift),
    hasSizeMismatch: Boolean(r.hasSizeMismatch),
  }));
  res.json({ success: true, data: mapped });
});

router.get('/records/:id/type-drift', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM backup_record WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ success: false, error: '记录不存在' });
    return;
  }
  const detail: TypeDriftDetail = {
    recordId: id,
    tableName: row.table_name,
    fieldName: row.field_name,
    history: [
      { version: 'v2026.03', type: row.backup_type, timestamp: Date.now() - 86400000 * 60 },
      { version: 'v2026.01', type: row.report_type, timestamp: Date.now() - 86400000 * 120 },
      { version: 'v2025.04', type: row.report_type, timestamp: Date.now() - 86400000 * 200 },
    ],
    interceptionRule:
      '规则 #AUD-203：字段类型精度缩窄将导致数据截断，审计合规要求备份与报表口径完全一致。历史版本类型升级需要同步更新指标报表统计口径，并提交变更审批单。',
    impactScope: [
      '月度容量核算报表 DB_CAPACITY_MONTHLY',
      '审计对账脚本 compare_backup_schema.sql',
      '下游数据仓库 ODS 层字段映射规则',
    ],
  };
  res.json({ success: true, data: detail });
});

export default router;
