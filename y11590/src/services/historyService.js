const { runAsync, getAsync, allAsync } = require('../config/database');
const { generateId } = require('../utils/helpers');

class HistoryService {
  async recordOperation(waveId, operationType, operator, options = {}) {
    const { beforeStatus, afterStatus, changeContent, idempotentKey } = options;
    
    const id = generateId();
    const contentJson = changeContent ? JSON.stringify(changeContent) : null;

    await runAsync(
      `INSERT INTO operation_history (
        id, wave_id, operation_type, operator, before_status, 
        after_status, change_content, idempotent_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, waveId, operationType, operator, beforeStatus, afterStatus, contentJson, idempotentKey]
    );

    return id;
  }

  async getWaveHistory(waveId) {
    const history = await allAsync(
      `SELECT * FROM operation_history 
       WHERE wave_id = ? 
       ORDER BY created_at DESC`,
      [waveId]
    );

    return history.map(h => ({
      ...h,
      change_content: h.change_content ? JSON.parse(h.change_content) : null
    }));
  }

  async checkIdempotent(idempotentKey) {
    if (!idempotentKey) return null;
    
    return await getAsync(
      `SELECT * FROM operation_history WHERE idempotent_key = ?`,
      [idempotentKey]
    );
  }

  async getLastOperation(waveId, operationType = null) {
    let sql = `SELECT * FROM operation_history WHERE wave_id = ?`;
    let params = [waveId];

    if (operationType) {
      sql += ` AND operation_type = ?`;
      params.push(operationType);
    }

    sql += ` ORDER BY created_at DESC LIMIT 1`;
    
    return await getAsync(sql, params);
  }
}

module.exports = new HistoryService();
