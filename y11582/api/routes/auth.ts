
import { Router, type Request, type Response } from 'express';
import { signToken, verifyToken } from '../middleware/auth.js';
import type { LoginResponse, UserRole } from '../../shared/types.js';

const router = Router();

const USERS: Array<{ id: string; username: string; password: string; role: UserRole }> = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin' },
  { id: '2', username: 'finance', password: 'finance123', role: 'finance_manager' },
  { id: '3', username: 'operator', password: 'operator123', role: 'operator' },
  { id: '4', username: 'viewer', password: 'viewer123', role: 'viewer' },
];

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const response: LoginResponse = {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };

  res.json(response);
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    id: payload.userId,
    username: payload.username,
    role: payload.role,
  });
});

export default router;
