import { Router, Request, Response } from 'express';
import * as corridorService from '../services/corridorService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const corridors = await corridorService.getAllCorridors();
    res.json({ success: true, data: corridors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const corridor = await corridorService.getCorridorById(req.params.id);
    if (!corridor) {
      return res.status(404).json({ success: false, error: 'Corridor not found' });
    }
    res.json({ success: true, data: corridor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const corridor = await corridorService.createCorridor(req.body);
    res.status(201).json({ success: true, data: corridor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const corridor = await corridorService.updateCorridor(req.params.id, req.body);
    if (!corridor) {
      return res.status(404).json({ success: false, error: 'Corridor not found' });
    }
    res.json({ success: true, data: corridor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await corridorService.deleteCorridor(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Corridor not found' });
    }
    res.json({ success: true, message: 'Corridor deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
