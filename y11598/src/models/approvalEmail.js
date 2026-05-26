const { getDb, generateId, transaction } = require('./db');

function createApprovalEmail(email) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO approval_emails (
      id, change_order_id, order_no, email_from, email_to,
      email_cc, subject, content, send_time, approval_result,
      raw_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    email.change_order_id || null,
    email.order_no || null,
    email.email_from,
    email.email_to || null,
    email.email_cc || null,
    email.subject,
    email.content || null,
    email.send_time || now,
    email.approval_result || null,
    JSON.stringify(email),
    now
  );

  return id;
}

function batchCreateApprovalEmails(emails) {
  return transaction(() => {
    const results = [];
    for (const email of emails) {
      results.push(createApprovalEmail(email));
    }
    return results;
  });
}

function getApprovalEmailById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM approval_emails WHERE id = ?').get(id);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getApprovalEmailsByOrderNo(orderNo) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM approval_emails WHERE order_no = ? ORDER BY send_time DESC').all(orderNo);
  return rows.map(row => {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
    return row;
  });
}

function getApprovalEmailsByChangeOrderId(changeOrderId) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM approval_emails WHERE change_order_id = ? ORDER BY send_time DESC').all(changeOrderId);
  return rows.map(row => {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
    return row;
  });
}

function getApprovalEmails(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM approval_emails WHERE 1=1';
  const params = [];

  if (filters.email_from) {
    sql += ' AND email_from = ?';
    params.push(filters.email_from);
  }
  if (filters.approval_result) {
    sql += ' AND approval_result = ?';
    params.push(filters.approval_result);
  }
  if (filters.start_time) {
    sql += ' AND send_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND send_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY send_time DESC';

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
  createApprovalEmail,
  batchCreateApprovalEmails,
  getApprovalEmailById,
  getApprovalEmailsByOrderNo,
  getApprovalEmailsByChangeOrderId,
  getApprovalEmails,
};
