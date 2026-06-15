import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { checkAll, fixOne } from '../services/consistencyService';

const router = Router();

const fixSchema = z.object({
  itemId: z.string().min(1, 'itemId 必填'),
  applyField: z.string().min(1, 'applyField 必填')
});

router.post('/check', async (_req: Request, res: Response): Promise<void> => {
  try {
    const reports = await checkAll();
    res.json({ code: 0, data: reports, msg: 'ok' });
  } catch (e: any) {
    res.status(500).json({ code: 500, data: null, msg: e?.message ?? '一致性检查失败' });
  }
});

router.post('/fix', async (req: Request, res: Response): Promise<void> => {
  const parsed = fixSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }
  try {
    const item = await fixOne(parsed.data as any);
    res.json({ code: 0, data: item, msg: '修复成功' });
  } catch (e: any) {
    res.status(400).json({ code: 400, data: null, msg: e?.message ?? '修复失败' });
  }
});

export default router;
