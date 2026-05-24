import { Router, Request, Response } from 'express';
import { getRoleBasedView } from '../services/roleViewService';
import { RoleType } from '../database/schema';

const router = Router();

router.get('/:role', async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { storeId, startTime, endTime } = req.query;

    const validRoles = Object.values(RoleType);
    if (!validRoles.includes(role as RoleType)) {
      return res.status(400).json({ error: '无效的角色类型' });
    }

    const view = await getRoleBasedView(role as RoleType, {
      storeId: storeId as string,
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined
    });

    res.json(view);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
