const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dbPath = path.join(__dirname, 'data', 'drum-beat.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

app.get('/api/beat-items', (req, res) => {
  const { status, keyword, page = 1, pageSize = 10 } = req.query;
  let sql = 'SELECT * FROM beat_items WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (student_name LIKE ? OR piece_name LIKE ? OR item_no LIKE ? OR teacher_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  const items = db.prepare(sql).all(...params);

  let countSql = 'SELECT COUNT(*) as total FROM beat_items WHERE 1=1';
  const countParams = [];
  if (status && status !== 'all') {
    countSql += ' AND status = ?';
    countParams.push(status);
  }
  if (keyword) {
    countSql += ' AND (student_name LIKE ? OR piece_name LIKE ? OR item_no LIKE ? OR teacher_name LIKE ?)';
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw, kw);
  }
  const { total } = db.prepare(countSql).get(...countParams);

  res.json({ items, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

app.get('/api/beat-items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM beat_items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const attachments = db.prepare('SELECT * FROM attachments WHERE beat_item_id = ? ORDER BY id').all(req.params.id);
  const history = db.prepare('SELECT * FROM judge_history WHERE beat_item_id = ? ORDER BY id DESC').all(req.params.id);
  const versionConflict = db.prepare('SELECT * FROM version_conflicts WHERE beat_item_id = ?').get(req.params.id);
  const badData = db.prepare('SELECT * FROM bad_data_records WHERE beat_item_id = ?').all(req.params.id);

  let newVersionItem = null;
  if (item.new_version_id) {
    newVersionItem = db.prepare('SELECT id, item_no, source_version, status, judge_result FROM beat_items WHERE id = ?').get(item.new_version_id);
  }

  res.json({ item, attachments, history, versionConflict, badData, newVersionItem });
});

app.put('/api/beat-items/:id/judge', (req, res) => {
  const { result, remark, operator } = req.body;
  const itemId = req.params.id;

  const oldItem = db.prepare('SELECT judge_result, judge_remark FROM beat_items WHERE id = ?').get(itemId);
  if (!oldItem) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const insertHistory = db.prepare(`
    INSERT INTO judge_history 
    (beat_item_id, before_result, after_result, before_remark, after_remark, changed_by, change_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let status = '已判定';
  if (result === '存疑' || result === '待复核') {
    status = '待复核';
  } else if (result && result.includes('改判')) {
    status = '已改判';
  } else if (result) {
    status = '已判定';
  }

  const updateItem = db.prepare(`
    UPDATE beat_items 
    SET judge_result = ?, judge_remark = ?, judge_by = ?, judge_at = datetime('now','localtime'), 
        status = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    insertHistory.run(
      itemId,
      oldItem.judge_result || '未判定',
      result || '未判定',
      oldItem.judge_remark || '',
      remark || '',
      operator || '系统',
      '人工改判'
    );
    updateItem.run(result, remark, operator || '系统', status, itemId);
  });

  transaction();

  const updated = db.prepare('SELECT * FROM beat_items WHERE id = ?').get(itemId);
  res.json({ success: true, item: updated });
});

app.get('/api/beat-items/:id/history', (req, res) => {
  const history = db.prepare(`
    SELECT * FROM judge_history 
    WHERE beat_item_id = ? 
    ORDER BY id DESC
  `).all(req.params.id);
  res.json(history);
});

app.get('/api/version-conflicts', (req, res) => {
  const conflicts = db.prepare(`
    SELECT vc.*, bi.student_name, bi.piece_name, bi.item_no, bi.status
    FROM version_conflicts vc
    JOIN beat_items bi ON vc.beat_item_id = bi.id
    ORDER BY vc.id DESC
  `).all();
  res.json(conflicts);
});

app.put('/api/version-conflicts/:id/resolve', (req, res) => {
  const { resolved_by, action } = req.body;
  const conflictId = req.params.id;

  const conflict = db.prepare('SELECT * FROM version_conflicts WHERE id = ?').get(conflictId);
  if (!conflict) {
    return res.status(404).json({ error: '冲突记录不存在' });
  }

  const updateConflict = db.prepare(`
    UPDATE version_conflicts 
    SET resolved = 1, resolved_by = ?, resolved_at = datetime('now','localtime')
    WHERE id = ?
  `);

  const updateItem = db.prepare(`
    UPDATE beat_items 
    SET status = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    updateConflict.run(resolved_by || '系统', conflictId);
    const newStatus = action === 'keep_new' ? '已判定（版本已确认）' : '已判定（保留旧版）';
    updateItem.run(newStatus, conflict.beat_item_id);
  });

  transaction();

  res.json({ success: true, message: '版本冲突已处理' });
});

app.get('/api/bad-data', (req, res) => {
  const badData = db.prepare(`
    SELECT bd.*, bi.student_name, bi.piece_name, bi.item_no
    FROM bad_data_records bd
    JOIN beat_items bi ON bd.beat_item_id = bi.id
    ORDER BY bd.id DESC
  `).all();
  res.json(badData);
});

app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM beat_items').get().count;
  const judged = db.prepare("SELECT COUNT(*) as count FROM beat_items WHERE judge_result IS NOT NULL").get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM beat_items WHERE status LIKE '待%'").get().count;
  const changed = db.prepare("SELECT COUNT(*) as count FROM beat_items WHERE status LIKE '%改判%'").get().count;
  const conflicts = db.prepare('SELECT COUNT(*) as count FROM version_conflicts WHERE resolved = 0').get().count;
  const badData = db.prepare('SELECT COUNT(*) as count FROM bad_data_records').get().count;

  res.json({
    total,
    judged,
    pending,
    changed,
    conflicts,
    badData
  });
});

app.get('/api/attachments/:id', (req, res) => {
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!attachment) {
    return res.status(404).json({ error: '附件不存在' });
  }
  res.json(attachment);
});

app.get('/api/beat-items/:id/attachments', (req, res) => {
  const attachments = db.prepare('SELECT * FROM attachments WHERE beat_item_id = ? ORDER BY id').all(req.params.id);
  res.json(attachments);
});

app.post('/api/beat-items/:id/attachments', (req, res) => {
  const { file_type, file_name, file_path, description, uploaded_by } = req.body;
  const beatItemId = req.params.id;

  const result = db.prepare(`
    INSERT INTO attachments (beat_item_id, file_type, file_name, file_path, description, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(beatItemId, file_type, file_name, file_path || '', description || '', uploaded_by || '系统');

  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/attachments/:id', (req, res) => {
  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`鼓组节拍清单归档系统已启动：http://localhost:${PORT}`);
  console.log(`API 服务运行在端口 ${PORT}`);
});
