import { Router, Response } from 'express';
import { CompensationService } from '../services/compensationService';
import { StatusHistoryService } from '../services/statusHistoryService';
import { authenticate, AuthRequest, getVisibleFields, filterFields, canPerformOperation } from '../middleware/auth';
import { UserRole, CompensationStatus, DataSource, RetryCategory, OperationType } from '../types/enums';

const router = Router();
const compensationService = new CompensationService();
const historyService = new StatusHistoryService();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, dataSource, isBadData, retryCategory, page = '1', pageSize = '20' } = req.query;

    const filters: any = {};
    if (status) filters.status = status as CompensationStatus;
    if (dataSource) filters.dataSource = dataSource as DataSource;
    if (isBadData !== undefined) filters.isBadData = isBadData === 'true';
    if (retryCategory) filters.retryCategory = retryCategory as RetryCategory;

    const { records, total } = await compensationService.getRecords(
      filters,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    const visibleFields = getVisibleFields(req.user!.role);
    const filteredRecords = records.map(r => filterFields(r, visibleFields));

    res.json({
      records: filteredRecords,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ message: '获取记录失败', error: (error as Error).message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const record = await compensationService.getRecordById(req.params.id);
    const visibleFields = getVisibleFields(req.user!.role);
    const filteredRecord = filterFields(record, visibleFields);

    res.json(filteredRecord);
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ message: '获取记录失败', error: (error as Error).message });
  }
});

router.get('/:id/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === UserRole.READ_ONLY) {
      return res.status(403).json({ message: '权限不足' });
    }

    const histories = await historyService.getHistoriesByRecordId(req.params.id);
    res.json(histories);
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ message: '获取历史记录失败', error: (error as Error).message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.SUBMIT)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const record = await compensationService.submitRecord(
      req.body,
      req.user!.userId,
      req.user!.username
    );

    const visibleFields = getVisibleFields(req.user!.role);
    const filteredRecord = filterFields(record, visibleFields);

    res.status(201).json(filteredRecord);
  } catch (error) {
    console.error('提交记录失败:', error);
    res.status(500).json({ message: '提交记录失败', error: (error as Error).message });
  }
});

router.post('/:id/queue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.QUEUE)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const record = await compensationService.queueRecord(
      req.params.id,
      req.user!.userId,
      req.user!.username
    );

    res.json(record);
  } catch (error) {
    console.error('排队失败:', error);
    res.status(500).json({ message: '排队失败', error: (error as Error).message });
  }
});

router.post('/:id/retry', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.RETRY)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { retryCategory, errorMessage } = req.body;

    const record = await compensationService.retryRecord(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      retryCategory as RetryCategory,
      errorMessage
    );

    res.json(record);
  } catch (error) {
    console.error('重试失败:', error);
    res.status(500).json({ message: '重试失败', error: (error as Error).message });
  }
});

router.post('/:id/takeover', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.TAKEOVER)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { reason } = req.body;

    const record = await compensationService.manualTakeover(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      reason || '人工接管'
    );

    res.json(record);
  } catch (error) {
    console.error('人工接管失败:', error);
    res.status(500).json({ message: '人工接管失败', error: (error as Error).message });
  }
});

router.post('/:id/compensate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.COMPENSATE)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { externalReceiptId } = req.body;

    const record = await compensationService.processCompensation(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      externalReceiptId
    );

    res.json(record);
  } catch (error) {
    console.error('补偿入账失败:', error);
    res.status(500).json({ message: '补偿入账失败', error: (error as Error).message });
  }
});

router.post('/:id/review', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.REVIEW)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const record = await compensationService.startReview(
      req.params.id,
      req.user!.userId,
      req.user!.username
    );

    res.json(record);
  } catch (error) {
    console.error('开始复核失败:', error);
    res.status(500).json({ message: '开始复核失败', error: (error as Error).message });
  }
});

router.post('/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.APPROVE)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { remark } = req.body;

    const record = await compensationService.approveRecord(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      remark
    );

    res.json(record);
  } catch (error) {
    console.error('审批通过失败:', error);
    res.status(500).json({ message: '审批通过失败', error: (error as Error).message });
  }
});

router.post('/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.REJECT)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { reason } = req.body;

    const record = await compensationService.rejectRecord(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      reason || '驳回申请'
    );

    res.json(record);
  } catch (error) {
    console.error('驳回失败:', error);
    res.status(500).json({ message: '驳回失败', error: (error as Error).message });
  }
});

router.post('/:id/close', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.CLOSE)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { reason } = req.body;

    const record = await compensationService.closeRecord(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      reason || '正常关闭'
    );

    res.json(record);
  } catch (error) {
    console.error('关闭失败:', error);
    res.status(500).json({ message: '关闭失败', error: (error as Error).message });
  }
});

router.post('/:id/recover', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!canPerformOperation(req.user!, OperationType.RECOVER)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { reason, updatedData } = req.body;

    const record = await compensationService.recoverDeadLetter(
      req.params.id,
      req.user!.userId,
      req.user!.username,
      reason || '恢复死信',
      updatedData
    );

    res.json(record);
  } catch (error) {
    console.error('恢复死信失败:', error);
    res.status(500).json({ message: '恢复死信失败', error: (error as Error).message });
  }
});

router.get('/failed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === UserRole.READ_ONLY || req.user!.role === UserRole.DATA_ENTRY) {
      return res.status(403).json({ message: '权限不足' });
    }

    const { isResolved, page = '1', pageSize = '20' } = req.query;

    const isResolvedBool = isResolved === undefined ? undefined : isResolved === 'true';

    const { records, total } = await compensationService.getFailedRecords(
      isResolvedBool,
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
    console.error('获取失败记录失败:', error);
    res.status(500).json({ message: '获取失败记录失败', error: (error as Error).message });
  }
});

export default router;
