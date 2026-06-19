const reportDao = require('../dao/reportDao');
const migrationDao = require('../dao/migrationDao');
const reviewDao = require('../dao/reviewDao');
const materialDao = require('../dao/materialDao');
const auditDao = require('../dao/auditDao');
const reviewService = require('./reviewService');
const materialService = require('./materialService');

async function generateRoundSummaryReport(migrationId, roundId, generatedBy) {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const round = await reviewService.getReviewRound(roundId);
  if (!round) throw new Error('复核轮次不存在');

  const itemsSummary = round.review_items.map(item => ({
    item_type: item.item_type,
    item_type_label: reviewService.getItemTypeLabel(item.item_type),
    material_title: item.material.title,
    material_type: item.material.type,
    status: item.status,
    initial_conclusion: item.initial_conclusion,
    final_conclusion: item.final_conclusion,
    reason: item.reason,
    reviewed_by: item.reviewed_by,
    reviewed_at: item.reviewed_at,
    snapshot_count: item.snapshots.length
  }));

  const approvedCount = itemsSummary.filter(i => i.status === 'approved').length;
  const rejectedCount = itemsSummary.filter(i => i.status === 'rejected').length;
  const reevaluatedCount = itemsSummary.filter(i => i.status === 'reevaluated').length;

  const content = {
    migration_name: migration.migration_name,
    environment: migration.environment,
    execution_count: migration.execution_count,
    round_number: round.round_number,
    reviewer: round.reviewer,
    started_at: round.started_at,
    completed_at: round.completed_at,
    conclusion_summary: round.conclusion_summary,
    statistics: {
      total_items: itemsSummary.length,
      approved: approvedCount,
      rejected: rejectedCount,
      reevaluated: reevaluatedCount
    },
    items: itemsSummary,
    lock_wait_issue: migration.lock_wait_issue,
    lock_wait_material_id: migration.lock_wait_material_id
  };

  const report = await reportDao.createReport({
    migration_record_id: migrationId,
    review_round_id: roundId,
    report_type: reportDao.REPORT_TYPES.ROUND_SUMMARY,
    content,
    generated_by: generatedBy
  });

  return report;
}

async function generateLockWaitAnalysisReport(migrationId, generatedBy) {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  let lockMaterial = null;
  if (migration.lock_wait_material_id) {
    lockMaterial = await materialDao.getMaterialById(migration.lock_wait_material_id);
  }

  const content = {
    migration_name: migration.migration_name,
    environment: migration.environment,
    has_lock_wait_issue: migration.lock_wait_issue,
    stuck_material: lockMaterial ? {
      id: lockMaterial.id,
      title: lockMaterial.title,
      type: lockMaterial.type,
      type_label: materialService.getMaterialTypeLabel(lockMaterial.type),
      source_env: lockMaterial.source_env,
      remark: lockMaterial.remark,
      version: lockMaterial.version
    } : null,
    analysis: lockMaterial ? analyzeLockWaitCause(lockMaterial) : null
  };

  const report = await reportDao.createReport({
    migration_record_id: migrationId,
    report_type: reportDao.REPORT_TYPES.LOCK_WAIT_ANALYSIS,
    content,
    generated_by: generatedBy
  });

  return report;
}

async function generateConclusionComparisonReport(migrationId, roundId, generatedBy) {
  const round = await reviewDao.getReviewRoundById(roundId);
  if (!round) throw new Error('复核轮次不存在');

  const items = await reviewDao.getReviewItemsByRound(roundId);
  const comparisons = [];

  for (const item of items) {
    const comparison = await reviewService.getConclusionComparison(item.id);
    comparisons.push(comparison);
  }

  const content = {
    round_number: round.round_number,
    items_count: comparisons.length,
    comparisons: comparisons.map(c => ({
      item_type: c.item_type,
      item_type_label: reviewService.getItemTypeLabel(c.item_type),
      material_title: c.material_title,
      side_by_side: {
        old: c.side_by_side.old ? {
          version: c.side_by_side.old.snapshot_version,
          conclusion: c.side_by_side.old.conclusion_text,
          status: c.side_by_side.old.status,
          operator: c.side_by_side.old.snapshot_by,
          at: c.side_by_side.old.snapshot_at
        } : null,
        new: c.side_by_side.new ? {
          version: c.side_by_side.new.snapshot_version,
          conclusion: c.side_by_side.new.conclusion_text,
          status: c.side_by_side.new.status,
          operator: c.side_by_side.new.snapshot_by,
          at: c.side_by_side.new.snapshot_at
        } : null
      },
      all_versions: c.versions
    }))
  };

  const report = await reportDao.createReport({
    migration_record_id: migrationId,
    review_round_id: roundId,
    report_type: reportDao.REPORT_TYPES.CONCLUSION_COMPARISON,
    content,
    generated_by: generatedBy
  });

  return report;
}

async function generateFullAuditReport(migrationId, generatedBy) {
  const migration = await migrationDao.getMigrationById(migrationId);
  if (!migration) throw new Error('迁移记录不存在');

  const rounds = await reviewDao.getReviewRoundsByMigration(migrationId);
  const auditLogs = await auditDao.getAuditLogsByEntity('migration', migrationId);

  const roundsDetail = [];
  for (const round of rounds) {
    const items = await reviewDao.getReviewItemsByRound(round.id);
    const itemsDetail = [];
    for (const item of items) {
      const material = await materialDao.getMaterialById(item.material_id);
      const snapshots = await reviewDao.getSnapshotsByReviewItem(item.id);
      itemsDetail.push({
        ...item,
        material: { title: material.title, type: material.type },
        snapshots
      });
    }
    roundsDetail.push({
      ...round,
      items: itemsDetail
    });
  }

  const content = {
    migration: {
      id: migration.id,
      name: migration.migration_name,
      environment: migration.environment,
      execution_count: migration.execution_count,
      status: migration.status,
      created_at: migration.created_at,
      updated_at: migration.updated_at
    },
    rounds: roundsDetail,
    audit_logs: auditLogs,
    total_rounds: rounds.length,
    total_audit_logs: auditLogs.length
  };

  const report = await reportDao.createReport({
    migration_record_id: migrationId,
    report_type: reportDao.REPORT_TYPES.FULL_AUDIT,
    content,
    generated_by: generatedBy
  });

  return report;
}

async function getReport(id) {
  return reportDao.getReportById(id);
}

async function listReports(filters) {
  return reportDao.listReports(filters);
}

async function getReportsByMigration(migrationId) {
  return reportDao.getReportsByMigration(migrationId);
}

function analyzeLockWaitCause(material) {
  const causes = [];

  if (material.type === 'table_snapshot') {
    causes.push('表结构变更可能导致锁等待');
    if (material.content && material.content.columns) {
      const indexedCols = material.content.columns.filter(c => c.indexed);
      if (indexedCols.length < 2) {
        causes.push('索引数量不足，全表扫描导致锁等待时间过长');
      }
    }
  }

  if (material.type === 'slow_query_log') {
    causes.push('慢查询长时间持有行锁');
  }

  if (material.remark && material.remark.includes('旧备注')) {
    causes.push('材料可能包含过时信息，需核实');
  }

  if (causes.length === 0) {
    causes.push('需进一步分析锁等待原因');
  }

  return {
    possible_causes: causes,
    recommendation: '建议优化查询语句、增加必要索引，或拆分大事务'
  };
}

module.exports = {
  generateRoundSummaryReport,
  generateLockWaitAnalysisReport,
  generateConclusionComparisonReport,
  generateFullAuditReport,
  getReport,
  listReports,
  getReportsByMigration
};
