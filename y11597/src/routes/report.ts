import { Router, Response } from 'express';
import { ReportService } from '../services/reportService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole, CompensationStatus } from '../types/enums';

const router = Router();
const reportService = new ReportService();

router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === UserRole.READ_ONLY || req.user!.role === UserRole.DATA_ENTRY) {
      return res.status(403).json({ message: '权限不足' });
    }

    const report = await reportService.generateReport();
    res.json(report);
  } catch (error) {
    console.error('生成报表失败:', error);
    res.status(500).json({ message: '生成报表失败', error: (error as Error).message });
  }
});

router.get('/trace/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === UserRole.READ_ONLY || req.user!.role === UserRole.DATA_ENTRY) {
      return res.status(403).json({ message: '权限不足' });
    }

    const traceData = await reportService.getTraceableRecord(req.params.id);
    res.json(traceData);
  } catch (error) {
    console.error('获取追溯数据失败:', error);
    res.status(500).json({ message: '获取追溯数据失败', error: (error as Error).message });
  }
});

router.get('/status/:status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === UserRole.READ_ONLY) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { page = '1', pageSize = '20' } = req.query;
    const status = req.params.status as CompensationStatus;

    const { records, total } = await reportService.getRecordsByStatus(
      status,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json({
      records,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取状态记录失败:', error);
    res.status(500).json({ message: '获取状态记录失败', error: (error as Error).message });
  }
});

export default router;
