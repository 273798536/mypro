const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../db/database');

const TASK_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RETRY: 'retry',
  MANUAL: 'manual',
  FAILED: 'failed',
  COMPLETED: 'completed'
};

const TASK_TYPES = {
  IMPORT_VALIDATION: 'import_validation',
  DATA_CLEANUP: 'data_cleanup',
  EXPORT: 'export',
  REPORT_GENERATION: 'report_generation',
  CERTIFICATE_CHECK: 'certificate_check'
};

function createTask(taskType, payload = {}, options = {}) {
  const db = getDatabase();
  const taskId = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO async_tasks 
    (task_id, task_type, payload, priority, max_retries, available_after)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);
  
  const payloadJson = JSON.stringify(payload);
  const delay = options.delaySeconds ? `+${options.delaySeconds} seconds` : '+0 seconds';
  
  stmt.run(
    taskId,
    taskType,
    payloadJson,
    options.priority || 0,
    options.maxRetries || 3,
    delay
  );
  
  return taskId;
}

function claimNextTask(taskTypes = null) {
  const db = getDatabase();
  
  let whereClause = `
    status IN ('pending', 'retry')
    AND available_after <= CURRENT_TIMESTAMP
  `;
  
  const params = [];
  
  if (taskTypes && taskTypes.length > 0) {
    const placeholders = taskTypes.map(() => '?').join(', ');
    whereClause += ` AND task_type IN (${placeholders})`;
    params.push(...taskTypes);
  }
  
  const findStmt = db.prepare(`
    SELECT id, task_id, task_type, payload, retry_count, max_retries
    FROM async_tasks
    WHERE ${whereClause}
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
  `);
  
  const task = findStmt.get(...params);
  
  if (task) {
    const updateStmt = db.prepare(`
      UPDATE async_tasks
      SET status = 'processing', last_attempted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(task.id);
    
    try {
      task.payload = JSON.parse(task.payload);
    } catch (e) {
      task.payload = {};
    }
    
    return task;
  }
  
  return null;
}

function completeTask(taskId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE async_tasks
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `);
  return stmt.run(taskId);
}

function failTask(taskId, error, options = {}) {
  const db = getDatabase();
  const task = db.prepare('SELECT retry_count, max_retries FROM async_tasks WHERE task_id = ?').get(taskId);
  
  if (!task) return null;
  
  const newRetryCount = task.retry_count + 1;
  const shouldRetry = !options.noRetry && newRetryCount < task.max_retries;
  
  let newStatus, availableAfter;
  
  if (options.manual) {
    newStatus = TASK_STATUSES.MANUAL;
    availableAfter = 'datetime(\'now\', \'+100 years\')';
  } else if (shouldRetry) {
    newStatus = TASK_STATUSES.RETRY;
    const backoffSeconds = Math.min(Math.pow(2, newRetryCount) * 60, 3600);
    availableAfter = `datetime('now', '+${backoffSeconds} seconds')`;
  } else {
    newStatus = TASK_STATUSES.FAILED;
    availableAfter = 'CURRENT_TIMESTAMP';
  }
  
  const stmt = db.prepare(`
    UPDATE async_tasks
    SET 
      status = ?,
      retry_count = ?,
      error_message = ?,
      error_stack = ?,
      available_after = ${availableAfter},
      updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `);
  
  return stmt.run(
    newStatus,
    newRetryCount,
    error.message || String(error),
    error.stack || null,
    taskId
  );
}

function retryTask(taskId, delaySeconds = 0) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE async_tasks
    SET 
      status = 'retry',
      error_message = NULL,
      error_stack = NULL,
      available_after = datetime('now', ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `);
  return stmt.run(`+${delaySeconds} seconds`, taskId);
}

function markAsManual(taskId, note = '') {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE async_tasks
    SET 
      status = 'manual',
      error_message = ?,
      available_after = datetime('now', '+100 years'),
      updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `);
  return stmt.run(note || 'Requires manual intervention', taskId);
}

function getTaskStatus(taskId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM async_tasks WHERE task_id = ?
  `);
  const task = stmt.get(taskId);
  
  if (task && task.payload) {
    try {
      task.payload = JSON.parse(task.payload);
    } catch (e) {
      task.payload = {};
    }
  }
  
  return task;
}

function getTasksByStatus(status, limit = 100) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM async_tasks
    WHERE status = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const tasks = stmt.all(status, limit);
  
  return tasks.map(task => {
    if (task.payload) {
      try {
        task.payload = JSON.parse(task.payload);
      } catch (e) {
        task.payload = {};
      }
    }
    return task;
  });
}

function getTaskStats() {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count
    FROM async_tasks
    GROUP BY status
  `);
  return stmt.all();
}

function recoverStuckTasks(maxAgeMinutes = 30) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE async_tasks
    SET status = 'retry', available_after = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE 
      status = 'processing'
      AND last_attempted_at < datetime('now', '-' || ? || ' minutes')
  `);
  const result = stmt.run(maxAgeMinutes);
  return result.changes || 0;
}

module.exports = {
  TASK_STATUSES,
  TASK_TYPES,
  createTask,
  claimNextTask,
  completeTask,
  failTask,
  retryTask,
  markAsManual,
  getTaskStatus,
  getTasksByStatus,
  getTaskStats,
  recoverStuckTasks
};
