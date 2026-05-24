const express = require('express');
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const config = require('../config/config');

const router = express.Router();

router.get('/', authenticateToken, requireRole(config.roles.SUPERVISOR), async (req, res) => {
  const { limit = 100, offset = 0, user_id, action } = req.query;

  let query = `
    SELECT al.*, u.username as user_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ' AND al.user_id = ?';
    params.push(parseInt(user_id));
  }

  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const logs = await db.allSync(query, params);
  res.json(logs);
});

router.get('/users', authenticateToken, requireRole(config.roles.SUPERVISOR), async (req, res) => {
  const users = await db.allSync('SELECT id, username, role, created_at FROM users');
  res.json(users);
});

module.exports = router;
