import { Router, Request, Response } from 'express';
import * as historyService from '../services/historyService';
import type { ApiResponse } from '@shared/types';

const router = Router();

router.get('/weekly-review', async (_req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const data = await historyService.getWeeklyReviewData();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate are required' 
      });
    }
    
    const history = await historyService.getHistoryByDateRange(
      startDate as string,
      endDate as string
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
