const { getDb, generateId, transaction } = require('./db');

function createAgentQuote(record) {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO agent_quote_records (
      id, kb_article_id, kb_article_title, kb_version, agent_id,
      agent_name, customer_id, customer_name, quote_time,
      conversation_id, session_id, quote_content, order_no,
      raw_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    record.kb_article_id,
    record.kb_article_title || null,
    record.kb_version || null,
    record.agent_id,
    record.agent_name || null,
    record.customer_id || null,
    record.customer_name || null,
    record.quote_time || now,
    record.conversation_id || null,
    record.session_id || null,
    record.quote_content || null,
    record.order_no || null,
    JSON.stringify(record),
    now
  );

  return id;
}

function batchCreateAgentQuotes(records) {
  return transaction(() => {
    const results = [];
    for (const record of records) {
      results.push(createAgentQuote(record));
    }
    return results;
  });
}

function getAgentQuoteById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agent_quote_records WHERE id = ?').get(id);
  if (row) {
    row.raw_data = row.raw_data ? JSON.parse(row.raw_data) : null;
  }
  return row;
}

function getAgentQuotesByKbId(kbArticleId, filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM agent_quote_records WHERE kb_article_id = ?';
  const params = [kbArticleId];

  if (filters.start_time) {
    sql += ' AND quote_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND quote_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY quote_time DESC';

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

function getAgentQuotesByAgentId(agentId, filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM agent_quote_records WHERE agent_id = ?';
  const params = [agentId];

  if (filters.start_time) {
    sql += ' AND quote_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND quote_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY quote_time DESC';

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

function getAgentQuotes(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM agent_quote_records WHERE 1=1';
  const params = [];

  if (filters.order_no) {
    sql += ' AND order_no = ?';
    params.push(filters.order_no);
  }
  if (filters.start_time) {
    sql += ' AND quote_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND quote_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' ORDER BY quote_time DESC';

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

function getQuoteStatsByKbId(kbArticleId, filters = {}) {
  const db = getDb();
  let sql = `
    SELECT 
      kb_article_id,
      kb_article_title,
      COUNT(*) as quote_count,
      COUNT(DISTINCT agent_id) as agent_count,
      MIN(quote_time) as first_quote_time,
      MAX(quote_time) as last_quote_time
    FROM agent_quote_records
    WHERE kb_article_id = ?
  `;
  const params = [kbArticleId];

  if (filters.start_time) {
    sql += ' AND quote_time >= ?';
    params.push(filters.start_time);
  }
  if (filters.end_time) {
    sql += ' AND quote_time <= ?';
    params.push(filters.end_time);
  }

  sql += ' GROUP BY kb_article_id, kb_article_title';

  return db.prepare(sql).get(...params);
}

module.exports = {
  createAgentQuote,
  batchCreateAgentQuotes,
  getAgentQuoteById,
  getAgentQuotesByKbId,
  getAgentQuotesByAgentId,
  getAgentQuotes,
  getQuoteStatsByKbId,
};
