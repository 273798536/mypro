const { runQuery, runInsert, runUpdate } = require('../db/database');

const conversionDAO = {
  create(record) {
    const id = runInsert(
      `INSERT INTO conversion_records (sample_id, reagent_id, salinity_result, calculation_method, weighing_precision, weighing_precision_pass, weighing_precision_detail, reaction_condition, spectrum_data, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.sample_id, record.reagent_id || null, record.salinity_result || null,
       record.calculation_method || null, record.weighing_precision || null,
       record.weighing_precision_pass !== undefined ? (record.weighing_precision_pass ? 1 : 0) : 1,
       record.weighing_precision_detail || null, record.reaction_condition || null,
       record.spectrum_data || null, record.status || 'draft']
    );
    return this.getById(id);
  },

  getById(id) {
    const rows = runQuery('SELECT * FROM conversion_records WHERE id = ?', [id]);
    return rows[0] || null;
  },

  getBySampleId(sampleId) {
    return runQuery('SELECT * FROM conversion_records WHERE sample_id = ? ORDER BY created_at DESC', [sampleId]);
  },

  getLatestBySampleId(sampleId) {
    const rows = runQuery('SELECT * FROM conversion_records WHERE sample_id = ? ORDER BY created_at DESC LIMIT 1', [sampleId]);
    return rows[0] || null;
  },

  list({ status = null, page = 1, pageSize = 20 } = {}) {
    let sql = `SELECT cr.*, s.sample_no, s.sampling_point, s.manual_remark as sample_remark
               FROM conversion_records cr
               LEFT JOIN samples s ON cr.sample_id = s.id`;
    const params = [];
    if (status) {
      sql += ' WHERE cr.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY cr.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    return runQuery(sql, params);
  },

  count({ status = null } = {}) {
    let sql = 'SELECT COUNT(*) as count FROM conversion_records';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    const rows = runQuery(sql, params);
    return rows[0].count;
  },

  listUnusable() {
    return runQuery(`
      SELECT cr.*, s.sample_no, s.sampling_point, s.manual_remark as sample_remark
      FROM conversion_records cr
      LEFT JOIN samples s ON cr.sample_id = s.id
      WHERE cr.weighing_precision_pass = 0 OR cr.status = 'rejected'
      ORDER BY cr.created_at DESC
    `);
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowedFields = ['reagent_id', 'salinity_result', 'calculation_method', 'weighing_precision', 'weighing_precision_pass', 'weighing_precision_detail', 'reaction_condition', 'spectrum_data', 'status'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'weighing_precision_pass') {
          fields.push(`${field} = ?`);
          params.push(data[field] ? 1 : 0);
        } else {
          fields.push(`${field} = ?`);
          params.push(data[field]);
        }
      }
    }
    if (fields.length === 0) return 0;
    fields.push('updated_at = datetime(\'now\')');
    params.push(id);
    return runUpdate(`UPDATE conversion_records SET ${fields.join(', ')} WHERE id = ?`, params);
  },

  updateStatus(id, status) {
    return runUpdate(
      'UPDATE conversion_records SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [status, id]
    );
  }
};

module.exports = conversionDAO;
