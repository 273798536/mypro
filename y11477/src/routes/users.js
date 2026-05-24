const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { authenticate, ROLES } = require('../middleware/auth');

router.use(authenticate);

router.get('/me', (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role
    },
    permissions: req.permissions
  });
});

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, created_at FROM users').all();
  res.json(users);
});

module.exports = router;
