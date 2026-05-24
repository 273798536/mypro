const { getDb, generateId, transaction } = require('./db');

function createAuditOpinion(opinion) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO audit_opinions (
      id, change_order_id, order_no, auditor, opinion,
      result, audit_time, raw_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    opinion.change_order_id,
    opinion.order_no,
    opinion.auditor,
    opinion.opinion,
    opinion.result,
    opinion.audit_time || now,
    JSON.stringify(opinion),
    now
  );

  return id;
}

function batchCreateAuditOpinions(opinions) {
  return transaction(() => {
    const results = [];
    for (const opinion of opinions) {
      results.push(createAuditOpinion(opinion));
    }
    return results;
  });
}

function getAuditOpinionById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM audit_opinions WHERE id = ?').get(id);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getAuditOpinionsByOrderNo(orderNo) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit_opinions WHERE order_no = ? ORDER BY audit_time DESC').all(orderNo);
  return rows.map(row => {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
    return row;
  });
}

function getAuditOpinionsByChangeOrderId(changeOrderId) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit_opinions WHERE change_order_id = ? ORDER BY audit_time DESC').all(changeOrderId);
  return rows.map(row => {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
    return row;
  });
}

function getAuditOpinions(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM audit_opinions WHERE 1=1';
  const params = [];

  if (filters.auditor) {
    sql += ' AND auditor = ?';
    params.push(filters.auditor);
  }
  if (filters.result) {
    sql += ' AND result = ?';
    params.push(filters.result);
  }
  if (filters.start_time) {
    sql += ' AND audit_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND audit_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY audit_time DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const rows = db.prepare(sql).all(...params);
  return rows.map(row => {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
    return row;
  });
}

module.exports = {
  createAuditOpinion,
  batchCreateAuditOpinions,
  getAuditOpinionById,
  getAuditOpinionsByOrderNo,
  getAuditOpinionsByChangeOrderId,
  getAuditOpinions,
};
