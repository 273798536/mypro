import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserRole } from '../types/enums';

const router = Router();
const authService = new AuthService();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const result = await authService.login(username, password);

    if (!result) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    res.json(result);
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '登录失败', error: (error as Error).message });
  }
});

export default router;
