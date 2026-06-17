import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ModelVersionService } from '../services/model-version.service';
import { ModelType } from '@prisma/client';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1, '模型名称不能为空'),
  version: z.string().min(1, '版本号不能为空'),
  type: z.nativeEnum(ModelType),
  description: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await ModelVersionService.list();
    res.json({ code: 0, message: 'success', data });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await ModelVersionService.getById(req.params.id);
    res.json({ code: 0, message: 'success', data });
  } catch (e: any) {
    res.status(404).json({ code: 404, message: '模型版本不存在' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await ModelVersionService.create(data);
    res.json({ code: 0, message: 'success', data: result });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

export default router;
