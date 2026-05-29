import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { getDatabase } from '../database/init.js';
import { generateId } from '../utils/index.js';
import type { UserRow } from '../types/index.js';

const router = Router();

const activeSessions = new Map<string, { userId: string; username: string; role: string; displayName: string; storeId: string | null; createdAt: number }>();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  const db = getDatabase();
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as UserRow | undefined;
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.password_hash !== hashPassword(password)) {
      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'login_failed', 'auth', username, JSON.stringify({ reason: '密码错误' }));
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
      storeId: user.store_id,
      createdAt: Date.now()
    };
    activeSessions.set(token, session);

    for (const [key, value] of activeSessions.entries()) {
      if (value.userId === user.id && key !== token) {
        activeSessions.delete(key);
      }
    }

    db.prepare(`
      INSERT INTO audit_logs (id, action, module, operator, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId('audit'), 'login', 'auth', user.display_name, JSON.stringify({ userId: user.id, role: user.role }));

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name,
        storeId: user.store_id
      }
    });
  } finally {
    db.close();
  }
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    activeSessions.delete(token);

    const db = getDatabase();
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'logout', 'auth', session.displayName, JSON.stringify({ userId: session.userId }));
    } finally {
      db.close();
    }
  }

  res.json({ message: '已登出' });
});

router.get('/session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: '未登录或会话已过期' });
  }

  const session = activeSessions.get(token)!;
  res.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
      displayName: session.displayName,
      storeId: session.storeId
    }
  });
});

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !activeSessions.has(token)) {
    res.status(401).json({ error: '请先登录' });
    return;
  }

  const session = activeSessions.get(token)!;
  (req as any).user = session;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = (req as any).user;
    if (!session) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    if (!roles.includes(session.role)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }
    next();
  };
}

export default router;
