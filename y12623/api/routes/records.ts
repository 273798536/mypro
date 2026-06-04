import { Router, Request, Response } from 'express';
import multer from 'multer';
import { recordRepository } from '../db/repository';
import { parseImportFile, processImport, createSampleRecords } from '../services/importService';
import { updateScore, getRecordDetail, addNote } from '../services/scoreService';
import type { UpdateScoreRequest } from '../services/scoreService';
import type { RecordStatus, AnomalyType } from '../../shared/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, anomalyType, batchNo, search } = req.query;
    const filters = {
      status: status as RecordStatus | undefined,
      anomalyType: anomalyType as AnomalyType | undefined,
      batchNo: batchNo as string | undefined,
      search: search as string | undefined,
    };
    const records = recordRepository.findAll(filters);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/anomalies', (req: Request, res: Response) => {
  try {
    const records = recordRepository.findAnomalies();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = recordRepository.countByStatus();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const detail = getRecordDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id/history', (req: Request, res: Response) => {
  try {
    const history = recordRepository.getHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/:id/score', (req: Request, res: Response) => {
  try {
    const { score, scoreNote, reason, scorer } = req.body;
    const request: UpdateScoreRequest = {
      recordId: req.params.id,
      score: Number(score),
      scoreNote,
      reason,
      scorer: scorer || '当前用户',
    };
    const updated = updateScore(request);
    if (!updated) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/notes', (req: Request, res: Response) => {
  try {
    const { content, author } = req.body;
    const note = addNote(req.params.id, content, author || '当前用户');
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请选择要导入的文件' });
      return;
    }
    const rows = parseImportFile(req.file.buffer);
    const result = processImport(rows, req.file.originalname);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/import/sample', (req: Request, res: Response) => {
  try {
    const result = createSampleRecords();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
