const db = require('./db');

function createHistoryRecord(boothId, fieldName, oldValue, newValue, operator, comment) {
  const stmt = db.prepare(`
    INSERT INTO booth_history (booth_id, field_name, old_value, new_value, operator, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(boothId, fieldName, oldValue ? String(oldValue) : null, newValue ? String(newValue) : null, operator || 'system', comment || null);
}

function getAll() {
  return db.prepare('SELECT * FROM booths ORDER BY created_at DESC').all();
}

function getById(id) {
  return db.prepare('SELECT * FROM booths WHERE id = ?').get(id);
}

function create(data, operator = 'system') {
  const stmt = db.prepare(`
    INSERT INTO booths (
      booth_number, label_name, contact_person, phone,
      song_name, song_alias, rehearsal_info, authorization_note,
      status, final_conclusion, manual_annotation, delivery_checklist
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.booth_number,
    data.label_name,
    data.contact_person || null,
    data.phone || null,
    data.song_name || null,
    data.song_alias || null,
    data.rehearsal_info || null,
    data.authorization_note || null,
    data.status || 'pending',
    data.final_conclusion || null,
    data.manual_annotation || null,
    data.delivery_checklist || null
  );

  const newId = result.lastInsertRowid;
  createHistoryRecord(newId, 'record', null, 'created', operator, '创建记录');
  return getById(newId);
}

function update(id, data, operator = 'system', comment = '') {
  const current = getById(id);
  if (!current) return null;

  const fields = [
    'booth_number', 'label_name', 'contact_person', 'phone',
    'song_name', 'song_alias', 'rehearsal_info', 'authorization_note',
    'status', 'final_conclusion', 'manual_annotation', 'delivery_checklist'
  ];

  const updates = [];
  const values = [];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
      if (current[field] !== data[field]) {
        createHistoryRecord(id, field, current[field], data[field], operator, comment);
      }
    }
  });

  if (updates.length === 0) return current;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`UPDATE booths SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getById(id);
}

function remove(id) {
  db.prepare('DELETE FROM booth_notes WHERE booth_id = ?').run(id);
  db.prepare('DELETE FROM booth_history WHERE booth_id = ?').run(id);
  const result = db.prepare('DELETE FROM booths WHERE id = ?').run(id);
  return result.changes > 0;
}

function addNote(boothId, noteType, content, author = 'system') {
  const stmt = db.prepare(`
    INSERT INTO booth_notes (booth_id, note_type, content, author)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(boothId, noteType, content, author);
  return db.prepare('SELECT * FROM booth_notes WHERE id = ?').get(result.lastInsertRowid);
}

function getNotes(boothId) {
  return db.prepare('SELECT * FROM booth_notes WHERE booth_id = ? ORDER BY created_at DESC').all(boothId);
}

function getHistory(boothId) {
  return db.prepare('SELECT * FROM booth_history WHERE booth_id = ? ORDER BY changed_at DESC').all(boothId);
}

function findDuplicateSongAliases() {
  const rows = db.prepare(`
    SELECT b1.id AS id1, b1.song_name AS name1, b1.song_alias AS alias1, b1.booth_number AS booth1,
           b2.id AS id2, b2.song_name AS name2, b2.song_alias AS alias2, b2.booth_number AS booth2
    FROM booths b1
    JOIN booths b2 ON b1.id < b2.id
    WHERE (b1.song_alias IS NOT NULL AND b1.song_alias != '' AND b1.song_alias = b2.song_alias)
       OR (b1.song_name IS NOT NULL AND b1.song_name != '' AND (b1.song_name = b2.song_alias OR b1.song_alias = b2.song_name))
  `).all();

  return rows;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addNote,
  getNotes,
  getHistory,
  findDuplicateSongAliases,
};
