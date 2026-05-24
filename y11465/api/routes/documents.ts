import { Router, Request, Response } from 'express';
import documentRepository from '../repositories/DocumentRepository';
import auditLogRepository from '../repositories/AuditLogRepository';
import fabricTrackRepository from '../repositories/FabricTrackRepository';
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
  
  const auditLogs = auditLogRepository.findByEntity('document', id);
  const fabricTracks = fabricTrackRepository.findByDocumentId(id);
  const versions = documentRepository.getVersionsByStyleAndDocNo(doc.styleCode, doc.documentNo);
  
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

export default router;
