const db = require('../models/database');
const eventService = require('./eventService');

function createCompensation(eventId, compensationType, amount, notes = '') {
  const event = eventService.getEventById(eventId);
  if (!event) throw new Error('事件不存在');
  
  const stmt = db.prepare(`
    INSERT INTO compensation_records (
      event_id, event_key, compensation_type, amount, review_notes
    ) VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    eventId,
    event.event_key,
    compensationType,
    amount,
    notes
  );
  
  eventService.updateEventStatus(eventId, 'reviewing', null, '创建补偿记录');
  
  return db.prepare('SELECT * FROM compensation_records WHERE id = ?').get(result.lastInsertRowid);
}

function reviewCompensation(compensationId, userId, approved, notes = '') {
  const compensation = db.prepare('SELECT * FROM compensation_records WHERE id = ?').get(compensationId);
  if (!compensation) throw new Error('补偿记录不存在');
  if (compensation.status !== 'pending') throw new Error('该补偿记录已处理');
  
  const newStatus = approved ? 'approved' : 'rejected';
  
  db.prepare(`
    UPDATE compensation_records 
    SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ?
    WHERE id = ?
  `).run(newStatus, userId, notes, compensationId);
  
  if (approved) {
    eventService.updateEventStatus(compensation.event_id, 'compensated', userId, '补偿已通过审核');
  } else {
    eventService.updateEventStatus(compensation.event_id, 'retrying', userId, '补偿被驳回，需重试');
  }
  
  return db.prepare('SELECT * FROM compensation_records WHERE id = ?').get(compensationId);
}

function postCompensation(compensationId, userId) {
  const compensation = db.prepare('SELECT * FROM compensation_records WHERE id = ?').get(compensationId);
  if (!compensation) throw new Error('补偿记录不存在');
  if (compensation.status !== 'approved') throw new Error('补偿未通过审核，无法入账');
  
  db.prepare(`
    UPDATE compensation_records 
    SET status = 'posted', posted_by = ?, posted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId, compensationId);
  
  eventService.updateEventStatus(compensation.event_id, 'closed', userId, '补偿已入账');
  
  return db.prepare('SELECT * FROM compensation_records WHERE id = ?').get(compensationId);
}

function closeEvent(eventId, userId, reason = '') {
  return eventService.updateEventStatus(eventId, 'closed', userId, reason || '手动关闭事件');
}

function manualTakeover(eventId, userId, reason = '') {
  return eventService.updateEventStatus(eventId, 'reviewing', userId, reason || '人工接管处理');
}

function getCompensations(filters = {}) {
  let query = 'SELECT * FROM compensation_records WHERE 1=1';
  const params = [];
  
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.event_id) {
    query += ' AND event_id = ?';
    params.push(filters.event_id);
  }
  
  query += ' ORDER BY created_at DESC';
  
  return db.prepare(query).all(...params);
}

function getCompensationById(id) {
  return db.prepare('SELECT * FROM compensation_records WHERE id = ?').get(id);
}

function getCompensationStats() {
  return db.prepare(`
    SELECT 
      cr.status,
      COUNT(*) as count,
      SUM(cr.amount) as total_amount,
      SUM(CASE WHEN cr.compensation_type = 'tea' THEN cr.amount ELSE 0 END) as tea_amount,
      SUM(CASE WHEN cr.compensation_type = 'equipment' THEN cr.amount ELSE 0 END) as equipment_amount,
      SUM(CASE WHEN cr.compensation_type = 'manual' THEN cr.amount ELSE 0 END) as manual_amount
    FROM compensation_records cr
    GROUP BY cr.status
    ORDER BY cr.status
  `).all();
}

function getEventWithCompensation(eventId) {
  const event = eventService.getEventById(eventId);
  if (!event) return null;
  
  const compensations = db.prepare(`
    SELECT * FROM compensation_records WHERE event_id = ?
  `).all(eventId);
  
  const history = db.prepare(`
    SELECT * FROM event_history WHERE event_id = ? ORDER BY changed_at DESC
  `).all(eventId);
  
  const retryLogs = db.prepare(`
    SELECT * FROM retry_logs WHERE event_id = ? ORDER BY executed_at DESC
  `).all(eventId);
  
  return {
    event,
    compensations,
    history,
    retryLogs
  };
}

module.exports = {
  createCompensation,
  reviewCompensation,
  postCompensation,
  closeEvent,
  manualTakeover,
  getCompensations,
  getCompensationById,
  getCompensationStats,
  getEventWithCompensation
};
