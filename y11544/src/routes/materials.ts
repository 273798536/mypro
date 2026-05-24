import { Router } from 'express';
import { materialService } from '../services/materialService';
import { roleAuth, getRoleFromRequest, getUserIdFromRequest, AuthenticatedRequest } from '../middleware/roleMiddleware';
import { UserRole, MaterialStatus, CreateMaterialRequest, StatusChangeRequest } from '../types';
import { roleViewService } from '../services/roleViewService';

const router = Router();

router.post('/',
  roleAuth([UserRole.OPERATOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const request: CreateMaterialRequest = req.body;
      const role = getRoleFromRequest(req);

      if (!request.materialId || !request.name || !request.platform || !request.originalName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      request.createdBy = getUserIdFromRequest(req);
      const material = await materialService.createMaterial(request, role);
      res.status(201).json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const status = req.query.status as MaterialStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await materialService.listMaterials(status, page, pageSize);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/:materialId',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId } = req.params;
      const role = getRoleFromRequest(req);

      const detail = await roleViewService.getMaterialForRole(materialId, role);

      if (!detail) {
        return res.status(404).json({ error: 'Material not found' });
      }

      res.json(detail);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/:materialId/history',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { materialId } = req.params;
      const history = await materialService.getStatusHistory(materialId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/:materialId/status',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId } = req.params;
      const { toStatus, reason } = req.body;
      const role = getRoleFromRequest(req);
      const changedBy = getUserIdFromRequest(req);

      if (!toStatus || !reason) {
        return res.status(400).json({ error: 'toStatus and reason are required' });
      }

      const request: StatusChangeRequest = {
        materialId,
        toStatus,
        changedBy,
        reason
      };

      const material = await materialService.changeStatus(request, role);
      res.json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post('/:materialId/submit',
  roleAuth([UserRole.OPERATOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId } = req.params;
      const submittedBy = getUserIdFromRequest(req);
      const material = await materialService.submitForReview(materialId, submittedBy);
      res.json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post('/:materialId/reject',
  roleAuth([UserRole.REVIEWER, UserRole.MANAGER, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId } = req.params;
      const { reason } = req.body;
      const rejectedBy = getUserIdFromRequest(req);

      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }

      const material = await materialService.rejectMaterial(materialId, rejectedBy, reason);
      res.json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post('/:materialId/confirm',
  roleAuth([UserRole.REVIEWER, UserRole.MANAGER, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId } = req.params;
      const confirmedBy = getUserIdFromRequest(req);
      const material = await materialService.secondaryConfirm(materialId, confirmedBy);
      res.json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
