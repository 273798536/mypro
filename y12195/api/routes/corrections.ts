import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { createCorrection, getCorrections, getCorrectionEffectiveness, updateRenewalResult } from '../services/correction.service.js';
import type { CreateCorrectionRequest } from '../../shared/types.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, correctedBy, renewalResult, limit, offset } = req.query;
    
    const result = getCorrections({
      studentId: studentId as string,
      correctedBy: correctedBy as string,
      renewalResult: renewalResult as string,
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
      error: error instanceof Error ? error.message : '获取修正列表失败'
    });
  }
});

router.post('/', authMiddleware, requireRole('admin', 'teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const request = req.body as CreateCorrectionRequest;
    const result = createCorrection(request, req.user!.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建修正失败'
    });
  }
});

router.get('/effectiveness', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getCorrectionEffectiveness();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取修正效果统计失败'
    });
  }
});

router.patch('/:id/renewal', authMiddleware, requireRole('admin', 'consultant'), async (req: AuthRequest, res: Response) => {
  try {
    const { result } = req.body;
    updateRenewalResult(req.params.id, result);
    
    res.json({
      success: true,
      message: '续费结果已更新'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新续费结果失败'
    });
  }
});

export default router;
