import express from 'express';
import auditService from '../services/AuditService';
import { OperationType } from '../../shared/types';

const router = express.Router();

router.get('/logs', (req, res) => {
  try {
    const {
      page,
      pageSize,
      operationType,
      operatorId,
      batchId,
      startDate,
      endDate
    } = req.query;

    const options: any = {};
    if (page) options.page = parseInt(page as string);
    if (pageSize) options.pageSize = parseInt(pageSize as string);
    if (operationType) options.operationType = operationType as OperationType;
    if (operatorId) options.operatorId = operatorId as string;
    if (batchId) options.batchId = batchId as string;
    if (startDate) options.startDate = parseInt(startDate as string);
    if (endDate) options.endDate = parseInt(endDate as string);

    const result = auditService.getLogs(options);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/snapshots/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const snapshots = auditService.getSnapshots(batchId);
    res.json({ success: true, data: snapshots });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/rollback/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const { reason } = req.body;
    
    const DEFAULT_USER = { id: 'u002', name: '李华' };
    const result = auditService.rollback(
      batchId,
      DEFAULT_USER.id,
      DEFAULT_USER.name,
      reason || '回滚到历史版本'
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
