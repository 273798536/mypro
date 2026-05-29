const { getDb, transaction } = require('../models/db');
const {
  DIRTY_TYPES,
  SEVERITY_LEVELS,
  HANDLE_STATUSES,
  createDirtyRecord,
  batchCreateDirtyRecords,
} = require('../models/dirtyRecord');
const { getSupplierStatements } = require('../models/supplierStatement');
const { getAgentQuotes, getQuoteStatsByKbId } = require('../models/agentQuote');
const { getChangeOrders } = require('../models/changeOrder');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

const dayjs = require('dayjs');

function getPendingDirtyRecordKeys(sourceTable) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, source_id, dirty_type, field_name
    FROM dirty_records
    WHERE source_table = ? AND status = ?
  `).all(sourceTable, HANDLE_STATUSES.PENDING);

  return new Set(rows.map(r => `${r.source_id}:${r.dirty_type}:${r.field_name || ''}`));
}

function resolveMissingDirtyRecords(sourceTable, detectedKeys) {
  const db = getDb();
  const now = new Date().toISOString();

  const allPending = db.prepare(`
    SELECT id, source_id, dirty_type, field_name
    FROM dirty_records
    WHERE source_table = ? AND status = ?
  `).all(sourceTable, HANDLE_STATUSES.PENDING);

  let resolvedCount = 0;
  for (const record of allPending) {
    const key = `${record.source_id}:${record.dirty_type}:${record.field_name || ''}`;
    if (!detectedKeys.has(key)) {
      db.prepare(`
        UPDATE dirty_records
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).run(HANDLE_STATUSES.RESOLVED, now, record.id);
      resolvedCount++;
    }
  }
  return resolvedCount;
}

function checkMissingFields(record, requiredFields, sourceTable, sourceId) {
  const dirtyRecords = [];
  for (const field of requiredFields) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      dirtyRecords.push({
        source_table: sourceTable,
        source_id: sourceId,
        dirty_type: DIRTY_TYPES.MISSING_FIELD,
        field_name: field,
        expected_value: 'non-empty',
        actual_value: String(record[field]),
        description: `缺少必填字段: ${field}`,
        severity: SEVERITY_LEVELS.HIGH,
        raw_data: record,
      });
    }
  }
  return dirtyRecords;
}

function checkCrossDate(record, dateField, periodStart, periodEnd, sourceTable, sourceId) {
  const dirtyRecords = [];
  const recordDate = dayjs(record[dateField]);
  const start = dayjs(periodStart);
  const end = dayjs(periodEnd);

  if (recordDate.isBefore(start) || recordDate.isAfter(end)) {
    dirtyRecords.push({
      source_table: sourceTable,
      source_id: sourceId,
      dirty_type: DIRTY_TYPES.CROSS_DATE,
      field_name: dateField,
      expected_value: `${periodStart} ~ ${periodEnd}`,
      actual_value: record[dateField],
      description: `日期跨期: ${record[dateField]} 不在统计周期内`,
      severity: SEVERITY_LEVELS.MEDIUM,
      raw_data: record,
    });
  }
  return dirtyRecords;
}

function checkNameChange(records, idField, nameField, sourceTable) {
  const dirtyRecords = [];
  const nameMap = new Map();

  for (const record of records) {
    const id = record[idField];
    const name = record[nameField];
    const recordId = record.id;

    if (nameMap.has(id)) {
      const existingNames = nameMap.get(id);
      if (!existingNames.includes(name)) {
        dirtyRecords.push({
          source_table: sourceTable,
          source_id: recordId,
          dirty_type: DIRTY_TYPES.NAME_CHANGE,
          field_name: nameField,
          expected_value: existingNames.join(', '),
          actual_value: name,
          description: `${idField} 对应的 ${nameField} 发生变化: ${name}`,
          severity: SEVERITY_LEVELS.MEDIUM,
          raw_data: record,
        });
        existingNames.push(name);
      }
    } else {
      nameMap.set(id, [name]);
    }
  }
  return dirtyRecords;
}

function reconcileStatementsWithQuotes(filters = {}) {
  const startTime = Date.now();
  const detectedDirtyRecords = [];

  const statements = getSupplierStatements(filters);

  for (const stmt of statements) {
    const requiredFields = ['statement_no', 'supplier_id', 'kb_article_id', 'quantity', 'amount', 'statement_date'];
    detectedDirtyRecords.push(...checkMissingFields(stmt, requiredFields, 'supplier_statements', stmt.id));

    if (stmt.period_start && stmt.period_end) {
      detectedDirtyRecords.push(...checkCrossDate(
        stmt,
        'statement_date',
        stmt.period_start,
        stmt.period_end,
        'supplier_statements',
        stmt.id
      ));
    }

    if (stmt.kb_article_id) {
      const quoteStats = getQuoteStatsByKbId(stmt.kb_article_id, {
        start_time: stmt.period_start,
        end_time: stmt.period_end,
      });

      if (quoteStats) {
        if (stmt.quantity !== quoteStats.quote_count) {
          detectedDirtyRecords.push({
            source_table: 'supplier_statements',
            source_id: stmt.id,
            dirty_type: DIRTY_TYPES.QUANTITY_CONFLICT,
            field_name: 'quantity',
            expected_value: quoteStats.quote_count,
            actual_value: stmt.quantity,
            description: `数量冲突: 对账单数量(${stmt.quantity}) != 实际引用次数(${quoteStats.quote_count})`,
            severity: SEVERITY_LEVELS.HIGH,
            raw_data: { statement: stmt, quoteStats },
          });
        }

        const expectedAmount = quoteStats.quote_count * 10;
        if (Math.abs(stmt.amount - expectedAmount) > 0.01) {
          detectedDirtyRecords.push({
            source_table: 'supplier_statements',
            source_id: stmt.id,
            dirty_type: DIRTY_TYPES.AMOUNT_CONFLICT,
            field_name: 'amount',
            expected_value: expectedAmount,
            actual_value: stmt.amount,
            description: `金额冲突: 对账单金额(${stmt.amount}) != 计算金额(${expectedAmount})`,
            severity: SEVERITY_LEVELS.HIGH,
            raw_data: { statement: stmt, quoteStats, expectedAmount },
          });
        }
      }
    }
  }

  if (statements.length > 0) {
    detectedDirtyRecords.push(...checkNameChange(statements, 'kb_article_id', 'kb_article_title', 'supplier_statements'));
    detectedDirtyRecords.push(...checkNameChange(statements, 'supplier_id', 'supplier_name', 'supplier_statements'));
  }

  const detectedKeys = new Set(
    detectedDirtyRecords.map(r => `${r.source_id}:${r.dirty_type}:${r.field_name || ''}`)
  );

  if (detectedDirtyRecords.length > 0) {
    batchCreateDirtyRecords(detectedDirtyRecords);
  }

  const resolvedCount = resolveMissingDirtyRecords('supplier_statements', detectedKeys);

  const durationMs = Date.now() - startTime;

  createAuditTrail({
    action_type: ACTION_TYPES.RECONCILE,
    action_subtype: 'statements_with_quotes',
    operator: 'system',
    status: ACTION_STATUSES.SUCCESS,
    detail: `对账完成，自动解决: ${resolvedCount}条，当前待处理: ${detectedDirtyRecords.length}条`,
    record_count: statements.length,
    duration_ms: durationMs,
  });

  return {
    total_records: statements.length,
    auto_resolved: resolvedCount,
    current_pending: detectedDirtyRecords.length,
    records: detectedDirtyRecords,
  };
}

function reconcileChangeOrders(filters = {}) {
  const startTime = Date.now();
  const detectedDirtyRecords = [];

  const orders = getChangeOrders(filters);

  for (const order of orders) {
    const requiredFields = ['order_no', 'title', 'submitter', 'submit_time'];
    detectedDirtyRecords.push(...checkMissingFields(order, requiredFields, 'change_orders', order.id));
  }

  const detectedKeys = new Set(
    detectedDirtyRecords.map(r => `${r.source_id}:${r.dirty_type}:${r.field_name || ''}`)
  );

  if (detectedDirtyRecords.length > 0) {
    batchCreateDirtyRecords(detectedDirtyRecords);
  }

  const resolvedCount = resolveMissingDirtyRecords('change_orders', detectedKeys);

  const durationMs = Date.now() - startTime;

  createAuditTrail({
    action_type: ACTION_TYPES.RECONCILE,
    action_subtype: 'change_orders',
    operator: 'system',
    status: ACTION_STATUSES.SUCCESS,
    detail: `变更单对账完成，自动解决: ${resolvedCount}条，当前待处理: ${detectedDirtyRecords.length}条`,
    record_count: orders.length,
    duration_ms: durationMs,
  });

  return {
    total_records: orders.length,
    auto_resolved: resolvedCount,
    current_pending: detectedDirtyRecords.length,
    records: detectedDirtyRecords,
  };
}

function reconcileAll(filters = {}) {
  const startTime = Date.now();

  const statementResult = reconcileStatementsWithQuotes(filters);
  const orderResult = reconcileChangeOrders(filters);

  const durationMs = Date.now() - startTime;

  createAuditTrail({
    action_type: ACTION_TYPES.RECONCILE,
    action_subtype: 'all',
    operator: 'system',
    status: ACTION_STATUSES.SUCCESS,
    detail: `全量对账完成`,
    record_count: statementResult.total_records + orderResult.total_records,
    duration_ms: durationMs,
  });

  return {
    statements: statementResult,
    change_orders: orderResult,
  };
}

module.exports = {
  checkMissingFields,
  checkCrossDate,
  checkNameChange,
  reconcileStatementsWithQuotes,
  reconcileChangeOrders,
  reconcileAll,
};
