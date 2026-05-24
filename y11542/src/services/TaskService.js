const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { getDatabase } = require('../models/database');
const { TASK_STATUS, FAILURE_TYPE, MAX_RETRY_COUNT, RETRY_DELAY_MINUTES } = require('../utils/constants');

class TaskService {
  async createTask(taskData, rawImportId = null) {
    const db = await getDatabase();
    const taskId = uuidv4();
    const now = dayjs().toISOString();

    await db.run(`
      INSERT INTO task_queue (
        id, material_id, audit_result, cost_report, supplier_statement,
        approval_email, status, raw_import_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId,
      taskData.material_id,
      taskData.audit_result || null,
      taskData.cost_report ? JSON.stringify(taskData.cost_report) : null,
      taskData.supplier_statement ? JSON.stringify(taskData.supplier_statement) : null,
      taskData.approval_email || null,
      TASK_STATUS.PENDING,
      rawImportId,
      now,
      now
    ]);

    await this.recordStatusChange(taskId, null, TASK_STATUS.PENDING, '任务创建');

    return this.getTaskById(taskId);
  }

  async getTaskById(taskId) {
    const db = await getDatabase();
    const task = await db.get('SELECT * FROM task_queue WHERE id = ?', taskId);
    
    if (task) {
      task.cost_report = task.cost_report ? JSON.parse(task.cost_report) : null;
      task.supplier_statement = task.supplier_statement ? JSON.parse(task.supplier_statement) : null;
    }
    
    return task;
  }

  async getTasks(params = {}) {
    const db = await getDatabase();
    let query = 'SELECT * FROM task_queue WHERE 1=1';
    const values = [];

    if (params.status) {
      query += ' AND status = ?';
      values.push(params.status);
    }
    if (params.material_id) {
      query += ' AND material_id = ?';
      values.push(params.material_id);
    }
    if (params.failure_type) {
      query += ' AND failure_type = ?';
      values.push(params.failure_type);
    }

    query += ' ORDER BY created_at DESC';

    if (params.limit) {
      query += ' LIMIT ?';
      values.push(params.limit);
    }
    if (params.offset) {
      query += ' OFFSET ?';
      values.push(params.offset);
    }

    const tasks = await db.all(query, values);
    
    return tasks.map(task => ({
      ...task,
      cost_report: task.cost_report ? JSON.parse(task.cost_report) : null,
      supplier_statement: task.supplier_statement ? JSON.parse(task.supplier_statement) : null
    }));
  }

  async updateTaskStatus(taskId, newStatus, options = {}) {
    const db = await getDatabase();
    const task = await this.getTaskById(taskId);
    
    if (!task) {
      throw new Error('任务不存在');
    }

    const now = dayjs().toISOString();
    let updateFields = ['status = ?', 'updated_at = ?'];
    let updateValues = [newStatus, now];

    if (options.failureType) {
      updateFields.push('failure_type = ?');
      updateValues.push(options.failureType);
    }
    if (options.failureReason) {
      updateFields.push('failure_reason = ?');
      updateValues.push(options.failureReason);
    }
    if (options.nextRetryAt) {
      updateFields.push('next_retry_at = ?');
      updateValues.push(options.nextRetryAt);
    }
    if (options.retryCount !== undefined) {
      updateFields.push('retry_count = ?');
      updateValues.push(options.retryCount);
    }
    if (options.processedAt) {
      updateFields.push('processed_at = ?');
      updateValues.push(options.processedAt);
    }

    updateValues.push(taskId);

    await db.run(`
      UPDATE task_queue 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    await this.recordStatusChange(
      taskId, 
      task.status, 
      newStatus, 
      options.reason || '',
      options.operator,
      options.failureType
    );

    return this.getTaskById(taskId);
  }

  async recordStatusChange(taskId, fromStatus, toStatus, reason = '', operator = null, failureType = null) {
    const db = await getDatabase();
    await db.run(`
      INSERT INTO status_history (task_id, from_status, to_status, failure_type, reason, operator)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [taskId, fromStatus, toStatus, failureType, reason, operator]);
  }

  async getTaskHistory(taskId) {
    const db = await getDatabase();
    return await db.all(`
      SELECT * FROM status_history 
      WHERE task_id = ? 
      ORDER BY created_at ASC
    `, taskId);
  }

  async markProcessing(taskId) {
    return this.updateTaskStatus(taskId, TASK_STATUS.PROCESSING, {
      reason: '开始处理任务'
    });
  }

  async handleFailure(taskId, failureType, failureReason) {
    const task = await this.getTaskById(taskId);
    const now = dayjs();

    if (failureType === FAILURE_TYPE.RETRYABLE) {
      const newRetryCount = task.retry_count + 1;
      
      if (newRetryCount >= task.max_retries) {
        return this.updateTaskStatus(taskId, TASK_STATUS.WAITING_MANUAL, {
          failureType: FAILURE_TYPE.NEEDS_MANUAL,
          failureReason: `重试次数已达上限(${task.max_retries}次): ${failureReason}`,
          retryCount: newRetryCount,
          reason: '重试次数超限，转人工处理'
        });
      }

      const nextRetryAt = now.add(RETRY_DELAY_MINUTES, 'minute').toISOString();
      return this.updateTaskStatus(taskId, TASK_STATUS.RETRYING, {
        failureType: FAILURE_TYPE.RETRYABLE,
        failureReason,
        retryCount: newRetryCount,
        nextRetryAt,
        reason: `第${newRetryCount}次重试计划于${nextRetryAt}执行`
      });
    } else if (failureType === FAILURE_TYPE.NEEDS_MANUAL) {
      return this.updateTaskStatus(taskId, TASK_STATUS.WAITING_MANUAL, {
        failureType: FAILURE_TYPE.NEEDS_MANUAL,
        failureReason,
        reason: '需要人工介入处理'
      });
    } else {
      return this.updateTaskStatus(taskId, TASK_STATUS.PERMANENT_FAILED, {
        failureType: FAILURE_TYPE.PERMANENT,
        failureReason,
        processedAt: now.toISOString(),
        reason: '任务永久失败'
      });
    }
  }

  async manualTakeover(taskId, handler, note = '') {
    return this.updateTaskStatus(taskId, TASK_STATUS.MANUAL_TAKEOVER, {
      operator: handler,
      reason: note || '人工接管任务'
    });
  }

  async compensateTask(taskId, amount, note, operator) {
    const db = await getDatabase();
    const now = dayjs().toISOString();

    await db.run(`
      UPDATE task_queue 
      SET status = ?, compensation_amount = ?, compensation_note = ?, 
          updated_at = ?, processed_at = ?
      WHERE id = ?
    `, [TASK_STATUS.COMPENSATED, amount, note, now, now, taskId]);

    await this.recordStatusChange(
      taskId, 
      null, 
      TASK_STATUS.COMPENSATED, 
      note, 
      operator
    );

    return this.getTaskById(taskId);
  }

  async closeTask(taskId, closeReason, operator) {
    const db = await getDatabase();
    const now = dayjs().toISOString();

    await db.run(`
      UPDATE task_queue 
      SET status = ?, close_reason = ?, updated_at = ?, processed_at = ?
      WHERE id = ?
    `, [TASK_STATUS.CLOSED, closeReason, now, now, taskId]);

    await this.recordStatusChange(
      taskId, 
      null, 
      TASK_STATUS.CLOSED, 
      closeReason, 
      operator
    );

    return this.getTaskById(taskId);
  }

  async getRetryableTasks() {
    const db = await getDatabase();
    const now = dayjs().toISOString();
    
    const tasks = await db.all(`
      SELECT * FROM task_queue 
      WHERE status = ? AND next_retry_at <= ?
      ORDER BY next_retry_at ASC
    `, [TASK_STATUS.RETRYING, now]);

    return tasks.map(task => ({
      ...task,
      cost_report: task.cost_report ? JSON.parse(task.cost_report) : null,
      supplier_statement: task.supplier_statement ? JSON.parse(task.supplier_statement) : null
    }));
  }

  async getStatistics() {
    const db = await getDatabase();

    const byStatus = await db.all(`
      SELECT status, COUNT(*) as count 
      FROM task_queue 
      GROUP BY status
    `);

    const byFailureType = await db.all(`
      SELECT failure_type, COUNT(*) as count 
      FROM task_queue 
      WHERE failure_type IS NOT NULL
      GROUP BY failure_type
    `);

    const retryDistribution = await db.all(`
      SELECT 
        CASE 
          WHEN retry_count = 0 THEN '0次'
          WHEN retry_count = 1 THEN '1次'
          WHEN retry_count = 2 THEN '2次'
          ELSE '3次及以上'
        END as retry_times,
        COUNT(*) as count
      FROM task_queue 
      WHERE retry_count > 0
      GROUP BY retry_times
      ORDER BY retry_count
    `);

    const manualPending = await db.get(`
      SELECT COUNT(*) as count 
      FROM task_queue 
      WHERE status IN (?, ?)
    `, [TASK_STATUS.WAITING_MANUAL, TASK_STATUS.MANUAL_TAKEOVER]);

    const permanentFailed = await db.get(`
      SELECT COUNT(*) as count 
      FROM task_queue 
      WHERE status = ?
    `, [TASK_STATUS.PERMANENT_FAILED]);

    const compensationTotal = await db.get(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(compensation_amount), 0) as total_amount
      FROM task_queue 
      WHERE status = ?
    `, [TASK_STATUS.COMPENSATED]);

    return {
      byStatus,
      byFailureType,
      retryDistribution,
      manualPending: manualPending.count,
      permanentFailed: permanentFailed.count,
      compensation: compensationTotal
    };
  }
}

module.exports = new TaskService();