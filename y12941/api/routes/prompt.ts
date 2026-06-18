import express, { type Request, type Response } from 'express';
import { PromptService } from '../services/PromptService.ts';
import type { PromptVersion } from '../../shared/types.ts';

const router = express.Router();
const promptService = new PromptService();

router.get('/', (req: Request, res: Response) => {
  try {
    const versions = promptService.getAll();
    res.json({ success: true, data: versions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/active', (req: Request, res: Response) => {
  try {
    const active = promptService.getActive();
    res.json({ success: true, data: active });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data: Omit<PromptVersion, 'id' | 'createdAt'> = req.body;
    const version = promptService.create(data);
    res.json({ success: true, data: version });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/activate', (req: Request, res: Response) => {
  try {
    promptService.activate(req.params.id);
    res.json({ success: true, message: 'Prompt version activated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
