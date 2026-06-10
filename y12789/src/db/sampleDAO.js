const { runQuery, runInsert, runUpdate } = require('../db/database');

const sampleDAO = {
  create(sample) {
    const id = runInsert(
      `INSERT INTO samples (sample_no, sampling_point, sampling_time, temperature, ph, conductivity, manual_remark, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sample.sample_no, sample.sampling_point || null, sample.sampling_time || null,
       sample.temperature || null, sample.ph || null, sample.conductivity || null,
       sample.manual_remark || null, sample.status || 'imported']
    );
    return this.getById(id);
  },

  batchCreate(samples) {
    const results = [];
    for (const sample of samples) {
      try {
        const result = this.create(sample);
        results.push({ success: true, data: result });
      } catch (e) {
        results.push({ success: false, sample_no: sample.sample_no, error: e.message });
      }
    }
    return results;
  },

  getById(id) {
    const rows = runQuery('SELECT * FROM samples WHERE id = ?', [id]);
    return rows[0] || null;
  },

  getBySampleNo(sampleNo) {
    const rows = runQuery('SELECT * FROM samples WHERE sample_no = ?', [sampleNo]);
    return rows[0] || null;
  },

  list({ status = null, page = 1, pageSize = 20 } = {}) {
    let sql = 'SELECT * FROM samples';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    return runQuery(sql, params);
  },

  count({ status = null } = {}) {
    let sql = 'SELECT COUNT(*) as count FROM samples';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    const rows = runQuery(sql, params);
    return rows[0].count;
  },

  updateStatus(id, status) {
    return runUpdate(
      'UPDATE samples SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [status, id]
    );
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowedFields = ['sampling_point', 'sampling_time', 'temperature', 'ph', 'conductivity', 'manual_remark', 'status'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    if (fields.length === 0) return 0;
    fields.push('updated_at = datetime(\'now\')');
    params.push(id);
    return runUpdate(`UPDATE samples SET ${fields.join(', ')} WHERE id = ?`, params);
  }
};

module.exports = sampleDAO;
