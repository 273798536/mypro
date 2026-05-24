const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/connection');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    db.get('SELECT * FROM users WHERE id = ? AND status = "active"', [decoded.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: '无效的认证令牌' });
      }
      req.user = {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        branch: user.branch
      };
      next();
    });
  } catch (err) {
    return res.status(401).json({ error: '认证令牌已过期或无效' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足，无法执行此操作' });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
