import { Router, Request, Response } from 'express';
import {
  submitToQueue,
  getQueueItem,
  getAllQueueItems,
  getQueueItemsByStatus,
  getQueueItemsByDirtyType,
  retryQueueItem,
  assignToManual,
  compensateAndClose,
  closeQueueItem,
  processPendingItems,
  getDeadLetterItems,
  getManualInterventionItems,
  getQueueStatistics,
  fixAndCompensate,
  checkAndUpdateCalibrationStatus,
  disableDeviceRecords,
} from '../services/queueService';
import { getDiffLogsByQueueId } from '../services/diffService';
import { getRecordByIdAndType } from '../services/recordService';

const router = Router();

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { recordType, data, externalReceiptId } = req.body;
    const operator = req.headers['x-operator'] || 'system';

    const queueItem = await submitToQueue(
      recordType,
      data,
      externalReceiptId,
      String(operator)
    );

    res.status(201).json({
      success: true,
      data: queueItem,
      message: queueItem.status === 'pending' 
        ? '已提交，待处理' 
        : '已提交，需要人工干预',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, dirtyType } = req.query;
    let items;

    if (status) {
      items = await getQueueItemsByStatus(status as any);
    } else if (dirtyType) {
      items = await getQueueItemsByDirtyType(dirtyType as any);
    } else {
      items = await getAllQueueItems();
    }

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await getQueueStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/dead-letter', async (req: Request, res: Response) => {
  try {
    const items = await getDeadLetterItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/manual-intervention', async (req: Request, res: Response) => {
  try {
    const items = await getManualInterventionItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await getQueueItem(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: '队列项不存在' });
    }

    const record = item.recordId && item.recordId !== 'pending' 
      ? await getRecordByIdAndType(item.recordType, item.recordId) 
      : null;
    const diffLogs = await getDiffLogsByQueueId(item.id);

    res.json({
      success: true,
      data: {
        queueItem: item,
        record,
        diffLogs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] || 'system';
    const item = await retryQueueItem(req.params.id, String(operator));
    if (!item) {
      return res.status(404).json({ success: false, error: '队列项不存在' });
    }
    res.json({ 
      success: true, 
      data: item,
      message: item.status === 'dead_letter' ? '已达到最大重试次数，进入死信' : '重试成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { assignee, remarks } = req.body;
    if (!assignee) {
      return res.status(400).json({ success: false, error: '处理人不能为空' });
    }

    await assignToManual(req.params.id, assignee, remarks);
    const item = await getQueueItem(req.params.id);
    
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/:id/fix', async (req: Request, res: Response) => {
  try {
    const { recordData, operator, remarks } = req.body;
    const queueId = req.params.id;
    const operatorName = operator || req.headers['x-operator'] || 'system';

    const result = await fixAndCompensate(queueId, recordData, String(operatorName));

    if (!result.queueItem) {
      return res.status(404).json({ success: false, error: '队列项不存在' });
    }

    res.json({
      success: true,
      data: {
        queueItem: result.queueItem,
        record: result.record,
      },
      message: '记录已修正并补偿入账',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/:id/compensate', async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] || 'system';
    const result = await compensateAndClose(req.params.id, String(operator));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || '补偿失败',
      });
    }
    
    const item = await getQueueItem(req.params.id);
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] || 'system';
    await closeQueueItem(req.params.id, String(operator));
    const item = await getQueueItem(req.params.id);
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/process', async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] || 'system';
    const result = await processPendingItems(String(operator));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/check-calibration', async (req: Request, res: Response) => {
  try {
    const result = await checkAndUpdateCalibrationStatus();
    res.json({ 
      success: true, 
      data: result,
      message: `已检查并更新 ${result.updated} 条过期证书`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/disable-device/:deviceId', async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] || 'system';
    const result = await disableDeviceRecords(req.params.deviceId, String(operator));
    res.json({ 
      success: true, 
      data: result,
      message: `设备 ${req.params.deviceId} 已停用，已更新 ${result.calibrations} 条证书状态`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
