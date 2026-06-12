import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import type { ApiResponse } from '@shared/types';

const router = Router();

router.get('/', async (_req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/current', async (_req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { name, role } = req.body;
    const user = await userService.getOrCreateUser(name, role);
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
