import { Router, Request, Response } from 'express';
import documentRepository from '../repositories/DocumentRepository';
import auditLogRepository from '../repositories/AuditLogRepository';
import fabricTrackRepository from '../repositories/FabricTrackRepository';
import attachmentRepository from '../repositories/AttachmentRepository';
import type { CreateDocumentRequest, DocumentType } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20', documentType, status, styleCode } = req.query;
  
  const result = documentRepository.findAll({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    documentType: documentType as DocumentType,
    status: status as any,
    styleCode: styleCode as string
  });
  
  res.json(result);
});

router.get('/pending-review', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20' } = req.query;
  
  const result = documentRepository.findPendingReview({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string)
  });
  
  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = documentRepository.findById(id);
  
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  const auditLogs = auditLogRepository.findByEntity('DOCUMENT', id);
  const fabricTracks = fabricTrackRepository.findByDocumentId(id);
  const versions = documentRepository.getAllVersions(id);
  
  res.json({
    ...doc,
    auditLogs,
    fabricTracks,
    versions
  });
});

router.get('/:id/diff', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fromVersion, toVersion } = req.query;
  
  const diff = documentRepository.getDiff(
    id,
    parseInt(fromVersion as string) || 1,
    parseInt(toVersion as string) || 2
  );
  
  if (!diff) {
    return res.status(404).json({ error: 'Diff not found' });
  }
  
  res.json(diff);
});

router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateDocumentRequest;
  
  try {
    const doc = documentRepository.create(body);
    res.status(201).json(doc);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/fabric-track', (req: Request, res: Response) => {
  const body = req.body;
  
  try {
    const track = fabricTrackRepository.create(body);
    res.status(201).json(track);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/attachments', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const doc = documentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  const attachments = attachmentRepository.findByDocumentId(id);
  res.json({ data: attachments, total: attachments.length });
});

router.post('/:id/attachments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fileName, fileType, fileSize, filePath, uploadedBy } = req.body;
  
  const doc = documentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  try {
    const attachment = attachmentRepository.create({
      documentId: id,
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
  
  const doc = documentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  attachmentRepository.delete(attachmentId, operatedBy || 'system');
  res.json({ success: true });
});

export default router;
