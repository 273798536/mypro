const { runQuery, runInsert, runUpdate } = require('../db/database');

const reagentDAO = {
  create(reagent) {
    const id = runInsert(
      `INSERT INTO reagent_ledger (reagent_name, reagent_code, batch_no, concentration, unit, purity, manufacture_date, expiry_date, supplier, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reagent.reagent_name, reagent.reagent_code || null, reagent.batch_no || null,
       reagent.concentration || null, reagent.unit || null, reagent.purity || null,
       reagent.manufacture_date || null, reagent.expiry_date || null,
       reagent.supplier || null, reagent.remark || null]
    );
    return this.getById(id);
  },

  getById(id) {
    const rows = runQuery('SELECT * FROM reagent_ledger WHERE id = ? AND is_active = 1', [id]);
    return rows[0] || null;
  },

  getByCodeAndBatch(reagentCode, batchNo) {
    const rows = runQuery(
      'SELECT * FROM reagent_ledger WHERE reagent_code = ? AND batch_no = ? AND is_active = 1',
      [reagentCode, batchNo]
    );
    return rows[0] || null;
  },

  list({ page = 1, pageSize = 20 } = {}) {
    return runQuery(
      'SELECT * FROM reagent_ledger WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, (page - 1) * pageSize]
    );
  },

  count() {
    const rows = runQuery('SELECT COUNT(*) as count FROM reagent_ledger WHERE is_active = 1');
    return rows[0].count;
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowedFields = ['reagent_name', 'reagent_code', 'batch_no', 'concentration', 'unit', 'purity', 'manufacture_date', 'expiry_date', 'supplier', 'remark'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }
    if (fields.length === 0) return 0;
    fields.push('updated_at = datetime(\'now\')');
    params.push(id);
    return runUpdate(`UPDATE reagent_ledger SET ${fields.join(', ')} WHERE id = ?`, params);
  },

  remove(id) {
    return runUpdate('UPDATE reagent_ledger SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id]);
  }
};

module.exports = reagentDAO;
