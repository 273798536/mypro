import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import { createBatchImportTask, retryTask, getAllFailedTasks, processPendingTasks } from '../services/taskService';
import { getAsyncTaskById } from '../dao/asyncTaskDao';
import { ImportStrategy } from '../types';

const router = Router();

router.post('/batch-import', requirePermission('task:manage'), async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.auth!;
    const { ledgersData, strategy } = req.body;

    if (!Object.values(ImportStrategy).includes(strategy)) {
      res.status(400).json({
        success: false,
        error: '无效的导入策略，可选值: ignore, overwrite, append'
      });
      return;
    }

    const taskId = await createBatchImportTask(ledgersData, strategy, userId, userName);

    res.json({
      success: true,
      data: { taskId },
      message: '批量导入任务已创建，将在后台执行'
    });
  } catch (e: any) {
    res.status(400).json({
      success: false,
      error: e.message
    });
  }
});

router.get('/failed', requirePermission('task:manage'), async (req: Request, res: Response) => {
  const tasks = await getAllFailedTasks();
  res.json({
    success: true,
    data: tasks
  });
});

router.get('/:id', requirePermission('task:manage'), async (req: Request, res: Response) => {
  const task = await getAsyncTaskById(req.params.id);

  if (!task) {
    res.status(404).json({
      success: false,
      error: '任务不存在'
    });
    return;
  }

  res.json({
    success: true,
    data: task
  });
});

router.post('/:id/retry', requirePermission('task:manage'), async (req: Request, res: Response) => {
  const success = await retryTask(req.params.id);

  if (!success) {
    res.status(404).json({
      success: false,
      error: '任务不存在或无法重试'
    });
    return;
  }

  res.json({
    success: true,
    message: '任务已重置为待处理状态，将在下一轮执行'
  });
});

router.post('/process-now', requirePermission('task:manage'), async (req: Request, res: Response) => {
  await processPendingTasks();
  res.json({
    success: true,
    message: '已触发即时任务处理'
  });
});

export default router;
