const express = require('express');
const jwt = require('jsonwebtoken');
const { User, ROLES } = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { logLogin } = require('../services/auditService');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await logLogin(user, ip, userAgent, false, '密码错误');
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: '账户已被禁用' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await logLogin(user, ip, userAgent, true);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        city: user.city
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role,
        city: req.user.city,
        department: req.user.department,
        phone: req.user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/roles', authenticate, (req, res) => {
  res.json({
    currentRole: req.user.role,
    availableRoles: ROLES
  });
});

router.post('/init-users', async (req, res) => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return res.json({ message: '已存在用户，跳过初始化' });
    }

    const users = [
      {
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        role: ROLES.SUPERVISOR,
        city: '北京市'
      },
      {
        username: 'reviewer',
        password: 'reviewer123',
        name: '复核员张三',
        role: ROLES.REVIEWER,
        city: '北京市'
      },
      {
        username: 'operator',
        password: 'operator123',
        name: '录入员李四',
        role: ROLES.DATA_ENTRY,
        city: '北京市'
      },
      {
        username: 'viewer',
        password: 'viewer123',
        name: '只读用户王五',
        role: ROLES.READ_ONLY,
        city: '北京市'
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
    }

    res.json({ message: '初始化用户成功', count: users.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
