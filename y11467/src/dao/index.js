const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

class BaseDAO {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async create(data) {
    const id = data.id || uuidv4();
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(key => data[key]);
    
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    await db.run(sql, values);
    return id;
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...keys.map(key => data[key]), id];
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await db.run(sql, values);
    return result.changes > 0;
  }

  async getById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await db.get(sql, [id]);
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await db.run(sql, [id]);
    return result.changes > 0;
  }

  async findAll(where = '', params = []) {
    const sql = `SELECT * FROM ${this.tableName} ${where}`;
    return await db.all(sql, params);
  }
}

class RetryQueueDAO extends BaseDAO {
  constructor() {
    super('retry_queue');
  }

  async enqueue(data) {
    const id = uuidv4();
    const sql = `
      INSERT INTO retry_queue 
      (id, hotline_order_id, style_code, status, max_retries, priority, source_system)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `;
    await db.run(sql, [
      id,
      data.hotline_order_id,
      data.style_code,
      data.max_retries || 3,
      data.priority || 5,
      data.source_system || 'hotline'
    ]);
    return id;
  }

  async getPendingForRetry(limit = 10) {
    const sql = `
      SELECT * FROM retry_queue 
      WHERE status IN ('pending', 'retry') 
        AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
        AND retry_count < max_retries
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `;
    return await db.all(sql, [limit]);
  }

  async markForRetry(id, errorMessage, errorType, delayMinutes = 5) {
    const sql = `
      UPDATE retry_queue 
      SET status = 'retry', 
          retry_count = retry_count + 1,
          error_message = ?,
          error_type = ?,
          next_retry_at = datetime('now', ? || ' minutes'),
          updated_at = datetime('now')
      WHERE id = ?
    `;
    await db.run(sql, [errorMessage, errorType, `+${delayMinutes}`, id]);
  }

  async markAsManual(id, assignedTo) {
    const sql = `
      UPDATE retry_queue 
      SET status = 'manual', 
          assigned_to = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `;
    await db.run(sql, [assignedTo, id]);
  }

  async markAsSuccess(id) {
    const sql = `
      UPDATE retry_queue 
      SET status = 'success', 
          updated_at = datetime('now')
      WHERE id = ?
    `;
    await db.run(sql, [id]);
  }

  async markAsClosed(id) {
    const sql = `
      UPDATE retry_queue 
      SET status = 'closed', 
          closed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `;
    await db.run(sql, [id]);
  }

  async getStats() {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count,
        retry_classification
      FROM retry_queue
      GROUP BY status, retry_classification
    `;
    return await db.all(sql);
  }
}

class SampleTransferOrderDAO extends BaseDAO {
  constructor() {
    super('sample_transfer_order');
  }

  async createWithVersion(data, operator = 'system') {
    const id = data.id || uuidv4();
    const version = 1;
    
    await db.run(`
      UPDATE sample_transfer_order 
      SET is_latest = 0 
      WHERE queue_id = ? AND order_no = ? AND is_latest = 1
    `, [data.queue_id, data.order_no]);

    const sql = `
      INSERT INTO sample_transfer_order 
      (id, queue_id, order_no, style_code, style_name, sample_type, 
       from_dept, to_dept, transfer_date, quantity, receiver, sender, 
       status, remarks, version, is_latest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    await db.run(sql, [
      id, data.queue_id, data.order_no, data.style_code, data.style_name,
      data.sample_type, data.from_dept, data.to_dept, data.transfer_date,
      data.quantity, data.receiver, data.sender, data.status || 'pending',
      data.remarks, version
    ]);

    await db.run(`
      INSERT INTO version_history 
      (id, queue_id, record_type, record_id, version, data_snapshot, changed_by, change_reason)
      VALUES (?, ?, 'transfer', ?, ?, ?, ?, 'create')
    `, [uuidv4(), data.queue_id, id, version, JSON.stringify(data), operator]);

    return id;
  }

  async getByQueueId(queueId) {
    const sql = `
      SELECT * FROM sample_transfer_order 
      WHERE queue_id = ? AND is_latest = 1
      ORDER BY created_at DESC
    `;
    return await db.all(sql, [queueId]);
  }
}

class SizeModificationOpinionDAO extends BaseDAO {
  constructor() {
    super('size_modification_opinion');
  }

  async createWithVersion(data, operator = 'system') {
    const id = data.id || uuidv4();
    const version = 1;

    await db.run(`
      UPDATE size_modification_opinion 
      SET is_latest = 0 
      WHERE queue_id = ? AND style_code = ? AND size = ? AND part = ? AND round = ? AND is_latest = 1
    `, [data.queue_id, data.style_code, data.size, data.part, data.round || 1]);

    const sql = `
      INSERT INTO size_modification_opinion 
      (id, queue_id, style_code, size, part, before_value, after_value, 
       modifier, modify_date, reason, round, status, version, is_latest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    await db.run(sql, [
      id, data.queue_id, data.style_code, data.size, data.part,
      data.before_value, data.after_value, data.modifier, data.modify_date,
      data.reason, data.round || 1, data.status || 'pending', version
    ]);

    await db.run(`
      INSERT INTO version_history 
      (id, queue_id, record_type, record_id, version, data_snapshot, changed_by, change_reason)
      VALUES (?, ?, 'size', ?, ?, ?, ?, 'create')
    `, [uuidv4(), data.queue_id, id, version, JSON.stringify(data), operator]);

    return id;
  }

  async getByQueueId(queueId) {
    const sql = `
      SELECT * FROM size_modification_opinion 
      WHERE queue_id = ? AND is_latest = 1
      ORDER BY round DESC, created_at DESC
    `;
    return await db.all(sql, [queueId]);
  }
}

class FabricInventoryDAO extends BaseDAO {
  constructor() {
    super('fabric_inventory');
  }

  async createWithVersion(data, operator = 'system') {
    const id = data.id || uuidv4();
    const version = 1;

    const sql = `
      INSERT INTO fabric_inventory 
      (id, queue_id, style_code, fabric_code, fabric_name, color, 
       in_out_type, quantity, unit, operation_date, operator, 
       warehouse, batch_no, linked_order_no, remarks, version, is_latest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    await db.run(sql, [
      id, data.queue_id, data.style_code, data.fabric_code, data.fabric_name,
      data.color, data.in_out_type, data.quantity, data.unit,
      data.operation_date, data.operator, data.warehouse,
      data.batch_no, data.linked_order_no, data.remarks, version
    ]);

    await db.run(`
      INSERT INTO version_history 
      (id, queue_id, record_type, record_id, version, data_snapshot, changed_by, change_reason)
      VALUES (?, ?, 'fabric', ?, ?, ?, ?, 'create')
    `, [uuidv4(), data.queue_id, id, version, JSON.stringify(data), operator]);

    return id;
  }

  async getByQueueId(queueId) {
    const sql = `
      SELECT * FROM fabric_inventory 
      WHERE queue_id = ? AND is_latest = 1
      ORDER BY operation_date DESC, created_at DESC
    `;
    return await db.all(sql, [queueId]);
  }

  async getFabricSummaryByStyle(styleCode) {
    const sql = `
      SELECT 
        fabric_code,
        fabric_name,
        color,
        SUM(CASE WHEN in_out_type = 'in' THEN quantity ELSE -quantity END) as balance,
        unit
      FROM fabric_inventory
      WHERE style_code = ? AND is_latest = 1
      GROUP BY fabric_code, fabric_name, color, unit
      HAVING balance != 0
    `;
    return await db.all(sql, [styleCode]);
  }
}

class SmsScreenshotDAO extends BaseDAO {
  constructor() {
    super('sms_screenshot');
  }

  async getByQueueId(queueId) {
    const sql = `
      SELECT * FROM sms_screenshot 
      WHERE queue_id = ?
      ORDER BY send_time DESC, created_at DESC
    `;
    return await db.all(sql, [queueId]);
  }
}

class ManualOpinionDAO extends BaseDAO {
  constructor() {
    super('manual_opinion');
  }

  async getByQueueId(queueId) {
    const sql = `
      SELECT * FROM manual_opinion 
      WHERE queue_id = ?
      ORDER BY created_at DESC
    `;
    return await db.all(sql, [queueId]);
  }
}

class DirtyRecordDAO extends BaseDAO {
  constructor() {
    super('dirty_record');
  }

  async createDirty(queueId, recordType, originalData, errorType, errorFields, errorMessage, suggestion) {
    const id = uuidv4();
    const sql = `
      INSERT INTO dirty_record 
      (id, queue_id, record_type, original_data, error_type, error_fields, 
       error_message, correction_suggestion, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    await db.run(sql, [
      id, queueId, recordType, JSON.stringify(originalData),
      errorType, JSON.stringify(errorFields), errorMessage, suggestion
    ]);
    return id;
  }

  async correct(id, correctedData, handledBy) {
    const sql = `
      UPDATE dirty_record 
      SET corrected_data = ?, status = 'corrected', handled_by = ?, handled_at = datetime('now')
      WHERE id = ?
    `;
    const result = await db.run(sql, [JSON.stringify(correctedData), handledBy, id]);
    return result.changes > 0;
  }

  async getPending() {
    const sql = `
      SELECT * FROM dirty_record 
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;
    return await db.all(sql);
  }

  async getPendingByQueueId(queueId) {
    const sql = `
      SELECT * FROM dirty_record 
      WHERE queue_id = ? AND status = 'pending'
      ORDER BY created_at ASC
    `;
    return await db.all(sql, [queueId]);
  }
}

class VersionHistoryDAO extends BaseDAO {
  constructor() {
    super('version_history');
  }

  async getRecordHistory(recordType, recordId) {
    const sql = `
      SELECT * FROM version_history 
      WHERE record_type = ? AND record_id = ?
      ORDER BY version DESC
    `;
    return await db.all(sql, [recordType, recordId]);
  }

  async getQueueHistory(queueId) {
    const sql = `
      SELECT * FROM version_history 
      WHERE queue_id = ?
      ORDER BY changed_at DESC
    `;
    return await db.all(sql, [queueId]);
  }
}

class CompensationRecordDAO extends BaseDAO {
  constructor() {
    super('compensation_record');
  }

  async markAccounted(id, accountedBy) {
    const sql = `
      UPDATE compensation_record 
      SET accounted = 1, accounted_at = datetime('now'), accounted_by = ?
      WHERE id = ?
    `;
    const result = await db.run(sql, [accountedBy, id]);
    return result.changes > 0;
  }

  async getByQueueId(queueId) {
    const sql = `
      SELECT * FROM compensation_record 
      WHERE queue_id = ?
      ORDER BY created_at DESC
    `;
    return await db.all(sql, [queueId]);
  }
}

class DeadLetterDAO extends BaseDAO {
  constructor() {
    super('dead_letter');
  }

  async archive(queueId, styleCode, errorType, errorMessage, retryCount) {
    const id = uuidv4();
    const sql = `
      INSERT INTO dead_letter 
      (id, queue_id, style_code, error_type, error_message, retry_count, final_status, can_be_recovered)
      VALUES (?, ?, ?, ?, ?, ?, 'failed', 1)
    `;
    await db.run(sql, [id, queueId, styleCode, errorType, errorMessage, retryCount]);
    return id;
  }

  async getRecoverable() {
    const sql = `
      SELECT * FROM dead_letter 
      WHERE can_be_recovered = 1
      ORDER BY archived_at ASC
    `;
    return await db.all(sql);
  }
}

module.exports = {
  retryQueueDAO: new RetryQueueDAO(),
  sampleTransferOrderDAO: new SampleTransferOrderDAO(),
  sizeModificationOpinionDAO: new SizeModificationOpinionDAO(),
  fabricInventoryDAO: new FabricInventoryDAO(),
  smsScreenshotDAO: new SmsScreenshotDAO(),
  manualOpinionDAO: new ManualOpinionDAO(),
  dirtyRecordDAO: new DirtyRecordDAO(),
  versionHistoryDAO: new VersionHistoryDAO(),
  compensationRecordDAO: new CompensationRecordDAO(),
  deadLetterDAO: new DeadLetterDAO(),
  db
};
