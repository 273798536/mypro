import express, { type Request, type Response } from 'express';
import * as historyService from '../services/historyService.js';
import type { HistoryRecord } from '../../shared/types.js';

const router = express.Router();

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { checksum } = req.body;

    if (!checksum) {
      return res.status(400).json({
        success: false,
        error: '缺少校验和参数',
      });
    }

    const exists = await historyService.checkChecksumExists(checksum);

    return res.json({
      success: true,
      exists,
    });
  } catch (error) {
    console.error('Verify checksum error:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const records = await historyService.getAllHistoryRecords();

    return res.json(records);
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({
      success: false,
      error: '获取历史记录失败',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await historyService.getHistoryRecordById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: '历史记录不存在',
      });
    }

    return res.json(record);
  } catch (error) {
    console.error('Get history record error:', error);
    return res.status(500).json({
      success: false,
      error: '获取历史记录失败',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const record = req.body as HistoryRecord;

    if (!record.id || !record.timestamp || !record.checksum) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段',
      });
    }

    const result = await historyService.saveHistoryRecord(record);

    if (!result.success) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('Save history error:', error);
    return res.status(500).json({
      success: false,
      error: '保存历史记录失败',
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await historyService.deleteHistoryRecord(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '历史记录不存在',
      });
    }

    return res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete history error:', error);
    return res.status(500).json({
      success: false,
      error: '删除历史记录失败',
    });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { records } = req.body as { records: HistoryRecord[] };

    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: '记录格式错误',
      });
    }

    const newRecords = await historyService.syncRecords(records);

    return res.json({
      success: true,
      newRecords: newRecords.length,
      total: records.length,
    });
  } catch (error) {
    console.error('Sync history error:', error);
    return res.status(500).json({
      success: false,
      error: '同步历史记录失败',
    });
  }
});

export default router;
