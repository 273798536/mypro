import { getDb, withTransaction } from '../db/database.js'
import { createRun, completeRun } from '../repository/runsRepo.js'
import {
  createIssue, createHandlingOpinion,
} from '../repository/issuesRepo.js'
import type { IssueType, Issue, HandlingOpinion } from '@shared/types'

interface CollectedIssue {
  type: IssueType
  severity: Issue['severity']
  dbInstance: string
  schemaName: string | null
  tableName: string | null
  detail: string
  schemaDiff?: { objectType: string; objectName: string; masterDef: string; replicaDef: string; diffSummary: string }
  indexSuggestion?: { table: string; columns: string; adviceType: 'add' | 'drop' | 'invalid'; reason: string; impact: string }
  opinion: { opinionText: string; recommendedAction: string; priority: HandlingOpinion['priority']; createdBy: string }
}

export function runInspection(sourceDb: string): { runId: string; issueCount: number } {
  const run = createRun(sourceDb)
  const db = getDb()

  const collected = collectForRun()
  const now = new Date().toISOString()

  withTransaction(() => {
    const insDelay = db.prepare(
      `INSERT INTO delay_metrics (run_id, db_instance, master_lsn, replica_lsn, delay_seconds, threshold_seconds, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    for (const d of collected.delays) {
      insDelay.run(run.runId, d.instance, `mysql-bin.0042.${d.bin}`, `relay-bin.0099.${d.bin + 90}`, d.delay, 1.0, now)
    }

    const insSchema = db.prepare(
      `INSERT INTO schema_diffs (run_id, issue_id, object_type, object_name, master_def, replica_def, diff_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const insIndex = db.prepare(
      `INSERT INTO index_suggestions (run_id, issue_id, table_name, columns, advice_type, reason, impact)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const insPerm = db.prepare(
      `INSERT INTO permissions (run_id, db_user, host, privileges, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (const p of collected.permissions) {
      insPerm.run(run.runId, p.user, p.host, p.priv, p.grantedBy, p.grantedAt)
    }

    let issueCount = 0
    let schemaDiffCount = 0
    let indexSuggestionCount = 0
    for (const ci of collected.issues) {
      const issueId = createIssue({
        runId: run.runId, type: ci.type, severity: ci.severity, status: 'pending',
        dbInstance: ci.dbInstance, schemaName: ci.schemaName, tableName: ci.tableName,
        detail: ci.detail, detectedAt: now,
      })
      issueCount++
      if (ci.schemaDiff) {
        insSchema.run(run.runId, issueId, ci.schemaDiff.objectType, ci.schemaDiff.objectName, ci.schemaDiff.masterDef, ci.schemaDiff.replicaDef, ci.schemaDiff.diffSummary)
        schemaDiffCount++
      }
      if (ci.indexSuggestion) {
        insIndex.run(run.runId, issueId, ci.indexSuggestion.table, ci.indexSuggestion.columns, ci.indexSuggestion.adviceType, ci.indexSuggestion.reason, ci.indexSuggestion.impact)
        indexSuggestionCount++
      }
      createHandlingOpinion({ issueId, opinionText: ci.opinion.opinionText, recommendedAction: ci.opinion.recommendedAction, priority: ci.opinion.priority, createdBy: ci.opinion.createdBy })
    }

    completeRun(run.runId, {
      delay: collected.delays.length,
      schemaDiff: schemaDiffCount,
      indexSuggestion: indexSuggestionCount,
      issue: issueCount,
    })
  })

  return { runId: run.runId, issueCount: collected.issues.length }
}

function collectForRun(): {
  delays: { instance: string; delay: number; bin: number }[]
  permissions: { user: string; host: string; priv: string; grantedBy: string; grantedAt: string }[]
  issues: CollectedIssue[]
} {
  const now = new Date()
  const iso = now.toISOString()
  return {
    delays: [
      { instance: 'order-db-replica-1', delay: Math.round(Math.random() * 100) / 10, bin: 318 },
      { instance: 'order-db-replica-2', delay: 1 + Math.round(Math.random() * 30) / 10, bin: 318 },
      { instance: 'user-db-replica-1', delay: Math.round(Math.random() * 10) / 10, bin: 318 },
      { instance: 'payment-db-replica-1', delay: 10 + Math.round(Math.random() * 300) / 10, bin: 318 },
    ],
    permissions: [
      { user: 'settle_app', host: '10.20.%', priv: 'SELECT, INSERT, UPDATE ON payment.*', grantedBy: 'dba_zhang', grantedAt: iso },
      { user: 'readonly_bi', host: '10.30.%', priv: 'SELECT ON order.*, user.*', grantedBy: 'dba_zhang', grantedAt: iso },
      { user: 'repl_user', host: '10.10.%', priv: 'REPLICATION SLAVE, REPLICATION CLIENT', grantedBy: 'dba_li', grantedAt: iso },
    ],
    issues: [
      {
        type: 'lock_wait', severity: 'critical', dbInstance: 'payment-db-master', schemaName: 'payment', tableName: 't_payment_log',
        detail: `事务 trx#${Math.floor(10000 + Math.random() * 90000)} 等待行锁 ${20 + Math.floor(Math.random() * 60)}s，阻塞 ${2 + Math.floor(Math.random() * 6)} 条读请求，对账 job payment_settle_batch 触发。`,
        opinion: { opinionText: '对账 job 拆分为小批次并补索引，行锁等待应回落至 2s 内；需复查 settle_app 权限。', recommendedAction: '限流对账 job + 复查 settle_app 权限', priority: 'critical', createdBy: 'dba_zhang' },
      },
      {
        type: 'index_invalid', severity: 'warning', dbInstance: 'order-db-replica-1', schemaName: 'order', tableName: 't_order_detail',
        detail: '索引 idx_order_detail_status 失效（Handler_read_rnd_next 增长异常），EXPLAIN type=ALL。',
        indexSuggestion: { table: 't_order_detail', columns: 'status,paid_at', adviceType: 'invalid', reason: 'idx_order_detail_status 持续未命中，ANALYZE 后仍未改善。', impact: '读分离 QPS 下降，慢查询占比上升' },
        opinion: { opinionText: 'ANALYZE 已执行但未改善，需重建索引并核查 settle_app 是否对 status 做隐式转换。', recommendedAction: '重建索引 + 排查隐式转换', priority: 'warning', createdBy: 'dba_li' },
      },
      {
        type: 'schema_diff', severity: 'warning', dbInstance: 'user-db-replica-1', schemaName: 'user', tableName: 't_user',
        detail: '主从列定义不一致：replica 缺少列 nickname_v2，导致读分离查询报错 Unknown column。',
        schemaDiff: { objectType: 'COLUMN', objectName: 't_user.nickname_v2', masterDef: 'VARCHAR(64) DEFAULT NULL', replicaDef: '（不存在）', diffSummary: 'replica 缺列，master 已新增，读分离查询失败' },
        opinion: { opinionText: 'replica 缺列导致读分离报错，需立即补列并校验存量数据。', recommendedAction: 'replica 紧急补列 nickname_v2', priority: 'warning', createdBy: 'dba_wang' },
      },
    ],
  }
}

export function approveFirstPendingAsDemo(reviewer: string, reason: string): void {
  void reviewer
  void reason
}
