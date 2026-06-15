import { Router, type Request, type Response } from 'express';
import * as itemRepo from '../repositories/itemRepo';
import { getSnapshotDb } from '../lib/snapshot';

const router = Router();

router.get('/items', async (req: Request, res: Response): Promise<void> => {
  const date = req.query.date as string | undefined;
  const items = itemRepo.listItems();
  let snapshotData: Record<string, any> = {};
  try {
    const snapDb = await getSnapshotDb();
    snapshotData = snapDb.data.items;
  } catch {
    /* 忽略 snapshot 失败 */
  }

  const enriched = items.map((item) => {
    const snap = snapshotData[item.id] ?? null;
    return {
      ...item,
      dateSnapshot: snap,
      queryDate: date ?? null
    };
  });

  res.json({ code: 0, data: enriched, msg: 'ok' });
});

export default router;
