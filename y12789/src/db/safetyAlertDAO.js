const { runQuery, runInsert, runUpdate } = require('../db/database');

const safetyAlertDAO = {
  create(alert) {
    const id = runInsert(
      `INSERT INTO safety_alerts (conversion_id, sample_id, alert_type, alert_level, alert_message)
       VALUES (?, ?, ?, ?, ?)`,
      [alert.conversion_id || null, alert.sample_id || null, alert.alert_type, alert.alert_level, alert.alert_message]
    );
    return this.getById(id);
  },

  getById(id) {
    const rows = runQuery('SELECT * FROM safety_alerts WHERE id = ?', [id]);
    return rows[0] || null;
  },

  listActive() {
    return runQuery('SELECT * FROM safety_alerts WHERE is_active = 1 ORDER BY created_at DESC');
  },

  listByConversionId(conversionId) {
    return runQuery(
      'SELECT * FROM safety_alerts WHERE conversion_id = ? ORDER BY created_at DESC',
      [conversionId]
    );
  },

  listBySampleId(sampleId) {
    return runQuery(
      'SELECT * FROM safety_alerts WHERE sample_id = ? ORDER BY created_at DESC',
      [sampleId]
    );
  },

  resolve(id) {
    return runUpdate(
      'UPDATE safety_alerts SET is_active = 0, resolved_at = datetime(\'now\') WHERE id = ?',
      [id]
    );
  },

  resolveByConversionId(conversionId) {
    return runUpdate(
      'UPDATE safety_alerts SET is_active = 0, resolved_at = datetime(\'now\') WHERE conversion_id = ? AND is_active = 1',
      [conversionId]
    );
  }
};

module.exports = safetyAlertDAO;
