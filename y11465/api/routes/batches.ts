import { Router, Request, Response } from 'express';
import batchRepository from '../repositories/BatchRepository';
import documentRepository from '../repositories/DocumentRepository';
import auditLogRepository from '../repositories/AuditLogRepository';
import stateMachineService from '../services/StateMachineService';
import fabricTrackRepository from '../repositories/FabricTrackRepository';
import attachmentRepository from '../repositories/AttachmentRepository';
import type { CreateBatchRequest, FreezeRequest } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20', status, brand, styleCode } = req.query;
  
  const result = batchRepository.findAll({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    status: status as any,
    brand: brand as string,
    styleCode: styleCode as string
  });
  
  res.json(result);
});

router.get('/stats', (req: Request, res: Response) => {
  const stats = batchRepository.getStats();
  res.json(stats);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const batch = batchRepository.findById(id);
  
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const documents = documentRepository.findByBatchId(id);
  const auditLogs = auditLogRepository.findByEntity('batch', id);
  const fabricTracks = fabricTrackRepository.findByStyleCode(batch.styleCode);
  
  res.json({
    ...batch,
    documents,
    auditLogs,
    fabricTracks
  });
});

router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateBatchRequest;
  
  try {
    const batch = batchRepository.create(body);
    res.status(201).json(batch);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/freeze', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, operatedBy } = req.body as FreezeRequest;
  
  const batch = batchRepository.findById(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const before = { ...batch };
  
  const updated = batchRepository.update(id, {
    frozen: true,
    frozenReason: reason,
    frozenAt: new Date().toISOString(),
    status: 'FROZEN'
  }, operatedBy, reason);
  
  const after = { ...updated };
  
  res.json({
    success: true,
    snapshot: { before, after },
    auditLog: auditLogRepository.findByEntity('BATCH', id)[0]
  });
});

router.post('/:id/unfreeze', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, operatedBy } = req.body;
  
  const batch = batchRepository.findById(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const updated = batchRepository.update(id, {
    frozen: false,
    status: 'APPROVED'
  }, operatedBy, reason);
  
  res.json({ success: true, batch: updated });
});

router.post('/:id/settle', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatedBy } = req.body;
  
  try {
    const updated = stateMachineService.transitionBatch(id, 'SETTLE', operatedBy, '批次结算');
    res.json({ success: true, batch: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/submit', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatedBy } = req.body;
  
  try {
    const updated = stateMachineService.transitionBatch(id, 'SUBMIT', operatedBy, '提交批次');
    res.json({ success: true, batch: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/archive', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatedBy } = req.body;
  
  try {
    const updated = stateMachineService.transitionBatch(id, 'ARCHIVE', operatedBy, '批次归档');
    res.json({ success: true, batch: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/attachments', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const batch = batchRepository.findById(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const attachments = attachmentRepository.findByBatchId(id);
  res.json({ data: attachments, total: attachments.length });
});

router.post('/:id/attachments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fileName, fileType, fileSize, filePath, uploadedBy } = req.body;
  
  const batch = batchRepository.findById(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  try {
    const attachment = attachmentRepository.create({
      batchId: id,
      fileName,
      fileType,
      fileSize,
      filePath,
      uploadedBy
    });
    res.status(201).json(attachment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id/attachments/:attachmentId', (req: Request, res: Response) => {
  const { id, attachmentId } = req.params;
  const { operatedBy } = req.body;
  
  const batch = batchRepository.findById(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  attachmentRepository.delete(attachmentId, operatedBy || 'system');
  res.json({ success: true });
});

export default router;
