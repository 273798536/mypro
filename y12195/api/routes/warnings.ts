import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { calculateWarningScores, getCurrentWarnings, getDashboardStats } from '../services/warning.service.js';

const router = Router();

router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = getDashboardStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取仪表盘数据失败'
    });
  }
});

router.get('/current', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { level, teacherId, courseType, limit, offset } = req.query;
    
    const result = getCurrentWarnings({
      level: level as any,
      teacherId: teacherId as string,
      courseType: courseType as string,
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
      error: error instanceof Error ? error.message : '获取预警列表失败'
    });
  }
});

router.post('/recalculate', authMiddleware, requireRole('admin', 'teacher'), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, reason } = req.body;
    
    const version = await calculateWarningScores(
      'manual',
      reason || `手动重算 - ${req.user!.name}`,
      studentId
    );
    
    res.json({
      success: true,
      data: version,
      message: studentId ? `已重新计算学员预警评分` : '已重新计算所有学员预警评分'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '重算预警失败'
    });
  }
});

router.get('/student/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.query;
    const { getStudentWarningHistory } = await import('../services/warning.service.js');
    
    const result = getStudentWarningHistory(req.params.id);
    
    if (versionId) {
      const filtered = result.filter(s => s.versionId === versionId);
      res.json({
        success: true,
        data: filtered
      });
    } else {
      res.json({
        success: true,
        data: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取学员预警历史失败'
    });
  }
});

export default router;
