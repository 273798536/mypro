import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import * as XLSX from 'xlsx';
import type {
  AuditRound,
  BackupRecord,
  Anomaly,
  IndexSuggestion,
  ReportData,
} from '../../shared/types.js';

const router = Router();

router.get('/:roundId/preview', (req: Request, res: Response) => {
  const db = getDb();
  const { roundId } = req.params;

  const round = db
    .prepare(
      `SELECT id, name, status, started_at as startedAt, archived_at as archivedAt, operator
       FROM audit_round WHERE id = ?`,
    )
    .get(roundId) as AuditRound | undefined;
  if (!round) {
    res.status(404).json({ success: false, error: '轮次不存在' });
    return;
  }

  const records = db
    .prepare(
      `SELECT id, round_id as roundId, table_name as tableName, field_name as fieldName,
              backup_type as backupType, report_type as reportType,
              backup_size as backupSize, report_size as reportSize,
              has_type_drift as hasTypeDrift, has_size_mismatch as hasSizeMismatch,
              status, created_at as createdAt, updated_at as updatedAt
       FROM backup_record WHERE round_id = ?`,
    )
    .all(roundId) as BackupRecord[];

  const anomalies = db
    .prepare(
      `SELECT id, round_id as roundId, record_id as recordId, type, description, evidence,
              suggested_action as suggestedAction, interception_rule as interceptionRule,
              status, created_at as createdAt, updated_at as updatedAt
       FROM anomaly WHERE round_id = ?`,
    )
    .all(roundId) as Anomaly[];

  const suggestions = db
    .prepare(
      `SELECT id, round_id as roundId, table_name as tableName, suggested_index as suggestedIndex,
              reason, expected_benefit as expectedBenefit, priority,
              related_work_order as relatedWorkOrder, is_active as isActive,
              attribution_updated_at as attributionUpdatedAt, created_at as createdAt
       FROM index_suggestion WHERE round_id = ?`,
    )
    .all(roundId) as IndexSuggestion[];

  const typeDriftCount = anomalies.filter((a) => a.type === 'type_drift').length;
  const mismatchCount = anomalies.filter((a) => a.type === 'data_mismatch').length;
  const slowQueryCount = anomalies.filter((a) => a.type === 'slow_query').length;
  const resolvedCount = anomalies.filter((a) => a.status === 'resolved' || a.status === 'confirmed').length;

  const data: ReportData = {
    round,
    summary: {
      totalRecords: records.length,
      typeDriftCount,
      mismatchCount,
      slowQueryCount,
      resolvedCount,
    },
    records: records.map((r) => ({ ...r, hasTypeDrift: Boolean(r.hasTypeDrift), hasSizeMismatch: Boolean(r.hasSizeMismatch) })),
    anomalies,
    suggestions: suggestions.map((s) => ({ ...s, isActive: Boolean(s.isActive) })),
    generatedAt: Date.now(),
  };
  res.json({ success: true, data });
});

router.get('/:roundId/export.xlsx', (req: Request, res: Response) => {
  const db = getDb();
  const { roundId } = req.params;
  const round = db.prepare('SELECT * FROM audit_round WHERE id = ?').get(roundId);
  if (!round) {
    res.status(404).json({ success: false, error: '轮次不存在' });
    return;
  }

  const summaryRows = [
    ['审计轮次', round.name],
    ['操作员', round.operator],
    ['开始时间', new Date(round.started_at).toLocaleString()],
    ['状态', round.status === 'active' ? '进行中' : '已归档'],
    ['导出时间', new Date().toLocaleString()],
  ];

  const records = db
    .prepare(
      `SELECT table_name as 表名, field_name as 字段名,
              backup_type as 备份字段类型, report_type as 报表字段类型,
              backup_size as 备份容量字节, report_size as 报表容量字节,
              CASE WHEN has_type_drift = 1 THEN '是' ELSE '否' END as 是否类型漂移,
              CASE WHEN has_size_mismatch = 1 THEN '是' ELSE '否' END as 是否容量不一致,
              status as 状态
       FROM backup_record WHERE round_id = ?`,
    )
    .all(roundId);

  const anomalies = db
    .prepare(
      `SELECT type as 异常类型, description as 问题描述, evidence as 证据,
              suggested_action as 建议操作, interception_rule as 拦截规则,
              status as 状态
       FROM anomaly WHERE round_id = ?`,
    )
    .all(roundId);

  const suggestions = db
    .prepare(
      `SELECT table_name as 表名, suggested_index as 建议索引, reason as 归因,
              expected_benefit as 预期收益, priority as 优先级,
              related_work_order as 关联工单, is_active as 生效中
       FROM index_suggestion WHERE round_id = ?`,
    )
    .all(roundId);

  const devNotes = [
    ['研发视角：字段类型漂移拦截说明'],
    [''],
    ['规则 #AUD-203：审计合规要求备份与指标报表字段类型完全一致。'],
    ['当字段类型从高精度缩窄到低精度（如 BIGINT → INT、DECIMAL(18,4) → DECIMAL(10,2)、TEXT → VARCHAR(255)）时，'],
    ['系统自动标记异常并拦截，防止数据截断、数值溢出、字符被截等风险。'],
    ['处理方式：'],
    ['  1) 若业务真实需要精度缩窄，提交变更审批单，在本系统中上传材料后走"补材料"流程；'],
    ['  2) 若指标报表统计口径错误，修改报表统计逻辑，在本系统走"改口径"流程；'],
    ['  3) 研发可参考本报告"索引建议"Sheet 一并修复慢查询归因。'],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), '汇总');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records), '备份记录');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(anomalies), '异常明细');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suggestions), '索引建议');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(devNotes), '研发说明');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = `audit_report_${round.name}_${Date.now()}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});

export default router;
