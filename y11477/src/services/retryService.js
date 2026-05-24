const db = require('../models/database');
const eventService = require('./eventService');

const RETRY_DELAYS = [60000, 300000, 1800000];

function calculateNextRetry(retryCount) {
  const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
  return new Date(Date.now() + delay).toISOString();
}

function canRetry(event) {
  return event.retry_count < event.max_retries && event.status !== 'dead_letter';
}

function scheduleRetry(eventId, userId = null, reason = '') {
  const event = eventService.getEventById(eventId);
  if (!event) throw new Error('事件不存在');
  
  if (!canRetry(event)) {
    return moveToDeadLetter(eventId, userId, '超出最大重试次数');
  }
  
  const nextRetryAt = calculateNextRetry(event.retry_count);
  const newRetryCount = event.retry_count + 1;
  
  const stmt = db.prepare(`
    UPDATE events 
    SET status = 'retrying', retry_count = ?, next_retry_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(newRetryCount, nextRetryAt, eventId);
  
  db.prepare(`
    INSERT INTO retry_logs (event_id, retry_attempt, status, executed_by, error_message)
    VALUES (?, ?, 'scheduled', ?, ?)
  `).run(eventId, newRetryCount, userId, reason);
  
  eventService.recordHistory(eventId, event.event_key, 'status', event.status, 'retrying', userId, reason);
  
  return eventService.getEventById(eventId);
}

function executeRetry(eventId, userId = null) {
  const event = eventService.getEventById(eventId);
  if (!event) throw new Error('事件不存在');
  
  const success = Math.random() > 0.3;
  
  db.prepare(`
    INSERT INTO retry_logs (event_id, retry_attempt, status, executed_by, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    eventId, 
    event.retry_count, 
    success ? 'success' : 'failed', 
    userId,
    success ? null : '模拟重试失败 - 外部系统响应超时'
  );
  
  if (success) {
    return eventService.updateEventStatus(eventId, 'reviewing', userId, '重试成功，进入复核');
  } else {
    if (canRetry(event)) {
      return scheduleRetry(eventId, userId, '重试失败，安排下一次重试');
    } else {
      return moveToDeadLetter(eventId, userId, '重试次数用尽');
    }
  }
}

function moveToDeadLetter(eventId, userId = null, reason = '') {
  const event = eventService.updateEventStatus(eventId, 'dead_letter', userId, reason || '移入死信队列');
  
  db.prepare(`
    UPDATE events SET last_error = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason, eventId);
  
  return event;
}

function restoreFromDeadLetter(eventId, userId, reason) {
  const event = eventService.getEventById(eventId);
  if (!event) throw new Error('事件不存在');
  
  db.prepare(`
    UPDATE events 
    SET status = 'reviewing', retry_count = 0, next_retry_at = NULL, last_error = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(eventId);
  
  eventService.recordHistory(eventId, event.event_key, 'status', 'dead_letter', 'reviewing', userId, reason);
  
  return eventService.getEventById(eventId);
}

function getRetryQueue() {
  return db.prepare(`
    SELECT * FROM events 
    WHERE status = 'retrying' 
    ORDER BY next_retry_at ASC
  `).all();
}

function getDeadLetterQueue() {
  return db.prepare(`
    SELECT * FROM events 
    WHERE status = 'dead_letter' 
    ORDER BY updated_at DESC
  `).all();
}

function processDueRetries() {
  const now = new Date().toISOString();
  const dueEvents = db.prepare(`
    SELECT * FROM events 
    WHERE status = 'retrying' 
    AND next_retry_at <= ?
  `).all(now);
  
  const results = [];
  dueEvents.forEach(event => {
    try {
      const result = executeRetry(event.id);
      results.push({ eventId: event.id, status: result.status });
    } catch (error) {
      results.push({ eventId: event.id, error: error.message });
    }
  });
  
  return results;
}

function getRetryStats() {
  return db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(CASE WHEN source_type = 'calendar' THEN 1 ELSE 0 END) as calendar_count,
      SUM(CASE WHEN source_type = 'access_card' THEN 1 ELSE 0 END) as access_count,
      SUM(CASE WHEN source_type = 'cancel_message' THEN 1 ELSE 0 END) as cancel_count,
      SUM(CASE WHEN source_type = 'supplement' THEN 1 ELSE 0 END) as supplement_count
    FROM events 
    WHERE status IN ('retrying', 'dead_letter')
    GROUP BY status
    ORDER BY status
  `).all();
}

module.exports = {
  scheduleRetry,
  executeRetry,
  moveToDeadLetter,
  restoreFromDeadLetter,
  getRetryQueue,
  getDeadLetterQueue,
  processDueRetries,
  getRetryStats,
  canRetry
};
