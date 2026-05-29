import { Router, type Request, type Response } from 'express';
import { runCalculation, getCalculationDetail, listCalcResults } from '../services/calculationService.js';

const router = Router();

router.post('/run', (req: Request, res: Response) => {
  try {
    const { vesselName, port } = req.body || {};
    const results = runCalculation({ vesselName, port });
    res.json({ success: true, calculations: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : '试算失败';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/list', (req: Request, res: Response) => {
  try {
    const { vesselName, port, dateFrom, dateTo, flag } = req.query as Record<string, string>;
    const results = listCalcResults({ vesselName, port, dateFrom, dateTo, flag });
    res.json({ success: true, calculations: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取列表失败';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const result = getCalculationDetail(req.params.id);
    if (!result) {
      res.status(404).json({ success: false, error: '试算结果不存在' });
      return;
    }
    res.json({ success: true, calculation: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取详情失败';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
