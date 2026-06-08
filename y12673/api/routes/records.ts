import express, { type Request, type Response } from 'express';
import {
  getAllRecords,
  getRecordById,
  updateConclusion,
  restoreVersion,
  deleteRecord,
  addPerspective,
} from '../db/db.js';
import { UpdateConclusionRequest } from '@shared/types';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const records = await getAllRecords();
    res.json({ success: true, data: records });
  } catch (_error) {
    res.status(500).json({ success: false, error: '获取记录列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ success: true, data: record });
  } catch (_error) {
    res.status(500).json({ success: false, error: '获取记录失败' });
  }
});

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const record = await getRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ success: true, data: record.history });
  } catch (_error) {
    res.status(500).json({ success: false, error: '获取历史版本失败' });
  }
});

router.put('/:id/conclusion', async (req: Request, res: Response) => {
  try {
    const { content, reason, modifiedBy } = req.body as UpdateConclusionRequest;
    if (!content || !reason || !modifiedBy) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }
    const updated = await updateConclusion(req.params.id, { content, reason, modifiedBy });
    if (!updated) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (_error) {
    res.status(500).json({ success: false, error: '更新结论失败' });
  }
});

router.post('/:id/restore/:historyId', async (req: Request, res: Response) => {
  try {
    const updated = await restoreVersion(req.params.id, req.params.historyId);
    if (!updated) {
      return res.status(404).json({ success: false, error: '记录或历史版本不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (_error) {
    res.status(500).json({ success: false, error: '恢复历史版本失败' });
  }
});

router.post('/:id/perspective', async (req: Request, res: Response) => {
  try {
    const { name, cameraPosition, cameraTarget } = req.body;
    if (!name || !cameraPosition || !cameraTarget) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }
    const updated = await addPerspective(req.params.id, { name, cameraPosition, cameraTarget });
    if (!updated) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (_error) {
    res.status(500).json({ success: false, error: '添加视角失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (_error) {
    res.status(500).json({ success: false, error: '删除记录失败' });
  }
});

export default router;
