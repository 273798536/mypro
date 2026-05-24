import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { Role } from '../types';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const result = await AuthService.login(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role, name, department, phone } = req.body;
    const user = await AuthService.register(
      username, password, role as Role, name, department, phone
    );
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
