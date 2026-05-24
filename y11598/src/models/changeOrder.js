const { getDb, generateId, transaction } = require('./db');

function createChangeOrder(order) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO change_orders (
      id, order_no, title, content, kb_article_id, kb_article_title,
      status, submitter, submit_time, approver, approve_time,
      version, raw_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    order.order_no,
    order.title,
    order.content || null,
    order.kb_article_id || null,
    order.kb_article_title || null,
    order.status || 'pending',
    order.submitter || null,
    order.submit_time || now,
    order.approver || null,
    order.approve_time || null,
    order.version || '1.0',
    JSON.stringify(order),
    now,
    now
  );

  return id;
}

function batchCreateChangeOrders(orders) {
  return transaction(() => {
    const results = [];
    for (const order of orders) {
      results.push(createChangeOrder(order));
    }
    return results;
  });
}

function getChangeOrderById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM change_orders WHERE id = ?').get(id);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getChangeOrderByNo(orderNo, version = null) {
  const db = getDb();
  let sql = 'SELECT * FROM change_orders WHERE order_no = ?';
  const params = [orderNo];

  if (version) {
    sql += ' AND version = ?';
    params.push(version);
  }

  sql += ' ORDER BY version DESC LIMIT 1';

  const row = db.prepare(sql).get(...params);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getChangeOrders(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM change_orders WHERE 1=1';
  const params = [];

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.submitter) {
    sql += ' AND submitter = ?';
    params.push(filters.submitter);
  }
  if (filters.kb_article_id) {
    sql += ' AND kb_article_id = ?';
    params.push(filters.kb_article_id);
  }
  if (filters.start_time) {
    sql += ' AND submit_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND submit_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY submit_time DESC';

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

function updateChangeOrder(id, updates) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getChangeOrderById(id);
  if (!existing) return null;

  const fields = [];
  const values = [];

  const allowedFields = ['title', 'content', 'kb_article_id', 'kb_article_title', 'status', 'approver', 'approve_time', 'version'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`UPDATE change_orders SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getChangeOrderById(id);
}

module.exports = {
  createChangeOrder,
  batchCreateChangeOrders,
  getChangeOrderById,
  getChangeOrderByNo,
  getChangeOrders,
  updateChangeOrder,
};
