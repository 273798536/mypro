const { db } = require('../config/database');
const { QUEUE_STATUS, ACTIONS } = require('../constants/status');
const TraceService = require('./trace.service');
const { v4: uuidv4 } = require('uuid');

class QueueService {
  static generateQueueNo() {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    return `MQ${dateStr}${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  static async submit(data) {
    const queueNo = this.generateQueueNo();
    const {
      batchNo,
      materialType,
      materialName,
      materialSpec,
      appointmentNo,
      patientName,
      invoiceNo,
      approvalEmailId,
      originalData,
      parsedData,
      department,
      sourceFile,
      sourceRow,
      importId,
      maxRetry = 3
    } = data;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO material_queue 
         (queue_no, batch_no, material_type, material_name, material_spec, appointment_no, 
          patient_name, invoice_no, approval_email_id, original_data, parsed_data, 
          department, source_file, source_row, import_id, max_retry, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          queueNo, batchNo, materialType, materialName || null, materialSpec || null,
          appointmentNo || null, patientName || null, invoiceNo || null, approvalEmailId || null,
          JSON.stringify(originalData), parsedData ? JSON.stringify(parsedData) : null,
          department || null, sourceFile || null, sourceRow || null, importId || null,
          maxRetry, QUEUE_STATUS.PENDING
        ],
        async function(err) {
          if (err) reject(err);
          else {
            const queueId = this.lastID;
            await TraceService.addTrace(queueId, ACTIONS.SUBMIT, {
              toStatus: QUEUE_STATUS.PENDING,
              remark: '提交成功，进入排队队列'
            });
            resolve({ id: queueId, queueNo });
          }
        }
      );
    });
  }

  static async getById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM material_queue WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else resolve({
            ...row,
            original_data: row.original_data ? JSON.parse(row.original_data) : null,
            parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
          });
        }
      );
    });
  }

  static async getByQueueNo(queueNo) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM material_queue WHERE queue_no = ?`,
        [queueNo],
        (err, row) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else resolve({
            ...row,
            original_data: row.original_data ? JSON.parse(row.original_data) : null,
            parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
          });
        }
      );
    });
  }

  static async list({ status, batchNo, department, page = 1, pageSize = 20 } = {}) {
    let whereClause = [];
    let params = [];

    if (status) {
      whereClause.push('status = ?');
      params.push(status);
    }
    if (batchNo) {
      whereClause.push('batch_no LIKE ?');
      params.push(`%${batchNo}%`);
    }
    if (department) {
      whereClause.push('department = ?');
      params.push(department);
    }

    const whereSql = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM material_queue ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            db.get(
              `SELECT COUNT(*) as total FROM material_queue ${whereSql}`,
              params,
              (err, countRow) => {
                if (err) reject(err);
                else resolve({
                  list: rows.map(row => ({
                    ...row,
                    original_data: row.original_data ? JSON.parse(row.original_data) : null,
                    parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
                  })),
                  total: countRow.total,
                  page,
                  pageSize
                });
              }
            );
          }
        }
      );
    });
  }

  static async updateStatus(id, status, { operator, remark, errorMessage, traceData } = {}) {
    const queueItem = await this.getById(id);
    if (!queueItem) throw new Error('队列记录不存在');

    const oldStatus = queueItem.status;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE material_queue SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, id],
        async (err) => {
          if (err) reject(err);
          else {
            await TraceService.addTrace(id, ACTIONS.PROCESS, {
              fromStatus: oldStatus,
              toStatus: status,
              operator,
              remark,
              errorMessage,
              traceData
            });
            resolve();
          }
        }
      );
    });
  }

  static async markForRetry(id, errorMessage, { operator, retryDelayMinutes = 5 } = {}) {
    const queueItem = await this.getById(id);
    if (!queueItem) throw new Error('队列记录不存在');

    const newRetryCount = queueItem.retry_count + 1;
    const oldStatus = queueItem.status;

    let newStatus;
    if (newRetryCount >= queueItem.max_retry) {
      newStatus = QUEUE_STATUS.WAITING_MANUAL;
    } else {
      newStatus = QUEUE_STATUS.WAITING_RETRY;
    }

    const nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString();

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE material_queue 
         SET status = ?, retry_count = ?, next_retry_at = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newStatus, newRetryCount, nextRetryAt, errorMessage, id],
        async (err) => {
          if (err) reject(err);
          else {
            await TraceService.addTrace(id, ACTIONS.RETRY, {
              fromStatus: oldStatus,
              toStatus: newStatus,
              operator,
              remark: newStatus === QUEUE_STATUS.WAITING_MANUAL ? '已达最大重试次数，转人工处理' : `第${newRetryCount}次重试安排`,
              errorMessage,
              traceData: { retryCount: newRetryCount, maxRetry: queueItem.max_retry, nextRetryAt }
            });
            resolve({ newStatus, retryCount: newRetryCount });
          }
        }
      );
    });
  }

  static async markPermanentFailed(id, errorMessage, operator) {
    const queueItem = await this.getById(id);
    if (!queueItem) throw new Error('队列记录不存在');

    const oldStatus = queueItem.status;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE material_queue 
         SET status = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [QUEUE_STATUS.FAILED_PERMANENT, errorMessage, id],
        async (err) => {
          if (err) reject(err);
          else {
            await TraceService.addTrace(id, ACTIONS.FAIL, {
              fromStatus: oldStatus,
              toStatus: QUEUE_STATUS.FAILED_PERMANENT,
              operator,
              remark: '标记为永久失败',
              errorMessage
            });
            resolve();
          }
        }
      );
    });
  }

  static async manualTakeover(id, operator, remark) {
    const queueItem = await this.getById(id);
    if (!queueItem) throw new Error('队列记录不存在');

    const oldStatus = queueItem.status;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE material_queue 
         SET status = ?, handled_by = ?, handled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [QUEUE_STATUS.MANUAL_HANDLING, operator, id],
        async (err) => {
          if (err) reject(err);
          else {
            await TraceService.addTrace(id, ACTIONS.MANUAL_TAKEOVER, {
              fromStatus: oldStatus,
              toStatus: QUEUE_STATUS.MANUAL_HANDLING,
              operator,
              remark: remark || '人工接管处理'
            });
            resolve();
          }
        }
      );
    });
  }

  static async compensate(id, operator, remark, parsedData) {
    const queueItem = await this.getById(id);
    if (!queueItem) throw new Error('队列记录不存在');

    const oldStatus = queueItem.status;
    const newParsedData = parsedData ? { ...queueItem.parsed_data, ...parsedData } : queueItem.parsed_data;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE material_queue 
         SET status = ?, handled_by = ?, handled_at = CURRENT_TIMESTAMP, 
             completed_at = CURRENT_TIMESTAMP, parsed_data = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [QUEUE_STATUS.COMPENSATED, operator, JSON.stringify(newParsedData), id],
        async (err) => {
          if (err) reject(err);
          else {
            await TraceService.addTrace(id, ACTIONS.COMPENSATE, {
              fromStatus: oldStatus,
              toStatus: QUEUE_STATUS.COMPENSATED,
              operator,
              remark: remark || '补偿入账完成',
              traceData: newParsedData
            });
            resolve();
          }
        }
      );
    });
  }

  static async close(id, operator, remark) {
    const queueItem = await this.getById(id);
    if (!queueItem) throw new Error('队列记录不存在');

    const oldStatus = queueItem.status;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE material_queue 
         SET status = ?, handled_by = ?, handled_at = CURRENT_TIMESTAMP, 
             completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [QUEUE_STATUS.CLOSED, operator, id],
        async (err) => {
          if (err) reject(err);
          else {
            await TraceService.addTrace(id, ACTIONS.CLOSE, {
              fromStatus: oldStatus,
              toStatus: QUEUE_STATUS.CLOSED,
              operator,
              remark: remark || '关闭队列'
            });
            resolve();
          }
        }
      );
    });
  }

  static async getRetryableItems() {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.all(
        `SELECT * FROM material_queue 
         WHERE status = ? AND (next_retry_at IS NULL OR next_retry_at <= ?)
         ORDER BY next_retry_at ASC`,
        [QUEUE_STATUS.WAITING_RETRY, now],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => ({
            ...row,
            original_data: row.original_data ? JSON.parse(row.original_data) : null,
            parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
          })));
        }
      );
    });
  }

  static async getStatistics() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT status, COUNT(*) as count 
         FROM material_queue 
         GROUP BY status`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else {
            const stats = {};
            Object.values(QUEUE_STATUS).forEach(status => {
              stats[status] = 0;
            });
            rows.forEach(row => {
              stats[row.status] = row.count;
            });
            resolve(stats);
          }
        }
      );
    });
  }
}

module.exports = QueueService;
