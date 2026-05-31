import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { getGroupStats } from '../services/group-stats.service.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { dimension, groupBy } = req.query;
    const dim = (dimension || groupBy) as string;
    
    if (!dim) {
      return res.status(400).json({
        success: false,
        error: '请指定分组维度 (teacher, courseType, age, renewalPeriod)'
      });
    }
    
    const validDimensions = ['teacher', 'courseType', 'age', 'renewalPeriod'];
    if (!validDimensions.includes(dim)) {
      return res.status(400).json({
        success: false,
        error: '无效的分组维度'
      });
    }
    
    const result = getGroupStats(dim as any);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取分组统计失败'
    });
  }
});

export default router;
