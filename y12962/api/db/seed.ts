import { getDb, withTransaction } from './database.js'
import { isSeeded } from './schema.js'

function isoMinusMinutes(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

export function seed(): void {
  if (isSeeded()) return
  const db = getDb()

  withTransaction(() => {
    const now = isoMinusMinutes(0)
    const prevRunStarted = isoMinusMinutes(150)
    const prevRunCompleted = isoMinusMinutes(148)
    const curRunStarted = isoMinusMinutes(35)
    const curRunCompleted = isoMinusMinutes(34)

    db.prepare(
      `INSERT INTO runs (run_id, source_db, started_at, completed_at, status, delay_count, schema_diff_count, index_suggestion_count, issue_count)
       VALUES (?, 'rw-cluster-prod', ?, ?, 'completed', 4, 1, 1, 3)`
    ).run('run-20260618-091200-a1b2', prevRunStarted, prevRunCompleted)

    db.prepare(
      `INSERT INTO runs (run_id, source_db, started_at, completed_at, status, delay_count, schema_diff_count, index_suggestion_count, issue_count)
       VALUES (?, 'rw-cluster-prod', ?, ?, 'completed', 4, 2, 2, 4)`
    ).run('run-20260618-103000-c3d4', curRunStarted, curRunCompleted)

    const prevRun = 'run-20260618-091200-a1b2'
    const curRun = 'run-20260618-103000-c3d4'

    const delayRows: Array<[string, string, number, number, string]> = [
      [prevRun, 'order-db-replica-1', 0.4, 1.0, isoMinusMinutes(150)],
      [prevRun, 'order-db-replica-2', 3.2, 1.0, isoMinusMinutes(150)],
      [prevRun, 'user-db-replica-1', 0.8, 1.0, isoMinusMinutes(150)],
      [prevRun, 'payment-db-replica-1', 12.6, 1.0, isoMinusMinutes(150)],
      [curRun, 'order-db-replica-1', 0.3, 1.0, isoMinusMinutes(35)],
      [curRun, 'order-db-replica-2', 1.1, 1.0, isoMinusMinutes(35)],
      [curRun, 'user-db-replica-1', 0.6, 1.0, isoMinusMinutes(35)],
      [curRun, 'payment-db-replica-1', 28.9, 1.0, isoMinusMinutes(35)],
    ]
    const insDelay = db.prepare(
      `INSERT INTO delay_metrics (run_id, db_instance, master_lsn, replica_lsn, delay_seconds, threshold_seconds, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    for (const [run, inst, delay, thr, at] of delayRows) {
      insDelay.run(run, inst, `mysql-bin.0012${run.endsWith('a1b2') ? '3' : '7'}.${100 + Math.floor(delay)}`, `relay-bin.0099.${200 + Math.floor(delay)}`, delay, thr, at)
    }

    const insIssue = db.prepare(
      `INSERT INTO issues (run_id, type, severity, status, db_instance, schema_name, table_name, detail, detected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const prevLock = insIssue.run(prevRun, 'lock_wait', 'critical', 'approved', 'payment-db-master', 'payment', 't_payment_log', '事务 trx#88210 等待行锁 47s，阻塞 3 条读请求，疑似大额对账批量更新未走索引。', isoMinusMinutes(149)) as { lastInsertRowid: number | bigint }
    const prevIndex = insIssue.run(prevRun, 'index_invalid', 'warning', 'rejected', 'order-db-replica-1', 'order', 't_order_detail', '索引 idx_order_detail_status 未被命中（Handler_read=0），EXPLAIN 走全表扫描。', isoMinusMinutes(149)) as { lastInsertRowid: number | bigint }
    const prevSchema = insIssue.run(prevRun, 'schema_diff', 'info', 'approved', 'user-db-replica-1', 'user', 't_user', '主从列定义不一致：master 缺少列 nickname_v2。', isoMinusMinutes(149)) as { lastInsertRowid: number | bigint }

    const curLock = insIssue.run(curRun, 'lock_wait', 'critical', 'pending', 'payment-db-master', 'payment', 't_payment_log', '事务 trx#90577 等待行锁 52s，阻塞 5 条读请求，对账 job payment_settle_batch 触发。', isoMinusMinutes(34)) as { lastInsertRowid: number | bigint }
    const curIndex1 = insIssue.run(curRun, 'index_invalid', 'warning', 'pending', 'order-db-replica-1', 'order', 't_order_detail', '索引 idx_order_detail_status 失效（Handler_read_rnd_next 增长异常），EXPLAIN type=ALL。', isoMinusMinutes(34)) as { lastInsertRowid: number | bigint }
    const curIndex2 = insIssue.run(curRun, 'index_invalid', 'critical', 'pending', 'order-db-replica-1', 'order', 't_order_item', '冗余索引 idx_order_item_dup 建议下线，与 idx_order_item_pk 重复且写放大明显。', isoMinusMinutes(34)) as { lastInsertRowid: number | bigint }
    const curSchema = insIssue.run(curRun, 'schema_diff', 'warning', 'pending', 'user-db-replica-1', 'user', 't_user', '主从列定义不一致：replica 缺少列 nickname_v2，导致读分离查询报错 Unknown column。', isoMinusMinutes(34)) as { lastInsertRowid: number | bigint }

    const toId = (v: number | bigint): number => Number(v)

    const insSchema = db.prepare(
      `INSERT INTO schema_diffs (run_id, issue_id, object_type, object_name, master_def, replica_def, diff_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    insSchema.run(prevRun, toId(prevSchema.lastInsertRowid), 'COLUMN', 't_user.nickname_v2', "VARCHAR(64) DEFAULT NULL", "（不存在）", 'replica 缺列，master 已新增')
    insSchema.run(curRun, toId(curSchema.lastInsertRowid), 'COLUMN', 't_user.nickname_v2', "VARCHAR(64) DEFAULT NULL", "（不存在）", 'replica 缺列，master 已新增，读分离查询失败')
    insSchema.run(curRun, null, 'TABLE', 't_audit_2026', "（存在）ENGINE=InnoDB", "（不存在）", 'replica 缺历史归档表，仅 master 侧存在')

    const insIndex = db.prepare(
      `INSERT INTO index_suggestions (run_id, issue_id, table_name, columns, advice_type, reason, impact)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    insIndex.run(prevRun, toId(prevIndex.lastInsertRowid), 't_order_detail', 'status,paid_at', 'invalid', 'idx_order_detail_status 未命中，统计信息过期或隐式转换。', '全表扫描约 1200w 行，查询耗时 4.2s → 预期 30ms')
    insIndex.run(curRun, toId(curIndex1.lastInsertRowid), 't_order_detail', 'status,paid_at', 'invalid', 'idx_order_detail_status 持续未命中，ANALYZE 后仍未改善。', '读分离 QPS 下降 38%，慢查询占比 12%')
    insIndex.run(curRun, toId(curIndex2.lastInsertRowid), 't_order_item', 'order_id,item_id', 'drop', 'idx_order_item_dup 与主键索引重复，写放大 2x。', '下线后写入吞吐 +15%，节省存储 18GB')

    const insPerm = db.prepare(
      `INSERT INTO permissions (run_id, db_user, host, privileges, granted_by, granted_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    const permRows: Array<[string, string, string, string, string, string]> = [
      [curRun, 'settle_app', '10.20.%', "SELECT, INSERT, UPDATE ON payment.*", 'dba_zhang', isoMinusMinutes(6000)],
      [curRun, 'readonly_bi', '10.30.%', "SELECT ON order.*, user.*", 'dba_zhang', isoMinusMinutes(14400)],
      [curRun, 'repl_user', '10.10.%', "REPLICATION SLAVE, REPLICATION CLIENT", 'dba_li', isoMinusMinutes(43200)],
      [curRun, 'settle_app', '10.20.%', "ALTER ON payment.t_payment_log", 'dba_wang', isoMinusMinutes(2880)],
    ]
    for (const [run, user, host, priv, by, grantedAt] of permRows) {
      insPerm.run(run, user, host, priv, by, grantedAt)
    }
    for (const [, user, host, priv, by, grantedAt] of permRows) {
      insPerm.run(prevRun, user, host, priv, by, grantedAt)
    }

    const insOpinion = db.prepare(
      `INSERT INTO handling_opinions (issue_id, opinion_text, recommended_action, priority, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    insOpinion.run(toId(prevLock.lastInsertRowid), '对账 job 拆分为小批次并补索引，行锁等待应回落至 2s 内。', '限流对账 job + 补 idx_payment_log_settle', 'critical', 'dba_zhang', isoMinusMinutes(149))
    insOpinion.run(toId(prevIndex.lastInsertRowid), '先 ANALYZE TABLE 刷新统计；若仍不命中则重建索引并核查隐式转换。', 'ANALYZE 后重建索引', 'warning', 'dba_li', isoMinusMinutes(149))
    insOpinion.run(toId(prevSchema.lastInsertRowid), '通过 pt-online-schema-change 在 replica 补列，保持与 master 一致。', 'replica 补列 nickname_v2', 'info', 'dba_wang', isoMinusMinutes(149))
    insOpinion.run(toId(curLock.lastInsertRowid), '本批 payment_settle_batch 再次触发 52s 行锁，建议先暂停 job 再复核；需 dba_wang 确认权限调整。', '暂停对账 job + 复查 settle_app 权限', 'critical', 'dba_zhang', isoMinusMinutes(34))
    insOpinion.run(toId(curIndex1.lastInsertRowid), 'ANALYZE 已执行但未改善，需重建索引并核查 settle_app 是否对 status 做隐式转换。', '重建索引 + 排查隐式转换', 'warning', 'dba_li', isoMinusMinutes(34))
    insOpinion.run(toId(curIndex2.lastInsertRowid), '冗余索引确认下线，窗口期内执行 DROP INDEX。', 'DROP INDEX idx_order_item_dup', 'critical', 'dba_li', isoMinusMinutes(34))
    insOpinion.run(toId(curSchema.lastInsertRowid), 'replica 缺列导致读分离报错，需立即补列并校验存量数据。', 'replica 紧急补列 nickname_v2', 'warning', 'dba_wang', isoMinusMinutes(34))

    const insHistory = db.prepare(
      `INSERT INTO review_history (issue_id, reviewer, action, reason, previous_status, changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    insHistory.run(toId(prevLock.lastInsertRowid), 'dba_zhang', 'approve', '已补索引并对账 job 限流，行锁回落至 1.8s，复核通过。', 'pending', isoMinusMinutes(120))
    insHistory.run(toId(prevIndex.lastInsertRowid), 'dba_li', 'reject', 'ANALYZE 后仍未命中，需重建索引后再复核，暂不通过。', 'pending', isoMinusMinutes(120))
    insHistory.run(toId(prevSchema.lastInsertRowid), 'dba_wang', 'approve', 'replica 已补列并校验数据一致，复核通过。', 'pending', isoMinusMinutes(110))
  })
}
