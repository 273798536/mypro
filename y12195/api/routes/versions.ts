import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { getVersions, getVersionDetail, compareVersions } from '../services/version.service.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { trigger, limit, offset } = req.query;
    
    const result = getVersions({
      trigger: trigger as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取版本列表失败'
    });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getVersionDetail(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '版本不存在'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取版本详情失败'
    });
  }
});

router.get('/compare/:v1/:v2', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { v1, v2 } = req.params;
    const result = compareVersions(v1, v2);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '版本不存在'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '版本对比失败'
    });
  }
});

export default router;
