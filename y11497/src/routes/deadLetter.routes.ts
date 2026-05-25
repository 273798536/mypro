import { Router, Request, Response } from 'express';
import dataStore from '../database/store';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole, FailureReason, ReimbursementStatus } from '../types';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate);

router.get('/', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { resolved, failureReason } = req.query;
    
    const filters: any = {};
    if (resolved !== undefined) filters.resolved = resolved === 'true';
    if (failureReason) filters.failureReason = failureReason as FailureReason;

    const deadLetters = dataStore.getDeadLetters(filters);

    res.json({
      success: true,
      data: deadLetters
    });
  } catch (err) {
    logger.error('获取死信队列失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/:id', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const deadLetters = dataStore.getDeadLetters();
    const item = deadLetters.find(d => d.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '死信记录不存在'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    logger.error('获取死信详情失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/:id/validate', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const deadLetters = dataStore.getDeadLetters();
    const item = deadLetters.find(d => d.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '死信记录不存在'
      });
    }

    const validation = dataStore.validateDeadLetterResolvable(item.reimbursementId);

    res.json({
      success: true,
      data: validation
    });
  } catch (err: any) {
    logger.error('验证死信可解性失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/resolve', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { resolution, confirmDataCorrected } = req.body;
    
    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: '必须提供解决方案说明'
      });
    }

    if (!confirmDataCorrected) {
      return res.status(400).json({
        success: false,
        error: '必须确认已修正失败数据（材料已验证、重复项已处理、金额已核对）',
        validationHint: '可调用 GET /:id/validate 检查数据是否已修正'
      });
    }

    const deadLetters = dataStore.getDeadLetters();
    const item = deadLetters.find(d => d.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '死信记录不存在'
      });
    }

    const validation = dataStore.validateDeadLetterResolvable(item.reimbursementId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: '数据未完成修正，无法解决死信',
        issues: validation.issues
      });
    }

    const resolved = dataStore.resolveDeadLetter(
      req.params.id,
      req.user!.id,
      resolution,
      true
    );

    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: '死信记录不存在'
      });
    }

    logger.info(`死信已解决: ${req.params.id} by ${req.user!.name}`);

    res.json({
      success: true,
      data: resolved,
      message: '死信已解决，相关报销单已重新进入队列并计入汇总'
    });
  } catch (err: any) {
    logger.error('解决死信失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/close', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const deadLetters = dataStore.getDeadLetters();
    const item = deadLetters.find(d => d.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '死信记录不存在'
      });
    }

    const closed = dataStore.closeDeadLetter(
      req.params.id,
      req.user!.id,
      reason || '无需处理'
    );

    if (!closed) {
      return res.status(404).json({
        success: false,
        error: '死信记录不存在'
      });
    }

    logger.info(`死信已关闭: ${req.params.id} by ${req.user!.name}`);

    res.json({
      success: true,
      data: closed,
      message: '死信已关闭，相关报销单已关闭且不计入汇总'
    });
  } catch (err: any) {
    logger.error('关闭死信失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.get('/statistics/summary', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const allDeadLetters = dataStore.getDeadLetters();
    const unresolved = allDeadLetters.filter(d => !d.resolved);
    const byReason: Record<string, number> = {};

    for (const item of unresolved) {
      byReason[item.failureReason] = (byReason[item.failureReason] || 0) + 1;
    }

    const avgRetryCount = unresolved.length > 0
      ? unresolved.reduce((sum, item) => sum + item.retryHistory.length, 0) / unresolved.length
      : 0;

    res.json({
      success: true,
      data: {
        total: allDeadLetters.length,
        unresolved: unresolved.length,
        resolved: allDeadLetters.length - unresolved.length,
        byFailureReason: byReason,
        averageRetriesBeforeDeadLetter: avgRetryCount.toFixed(2)
      }
    });
  } catch (err) {
    logger.error('获取死信统计失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router;
