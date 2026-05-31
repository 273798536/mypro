import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { getStudents, getStudentDetail, getPendingMakeup, processMakeup, createFollowUp } from '../services/student.service.js';
import { getStudentWarningHistory } from '../services/warning.service.js';
import type { MakeupRequest } from '../../shared/types.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { teacherId, courseType, level, search, limit, offset } = req.query;
    
    const result = getStudents({
      teacherId: teacherId as string,
      courseType: courseType as string,
      level: level as string,
      search: search as string,
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
      error: error instanceof Error ? error.message : '获取学员列表失败'
    });
  }
});

router.get('/makeup/pending', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getPendingMakeup();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取待补录列表失败'
    });
  }
});

router.post('/makeup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const request = req.body as MakeupRequest;
    const result = await processMakeup(request);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '缺课补录失败'
    });
  }
});

router.post('/followups', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      followUpBy: req.user!.id
    };
    
    const result = createFollowUp(data);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建跟进记录失败'
    });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getStudentDetail(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '学员不存在'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取学员详情失败'
    });
  }
});

router.get('/:id/attendance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getStudentDetail(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '学员不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取上课记录失败'
    });
  }
});

router.get('/:id/warnings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getStudentWarningHistory(req.params.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取预警历史失败'
    });
  }
});

router.get('/:id/followups', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = getStudentDetail(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '学员不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.followUps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取跟进记录失败'
    });
  }
});

export default router;
