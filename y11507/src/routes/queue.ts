import { Router, Request, Response } from 'express';
import {
  createQueueItem,
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
} from '../services/queueService';
import { getDiffLogsByQueueId } from '../services/diffService';
import {
  createInspectionRecord,
  createCalibrationCertificate,
  createRepairQuote,
  updateInspectionRecord,
  updateCalibrationCertificate,
  updateRepairQuote,
  getRecordByIdAndType,
} from '../services/recordService';
import { RecordType } from '../types';

const router = Router();

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { recordType, data, externalReceiptId } = req.body;
    const operator = req.headers['x-operator'] || 'system';

    let recordId = '';
    
    switch (recordType as RecordType) {
      case 'inspection':
        const inspection = await createInspectionRecord(data, String(operator));
        recordId = inspection.id;
        break;
      case 'calibration':
        const calibration = await createCalibrationCertificate(data, String(operator));
        recordId = calibration.id;
        break;
      case 'repair':
        const repair = await createRepairQuote(data, String(operator));
        recordId = repair.id;
        break;
      default:
        return res.status(400).json({ error: '无效的记录类型' });
    }

    const queueItem = await createQueueItem(
      recordType as RecordType,
      recordId,
      data,
      externalReceiptId
    );

    res.status(201).json({
      success: true,
      data: queueItem,
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

    const record = await getRecordByIdAndType(item.recordType, item.recordId);
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
    const item = await retryQueueItem(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: '队列项不存在' });
    }
    res.json({ success: true, data: item });
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

    const queueItem = await getQueueItem(queueId);
    if (!queueItem) {
      return res.status(404).json({ success: false, error: '队列项不存在' });
    }

    let updatedRecord;
    switch (queueItem.recordType) {
      case 'inspection':
        updatedRecord = await updateInspectionRecord(
          queueItem.recordId,
          recordData,
          String(operatorName),
          queueId
        );
        break;
      case 'calibration':
        updatedRecord = await updateCalibrationCertificate(
          queueItem.recordId,
          recordData,
          String(operatorName),
          queueId
        );
        break;
      case 'repair':
        updatedRecord = await updateRepairQuote(
          queueItem.recordId,
          recordData,
          String(operatorName),
          queueId
        );
        break;
    }

    await compensateAndClose(queueId);
    const updatedQueueItem = await getQueueItem(queueId);

    res.json({
      success: true,
      data: {
        queueItem: updatedQueueItem,
        record: updatedRecord,
      },
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
    await compensateAndClose(req.params.id);
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
    await closeQueueItem(req.params.id);
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
    const result = await processPendingItems();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
