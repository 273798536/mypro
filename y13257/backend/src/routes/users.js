const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, created_at FROM users').all();
  res.json(users);
});

router.get('/current', (req, res) => {
  res.json({
    id: 1,
    username: 'laohe',
    name: '老何',
    role: 'engineer',
    permissions: ['review', 'export', 'supplement']
  });
});

router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const stats = db.prepare(`
    SELECT 
      COUNT(DISTINCT CASE WHEN vh.changed_by = ? THEN vh.id END) as changes_count,
      COUNT(DISTINCT CASE WHEN rr.reviewed_by = ? THEN rr.id END) as reviews_count,
      COUNT(DISTINCT CASE WHEN p.uploaded_by = ? THEN p.id END) as photos_count,
      COUNT(DISTINCT CASE WHEN n.created_by = ? THEN n.id END) as notes_count
    FROM complaints c
    LEFT JOIN version_history vh ON c.id = vh.complaint_id
    LEFT JOIN review_records rr ON c.id = rr.complaint_id
    LEFT JOIN photos p ON c.id = p.complaint_id
    LEFT JOIN notes n ON c.id = n.complaint_id
  `).get(req.params.id, req.params.id, req.params.id, req.params.id);

  res.json({ ...user, stats });
});

module.exports = router;
