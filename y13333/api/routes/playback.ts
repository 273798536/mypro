import { Router, Request } from 'express';
import { PlaybackService } from '../services/PlaybackService.js';
import type { PlaybackStatus } from '@shared/types';

const router = Router();

interface UpdateStatusRequest extends Request {
  body: {
    status: PlaybackStatus;
    operator: string;
    remark?: string;
  };
}

router.get('/', (req, res) => {
  const status = req.query.status as PlaybackStatus | undefined;
  const result = PlaybackService.getAllPlaybackResults(status);
  res.json(result);
});

router.get('/run', (_req, res) => {
  const result = PlaybackService.runPlayback();
  res.json(result);
});

router.get('/:id', (req, res) => {
  const result = PlaybackService.getPlaybackById(req.params.id);
  res.json(result);
});

router.put('/:id/status', (req: UpdateStatusRequest, res) => {
  const { status, operator, remark } = req.body;
  const result = PlaybackService.updateStatus(req.params.id, status, operator, remark);
  res.json(result);
});

router.get('/status/:status', (req, res) => {
  const result = PlaybackService.getResultsByStatus(req.params.status as PlaybackStatus);
  res.json(result);
});

export default router;
