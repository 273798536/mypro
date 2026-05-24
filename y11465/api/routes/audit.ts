import { Router, Request, Response } from 'express';
import auditLogRepository from '../repositories/AuditLogRepository';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20', entityType, operatedBy } = req.query;
  
  const result = auditLogRepository.findAll({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    entityType: entityType as string,
    operatedBy: operatedBy as string
  });
  
  res.json(result);
});

router.get('/:entityType/:entityId', (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;
  const logs = auditLogRepository.findByEntity(entityType.toUpperCase(), entityId);
  
  res.json(logs);
});

export default router;
