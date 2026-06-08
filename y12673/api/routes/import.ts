import express, { type Request, type Response } from 'express';
import { createRecordFromImport, checkDuplicateBatch } from '../db/db.js';
import { ImportDataRequest, Screenshot } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body as ImportDataRequest;
    if (!data.batchId || !data.title || !data.conclusionContent || !data.author) {
      return res.status(400).json({ success: false, error: '缺少必填字段 (batchId, title, conclusionContent, author)' });
    }

    const screenshots: Screenshot[] = (data.screenshots || []).map(s => ({
      ...s,
      id: s.id || `ss-${uuidv4()}`,
    }));

    const result = await createRecordFromImport({ ...data, screenshots });
    res.json({
      success: true,
      data: result.record,
      isNew: result.isNew,
      message: result.message,
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: '导入数据失败' });
  }
});

router.post('/check', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ success: false, error: '缺少 batchId' });
    }
    const result = await checkDuplicateBatch(batchId);
    res.json({
      success: true,
      exists: result.exists,
      record: result.record,
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: '检查重复批次失败' });
  }
});

export default router;
