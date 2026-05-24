const { getDb, generateId, transaction } = require('./db');

function createSupplierStatement(statement) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO supplier_statements (
      id, statement_no, supplier_id, supplier_name, kb_article_id,
      kb_article_title, quantity, amount, currency, statement_date,
      period_start, period_end, status, raw_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    statement.statement_no,
    statement.supplier_id,
    statement.supplier_name || null,
    statement.kb_article_id || null,
    statement.kb_article_title || null,
    statement.quantity || 0,
    statement.amount || 0,
    statement.currency || 'CNY',
    statement.statement_date,
    statement.period_start || null,
    statement.period_end || null,
    statement.status || 'pending',
    JSON.stringify(statement),
    now,
    now
  );

  return id;
}

function batchCreateSupplierStatements(statements) {
  return transaction(() => {
    const results = [];
    for (const stmt of statements) {
      results.push(createSupplierStatement(stmt));
    }
    return results;
  });
}

function getSupplierStatementById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM supplier_statements WHERE id = ?').get(id);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getSupplierStatementByNo(statementNo, supplierId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM supplier_statements WHERE statement_no = ? AND supplier_id = ?').get(statementNo, supplierId);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getSupplierStatements(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM supplier_statements WHERE 1=1';
  const params = [];

  if (filters.supplier_id) {
    sql += ' AND supplier_id = ?';
    params.push(filters.supplier_id);
  }
  if (filters.kb_article_id) {
    sql += ' AND kb_article_id = ?';
    params.push(filters.kb_article_id);
  }
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.start_date) {
    sql += ' AND statement_date >= ?';
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    sql += ' AND statement_date <= ?';
    params.push(filters.end_date);
  }

  sql += ' ORDER BY statement_date DESC';

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

function updateSupplierStatement(id, updates) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getSupplierStatementById(id);
  if (!existing) return null;

  const fields = [];
  const values = [];

  const allowedFields = ['quantity', 'amount', 'status', 'kb_article_id', 'kb_article_title', 'period_start', 'period_end'];
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

  const stmt = db.prepare(`UPDATE supplier_statements SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getSupplierStatementById(id);
}

function getStatementSummary(filters = {}) {
  const db = getDb();
  let sql = `
    SELECT 
      supplier_id,
      supplier_name,
      COUNT(*) as statement_count,
      SUM(quantity) as total_quantity,
      SUM(amount) as total_amount,
      currency
    FROM supplier_statements
    WHERE 1=1
  `;
  const params = [];

  if (filters.supplier_id) {
    sql += ' AND supplier_id = ?';
    params.push(filters.supplier_id);
  }
  if (filters.start_date) {
    sql += ' AND statement_date >= ?';
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    sql += ' AND statement_date <= ?';
    params.push(filters.end_date);
  }

  sql += ' GROUP BY supplier_id, supplier_name, currency ORDER BY total_amount DESC';

  return db.prepare(sql).all(...params);
}

module.exports = {
  createSupplierStatement,
  batchCreateSupplierStatements,
  getSupplierStatementById,
  getSupplierStatementByNo,
  getSupplierStatements,
  updateSupplierStatement,
  getStatementSummary,
};
