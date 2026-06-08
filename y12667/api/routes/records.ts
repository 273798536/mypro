import express, { type Request, type Response } from 'express';
import {
  getAllRecords,
  getRecordById,
  getStats,
  updateRecord,
  addSection,
  getHistoryByRecordId,
  getHistoryVersion,
  rollbackToVersion,
  getExportData,
} from '../data/repository.js';
import type { UpdateRecordPayload, SectionFrame } from '../../shared/types';

const router = express.Router();

router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const { riskLevel, anomalyType, search } = req.query as { riskLevel?: string; anomalyType?: string; search?: string };
    const records = getAllRecords({ riskLevel, anomalyType, search });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const record = getRecordById(req.params.id);
    if (!record) {
      res.status(404).json({ success: false, error: '记录不存在' });
      return;
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const payload = req.body as UpdateRecordPayload;
    const result = updateRecord(req.params.id, payload);
    if (!result) {
      res.status(404).json({ success: false, error: '无变更或记录不存在' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post('/:id/sections', (req: Request, res: Response) => {
  try {
    const section = req.body as SectionFrame;
    const updated = addSection(req.params.id, section);
    if (!updated) {
      res.status(404).json({ success: false, error: '记录不存在' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get('/:id/history', (req: Request, res: Response) => {
  try {
    const history = getHistoryByRecordId(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get('/:id/history/:versionId', (req: Request, res: Response) => {
  try {
    const version = getHistoryVersion(req.params.id, req.params.versionId);
    if (!version) {
      res.status(404).json({ success: false, error: '版本不存在' });
      return;
    }
    res.json({ success: true, data: version });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post('/:id/rollback/:versionId', (req: Request, res: Response) => {
  try {
    const rolled = rollbackToVersion(req.params.id, req.params.versionId);
    if (!rolled) {
      res.status(404).json({ success: false, error: '记录或版本不存在' });
      return;
    }
    res.json({ success: true, data: rolled });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.get('/:id/export', (req: Request, res: Response) => {
  try {
    const data = getExportData(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: '记录不存在' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
