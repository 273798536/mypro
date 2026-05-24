import { Router } from 'express';
import { auditService } from '../services/auditService';
import { roleAuth, getUserIdFromRequest, AuthenticatedRequest } from '../middleware/roleMiddleware';
import { UserRole, AuditRequest, ManagerCommentRequest } from '../types';

const router = Router();

router.post('/audit',
  roleAuth([UserRole.REVIEWER, UserRole.MANAGER, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId, auditResult, auditComment } = req.body;
      const auditedBy = getUserIdFromRequest(req);

      if (!materialId || !auditResult) {
        return res.status(400).json({ error: 'materialId and auditResult are required' });
      }

      const request: AuditRequest = {
        materialId,
        auditResult,
        auditComment: auditComment || '',
        auditedBy
      };

      const record = await auditService.addAuditRecord(request);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/audit/material/:materialId',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { materialId } = req.params;
      const records = await auditService.getAuditRecords(materialId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/comments',
  roleAuth([UserRole.MANAGER, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId, comment, evidence } = req.body;
      const commentedBy = getUserIdFromRequest(req);

      if (!materialId || !comment) {
        return res.status(400).json({ error: 'materialId and comment are required' });
      }

      const request: ManagerCommentRequest = {
        materialId,
        comment,
        evidence,
        commentedBy
      };

      const record = await auditService.addManagerComment(request);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/comments/material/:materialId',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { materialId } = req.params;
      const comments = await auditService.getManagerComments(materialId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
