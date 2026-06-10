const { runQuery, runInsert } = require('../db/database');

const reviewDAO = {
  create(record) {
    const id = runInsert(
      `INSERT INTO review_records (conversion_id, reviewer, review_result, review_opinion)
       VALUES (?, ?, ?, ?)`,
      [record.conversion_id, record.reviewer || null, record.review_result, record.review_opinion || null]
    );
    return this.getById(id);
  },

  getById(id) {
    const rows = runQuery('SELECT * FROM review_records WHERE id = ?', [id]);
    return rows[0] || null;
  },

  getByConversionId(conversionId) {
    return runQuery(
      'SELECT * FROM review_records WHERE conversion_id = ? ORDER BY reviewed_at DESC',
      [conversionId]
    );
  },

  list({ conversionId = null, page = 1, pageSize = 20 } = {}) {
    let sql = 'SELECT * FROM review_records';
    const params = [];
    if (conversionId) {
      sql += ' WHERE conversion_id = ?';
      params.push(conversionId);
    }
    sql += ' ORDER BY reviewed_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    return runQuery(sql, params);
  }
};

module.exports = reviewDAO;
