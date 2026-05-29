import { Router, type Request, type Response } from 'express';
import { upload, processUpload, validateData, patchRecord, getRecords } from '../services/importService.js';
import type { DataType } from '../../shared/types.js';

const router = Router();

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '未上传文件' });
      return;
    }

    const type = req.body.type as DataType;
    if (!['berth', 'handling', 'contract', 'weather'].includes(type)) {
      res.status(400).json({ success: false, error: '无效的数据类型，需为 berth/handling/contract/weather' });
      return;
    }

    const result = processUpload(req.file.path, type, req.file.originalname);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入失败';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/validate', (req: Request, res: Response) => {
  try {
    const type = req.query.type as DataType;
    if (!['berth', 'handling', 'contract', 'weather'].includes(type)) {
      res.status(400).json({ success: false, error: '无效的数据类型' });
      return;
    }
    const result = validateData(type);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '校验失败';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/records', (req: Request, res: Response) => {
  try {
    const type = req.query.type as DataType;
    if (!['berth', 'handling', 'contract', 'weather'].includes(type)) {
      res.status(400).json({ success: false, error: '无效的数据类型' });
      return;
    }
    const records = getRecords(type);
    res.json({ success: true, records });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取记录失败';
    res.status(500).json({ success: false, error: message });
  }
});

router.patch('/record', (req: Request, res: Response) => {
  try {
    const { type, rowId, updates } = req.body as { type: DataType; rowId: string; updates: Record<string, unknown> };
    if (!type || !rowId || !updates) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }
    const result = patchRecord(type, rowId, updates);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '修正失败';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
