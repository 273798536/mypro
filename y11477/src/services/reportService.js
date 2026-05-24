const db = require('../models/database');

function getFailedEvents(resolved = 0, limit = 100) {
  return db.prepare(`
    SELECT 
      fe.*,
      e.status as event_status,
      e.source_type,
      e.event_type,
      e.room_id,
      e.room_name
    FROM failed_events fe
    LEFT JOIN events e ON fe.event_id = e.id
    WHERE fe.resolved = ?
    ORDER BY fe.failed_at DESC
    LIMIT ?
  `).all(resolved, limit);
}

function resolveFailedEvent(failedEventId, notes = '') {
  return db.prepare(`
    UPDATE failed_events 
    SET resolved = 1, resolved_at = CURRENT_TIMESTAMP, resolved_notes = ?
    WHERE id = ?
  `).run(notes, failedEventId);
}

function getSummaryReport() {
  const eventStats = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(total_cost) as total_cost,
      SUM(has_tea_service) as tea_count,
      SUM(has_equipment) as equipment_count,
      SUM(CASE WHEN source_type = 'calendar' THEN 1 ELSE 0 END) as calendar_count,
      SUM(CASE WHEN source_type = 'access_card' THEN 1 ELSE 0 END) as access_count,
      SUM(CASE WHEN source_type = 'cancel_message' THEN 1 ELSE 0 END) as cancel_count,
      SUM(CASE WHEN source_type = 'supplement' THEN 1 ELSE 0 END) as supplement_count
    FROM events
    GROUP BY status
    ORDER BY status
  `).all();
  
  const failedStats = db.prepare(`
    SELECT 
      resolved,
      COUNT(*) as count,
      error_type
    FROM failed_events
    GROUP BY resolved, error_type
    ORDER BY resolved, count DESC
  `).all();
  
  const compensationStats = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(amount) as total_amount
    FROM compensation_records
    GROUP BY status
  `).all();
  
  return {
    generatedAt: new Date().toISOString(),
    eventStats,
    failedStats,
    compensationStats
  };
}

function getManagerDashboard() {
  const retryByCategory = db.prepare(`
    SELECT 
      source_type as category,
      status,
      COUNT(*) as count,
      SUM(total_cost) as estimated_cost
    FROM events
    WHERE status IN ('retrying', 'dead_letter')
    GROUP BY source_type, status
    ORDER BY count DESC
  `).all();
  
  const deadLetter = db.prepare(`
    SELECT 
      e.*,
      COALESCE(rl_stats.retry_attempts, 0) as retry_attempts,
      COALESCE(rl_stats.errors, '') as errors
    FROM events e
    LEFT JOIN (
      SELECT 
        event_id,
        COUNT(id) as retry_attempts,
        GROUP_CONCAT(error_message, '; ') as errors
      FROM (
        SELECT DISTINCT event_id, id, error_message 
        FROM retry_logs 
        WHERE error_message IS NOT NULL
      )
      GROUP BY event_id
    ) rl_stats ON e.id = rl_stats.event_id
    WHERE e.status = 'dead_letter'
    ORDER BY e.updated_at DESC
  `).all();
  
  const recoverableEvents = db.prepare(`
    SELECT 
      e.*,
      COALESCE(rl_counts.retry_count, 0) as retry_count
    FROM events e
    LEFT JOIN (
      SELECT event_id, COUNT(id) as retry_count
      FROM retry_logs
      GROUP BY event_id
    ) rl_counts ON e.id = rl_counts.event_id
    WHERE e.status = 'retrying'
    ORDER BY e.next_retry_at ASC
  `).all();
  
  const recoveryImpact = db.prepare(`
    SELECT 
      SUM(CASE WHEN e.status = 'closed' AND cr.status = 'posted' THEN cr.amount ELSE 0 END) as recovered_amount,
      SUM(CASE WHEN e.status = 'dead_letter' THEN e.total_cost ELSE 0 END) as at_risk_amount,
      COUNT(DISTINCT CASE WHEN e.status = 'closed' THEN e.id END) as resolved_count,
      COUNT(DISTINCT CASE WHEN e.status = 'dead_letter' THEN e.id END) as dead_letter_count
    FROM events e
    LEFT JOIN compensation_records cr ON e.id = cr.event_id
  `).get();
  
  return {
    generatedAt: new Date().toISOString(),
    retryByCategory,
    deadLetter,
    recoverableEvents,
    recoveryImpact
  };
}

function getEventAuditTrail(eventId) {
  return db.prepare(`
    SELECT 
      'history' as type,
      eh.changed_at as timestamp,
      eh.field_changed as action,
      eh.old_value,
      eh.new_value,
      eh.change_reason as notes,
      u.name as user_name
    FROM event_history eh
    LEFT JOIN users u ON eh.changed_by = u.id
    WHERE eh.event_id = ?
    
    UNION ALL
    
    SELECT 
      'retry' as type,
      rl.executed_at as timestamp,
      rl.status as action,
      NULL as old_value,
      NULL as new_value,
      rl.error_message as notes,
      u.name as user_name
    FROM retry_logs rl
    LEFT JOIN users u ON rl.executed_by = u.id
    WHERE rl.event_id = ?
    
    ORDER BY timestamp DESC
  `).all(eventId, eventId);
}

function getDailyReport(date = null) {
  const dateFilter = date ? `AND DATE(e.created_at) = '${date}'` : '';
  
  return db.prepare(`
    SELECT 
      DATE(e.created_at) as report_date,
      e.source_type,
      e.status,
      COUNT(*) as event_count,
      SUM(e.total_cost) as total_cost,
      SUM(CASE WHEN e.has_tea_service = 1 THEN e.tea_cost ELSE 0 END) as tea_cost,
      SUM(CASE WHEN e.has_equipment = 1 THEN e.equipment_cost ELSE 0 END) as equipment_cost,
      COUNT(DISTINCT cr.id) as compensation_count,
      SUM(CASE WHEN cr.status = 'posted' THEN cr.amount ELSE 0 END) as posted_amount
    FROM events e
    LEFT JOIN compensation_records cr ON e.id = cr.event_id
    WHERE 1=1 ${dateFilter}
    GROUP BY DATE(e.created_at), e.source_type, e.status
    ORDER BY report_date DESC, e.source_type, e.status
  `).all();
}

module.exports = {
  getFailedEvents,
  resolveFailedEvent,
  getSummaryReport,
  getManagerDashboard,
  getEventAuditTrail,
  getDailyReport
};
