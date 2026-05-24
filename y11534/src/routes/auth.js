const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../services/auditService');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账号已被禁用' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
    
    await logAction(
      { id: user.id, username: user.username },
      'login',
      'auth',
      null,
      req.ip,
      req.get('User-Agent'),
      null,
      'success'
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        branch: user.branch
      }
    });
  });
});

router.post('/logout', authenticate, async (req, res) => {
  await logAction(
    req.user,
    'logout',
    'auth',
    null,
    req.ip,
    req.get('User-Agent'),
    null,
    'success'
  );
  
  res.json({ message: '登出成功' });
});

router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user
  });
});

router.post('/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码不能为空' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度不能少于6位' });
  }
  
  db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [newHash, req.user.id], 
      async (err) => {
        if (err) {
          return res.status(500).json({ error: '密码更新失败' });
        }
        
        await logAction(
          req.user,
          'change_password',
          'auth',
          req.user.id,
          req.ip,
          req.get('User-Agent'),
          null,
          'success'
        );
        
        res.json({ message: '密码修改成功' });
      }
    );
  });
});

module.exports = router;
