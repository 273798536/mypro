const crypto = require('crypto');
const db = require('../models/database');

function generateEventKey(sourceType, data) {
  let keyData = '';
  
  switch (sourceType) {
    case 'calendar':
      keyData = `calendar_${data.booking_id || data.room_id}_${data.start_time}`;
      break;
    case 'access_card':
      keyData = `access_${data.room_id}_${data.checkin_time || data.start_time}`;
      break;
    case 'cancel_message':
      keyData = `cancel_${data.booking_id || data.room_id}_${data.cancel_time || data.start_time}`;
      break;
    case 'supplement':
      keyData = `supplement_${data.original_event_key || data.booking_id}_${Date.now()}`;
      break;
    default:
      keyData = `${sourceType}_${JSON.stringify(data).substring(0, 100)}`;
  }
  
  return crypto.createHash('md5').update(keyData).digest('hex');
}

function recordFailedEvent(eventKey, sourceType, errorType, errorMessage, rawPayload, eventId = null) {
  const stmt = db.prepare(`
    INSERT INTO failed_events (event_id, event_key, error_type, error_message, raw_payload, source_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(eventId, eventKey, errorType, errorMessage, JSON.stringify(rawPayload), sourceType);
}

function recordHistory(eventId, eventKey, fieldChanged, oldValue, newValue, userId, reason) {
  const stmt = db.prepare(`
    INSERT INTO event_history (event_id, event_key, field_changed, old_value, new_value, changed_by, change_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(eventId, eventKey, fieldChanged, String(oldValue || ''), String(newValue || ''), userId, reason);
}

function upsertEvent(sourceType, eventData, userId = null) {
  const eventKey = generateEventKey(sourceType, eventData);
  
  const existingEvent = db.prepare('SELECT * FROM events WHERE event_key = ?').get(eventKey);
  
  if (existingEvent) {
    const updates = [];
    const values = [];
    
    const updatableFields = [
      'room_name', 'booked_by', 'booked_at', 'end_time', 
      'checkin_time', 'cancel_time', 'has_tea_service', 
      'has_equipment', 'tea_cost', 'equipment_cost', 'total_cost',
      'raw_data', 'source_file', 'data_version'
    ];
    
    updatableFields.forEach(field => {
      if (eventData[field] !== undefined && eventData[field] !== existingEvent[field]) {
        updates.push(`${field} = ?`);
        values.push(eventData[field]);
        recordHistory(
          existingEvent.id, 
          eventKey, 
          field, 
          existingEvent[field], 
          eventData[field], 
          userId,
          '重复请求更新'
        );
      }
    });
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(eventKey);
      
      const updateStmt = db.prepare(`
        UPDATE events SET ${updates.join(', ')} WHERE event_key = ?
      `);
      updateStmt.run(...values);
    }
    
    return {
      event: db.prepare('SELECT * FROM events WHERE event_key = ?').get(eventKey),
      isNew: false,
      eventKey
    };
  }
  
  try {
    const insertStmt = db.prepare(`
      INSERT INTO events (
        event_key, source_type, event_type, room_id, room_name, booking_id,
        booked_by, booked_at, start_time, end_time, checkin_time, cancel_time,
        has_tea_service, has_equipment, tea_cost, equipment_cost, total_cost,
        status, data_version, source_file, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      eventKey,
      sourceType,
      eventData.event_type || inferEventType(sourceType, eventData),
      eventData.room_id,
      eventData.room_name,
      eventData.booking_id,
      eventData.booked_by,
      eventData.booked_at,
      eventData.start_time,
      eventData.end_time,
      eventData.checkin_time,
      eventData.cancel_time,
      eventData.has_tea_service ? 1 : 0,
      eventData.has_equipment ? 1 : 0,
      eventData.tea_cost || 0,
      eventData.equipment_cost || 0,
      eventData.total_cost || (eventData.tea_cost || 0) + (eventData.equipment_cost || 0),
      'pending',
      eventData.data_version || 'v1',
      eventData.source_file,
      JSON.stringify(eventData)
    );
    
    return {
      event: db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid),
      isNew: true,
      eventKey
    };
  } catch (error) {
    recordFailedEvent(eventKey, sourceType, 'insert_error', error.message, eventData);
    throw error;
  }
}

function inferEventType(sourceType, data) {
  switch (sourceType) {
    case 'calendar': return 'booking';
    case 'access_card': return 'checkin';
    case 'cancel_message': return 'cancel';
    case 'supplement': return 'compensation';
    default: return 'booking';
  }
}

function getEventById(id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

function getEventByKey(eventKey) {
  return db.prepare('SELECT * FROM events WHERE event_key = ?').get(eventKey);
}

function getEvents(filters = {}, limit = 100, offset = 0) {
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];
  
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.source_type) {
    query += ' AND source_type = ?';
    params.push(filters.source_type);
  }
  if (filters.event_type) {
    query += ' AND event_type = ?';
    params.push(filters.event_type);
  }
  if (filters.room_id) {
    query += ' AND room_id = ?';
    params.push(filters.room_id);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  return db.prepare(query).all(...params);
}

function updateEventStatus(eventId, status, userId, reason = '') {
  const event = getEventById(eventId);
  if (!event) throw new Error('事件不存在');
  
  recordHistory(eventId, event.event_key, 'status', event.status, status, userId, reason);
  
  db.prepare('UPDATE events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, eventId);
  
  return getEventById(eventId);
}

module.exports = {
  generateEventKey,
  recordFailedEvent,
  recordHistory,
  upsertEvent,
  getEventById,
  getEventByKey,
  getEvents,
  updateEventStatus
};
