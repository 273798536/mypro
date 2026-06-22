const db = require('./database');

function generateId() {
  return 'REC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

const RecordDAO = {
  create(record) {
    const id = record.id || generateId();
    const stmt = db.prepare(`
      INSERT INTO records (
        id, package_no, graph_data, expected_cut_points, actual_cut_points,
        status, unit, threshold, parameter_version, reviewer, review_comment,
        is_dirty, dirty_reason, processing_suggestion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      record.package_no,
      typeof record.graph_data === 'string' ? record.graph_data : JSON.stringify(record.graph_data),
      record.expected_cut_points ? (typeof record.expected_cut_points === 'string' ? record.expected_cut_points : JSON.stringify(record.expected_cut_points)) : null,
      record.actual_cut_points ? (typeof record.actual_cut_points === 'string' ? record.actual_cut_points : JSON.stringify(record.actual_cut_points)) : null,
      record.status || 'pending',
      record.unit,
      record.threshold,
      record.parameter_version || 'v1.0',
      record.reviewer,
      record.review_comment,
      record.is_dirty ? 1 : 0,
      record.dirty_reason,
      record.processing_suggestion
    );
    return id;
  },

  getById(id) {
    const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
    if (row) {
      row.graph_data = row.graph_data ? JSON.parse(row.graph_data) : null;
      row.expected_cut_points = row.expected_cut_points ? JSON.parse(row.expected_cut_points) : null;
      row.actual_cut_points = row.actual_cut_points ? JSON.parse(row.actual_cut_points) : null;
      row.is_dirty = !!row.is_dirty;
    }
    return row;
  },

  getByPackageNo(package_no) {
    const rows = db.prepare('SELECT * FROM records WHERE package_no = ? ORDER BY created_at DESC').all(package_no);
    return rows.map(row => {
      row.graph_data = row.graph_data ? JSON.parse(row.graph_data) : null;
      row.expected_cut_points = row.expected_cut_points ? JSON.parse(row.expected_cut_points) : null;
      row.actual_cut_points = row.actual_cut_points ? JSON.parse(row.actual_cut_points) : null;
      row.is_dirty = !!row.is_dirty;
      return row;
    });
  },

  getAll(status = null) {
    let sql = 'SELECT * FROM records';
    let params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    return rows.map(row => {
      row.graph_data = row.graph_data ? JSON.parse(row.graph_data) : null;
      row.expected_cut_points = row.expected_cut_points ? JSON.parse(row.expected_cut_points) : null;
      row.actual_cut_points = row.actual_cut_points ? JSON.parse(row.actual_cut_points) : null;
      row.is_dirty = !!row.is_dirty;
      return row;
    });
  },

  updateStatus(id, status, operator, reason = null) {
    const old = db.prepare('SELECT status FROM records WHERE id = ?').get(id);
    if (!old) return null;

    const stmt = db.prepare('UPDATE records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, id);

    StatusHistoryDAO.create({
      record_id: id,
      from_status: old.status,
      to_status: status,
      operator,
      reason
    });

    return db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  },

  markDirty(id, dirty_reason, processing_suggestion) {
    const stmt = db.prepare(`
      UPDATE records 
      SET is_dirty = 1, dirty_reason = ?, processing_suggestion = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(dirty_reason, processing_suggestion, id);
  },

  updateReview(id, reviewer, comment, status = 'reviewed') {
    const old = db.prepare('SELECT status FROM records WHERE id = ?').get(id);
    if (!old) return null;

    const stmt = db.prepare(`
      UPDATE records 
      SET status = ?, reviewer = ?, review_comment = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(status, reviewer, comment, id);

    StatusHistoryDAO.create({
      record_id: id,
      from_status: old.status,
      to_status: status,
      operator: reviewer,
      reason: comment
    });

    return true;
  }
};

const StatusHistoryDAO = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO status_history (record_id, from_status, to_status, operator, reason)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(data.record_id, data.from_status, data.to_status, data.operator, data.reason).lastInsertRowid;
  },

  getByRecordId(record_id) {
    return db.prepare('SELECT * FROM status_history WHERE record_id = ? ORDER BY created_at ASC').all(record_id);
  }
};

const ParameterVersionDAO = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO parameter_versions (
        record_id, version, param_name, old_value, new_value,
        old_unit, new_unit, conversion_factor, threshold_old, threshold_new,
        operator, change_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.record_id,
      data.version,
      data.param_name,
      data.old_value,
      data.new_value,
      data.old_unit,
      data.new_unit,
      data.conversion_factor,
      data.threshold_old,
      data.threshold_new,
      data.operator,
      data.change_reason
    ).lastInsertRowid;
  },

  getByRecordId(record_id) {
    return db.prepare('SELECT * FROM parameter_versions WHERE record_id = ? ORDER BY created_at ASC').all(record_id);
  }
};

const ExceptionDAO = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO exceptions (
        record_id, exception_type, detail, original_value,
        suggested_value, suggestion, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.record_id,
      data.exception_type,
      data.detail,
      data.original_value,
      data.suggested_value,
      data.suggestion,
      data.severity || 'warning'
    ).lastInsertRowid;
  },

  getByRecordId(record_id) {
    return db.prepare('SELECT * FROM exceptions WHERE record_id = ? ORDER BY created_at ASC').all(record_id);
  },

  getAll() {
    return db.prepare('SELECT * FROM exceptions ORDER BY created_at DESC').all();
  }
};

const ReviewActionDAO = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO review_actions (
        record_id, action_type, needs_human_judgment,
        human_judgment_result, judgment_note, operator
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.record_id,
      data.action_type,
      data.needs_human_judgment ? 1 : 0,
      data.human_judgment_result,
      data.judgment_note,
      data.operator
    ).lastInsertRowid;
  },

  getByRecordId(record_id) {
    const rows = db.prepare('SELECT * FROM review_actions WHERE record_id = ? ORDER BY created_at ASC').all(record_id);
    return rows.map(row => ({
      ...row,
      needs_human_judgment: !!row.needs_human_judgment
    }));
  },

  updateJudgment(id, result, note, operator) {
    const stmt = db.prepare(`
      UPDATE review_actions 
      SET human_judgment_result = ?, judgment_note = ?, operator = ?
      WHERE id = ?
    `);
    return stmt.run(result, note, operator, id).changes > 0;
  }
};

module.exports = {
  RecordDAO,
  StatusHistoryDAO,
  ParameterVersionDAO,
  ExceptionDAO,
  ReviewActionDAO
};
