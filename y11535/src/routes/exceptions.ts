import { Router } from 'express';
import * as multer from 'multer';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { exceptionRecordService } from '../services/ExceptionRecordService';
import { stateMachine } from '../services/StateMachineService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get(
  '/',
  requirePermission('exception:read'),
  async (req: AuthRequest, res) => {
    try {
      const {
        batchId, employeeId, trainingId, department,
        status, exceptionType, isFrozen, page, pageSize
      } = req.query;

      const result = await exceptionRecordService.getRecords({
        batchId: batchId as string,
        employeeId: employeeId as string,
        trainingId: trainingId as string,
        department: department as string,
        status: status as any,
        exceptionType: exceptionType as any,
        isFrozen: isFrozen === 'true' ? true : isFrozen === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 50
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id',
  requirePermission('exception:read'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.getRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'RECORD_NOT_FOUND' });
      }
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/review',
  requirePermission('exception:review'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.reviewRecord({
        recordId: req.params.id,
        reviewerId: req.user!.id,
        reviewerName: req.user!.name,
        reviewerRole: req.user!.role,
        result: req.body.result,
        reason: req.body.reason,
        manualOverride: req.body.manualOverride,
        targetStatus: req.body.targetStatus,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      if (error.message.startsWith('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: error.message
        });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/revise',
  requirePermission('exception:revise'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.reviewRecord({
        recordId: req.params.id,
        reviewerId: req.user!.id,
        reviewerName: req.user!.name,
        reviewerRole: req.user!.role,
        result: req.body.result,
        reason: req.body.reason,
        manualOverride: true,
        targetStatus: req.body.targetStatus,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      if (error.message.startsWith('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: error.message
        });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/attachments',
  requirePermission('attachment:upload'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
      }

      const record = await exceptionRecordService.addAttachment({
        recordId: req.params.id,
        attachment: {
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          fileHash: 'hash_' + Date.now(),
          storagePath: `/uploads/${req.file.originalname}`,
          uploadedBy: req.user!.id,
          description: req.body.description || '',
          isOriginalEvidence: false
        },
        uploadedBy: req.user!.id,
        uploaderName: req.user!.name,
        uploaderRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/freeze',
  requirePermission('exception:freeze'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.freezeRecord({
        recordId: req.params.id,
        operatorId: req.user!.id,
        operatorName: req.user!.name,
        operatorRole: req.user!.role,
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      if (error.message.startsWith('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: error.message
        });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/unfreeze',
  requirePermission('exception:unfreeze'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.unfreezeRecord({
        recordId: req.params.id,
        operatorId: req.user!.id,
        operatorName: req.user!.name,
        operatorRole: req.user!.role,
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/settle',
  requirePermission('exception:settle'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.settleRecord({
        recordId: req.params.id,
        operatorId: req.user!.id,
        operatorName: req.user!.name,
        operatorRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      if (error.message.startsWith('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: error.message
        });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/withdraw',
  requirePermission('exception:withdraw'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.withdrawRecord({
        recordId: req.params.id,
        operatorId: req.user!.id,
        operatorName: req.user!.name,
        operatorRole: req.user!.role,
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      if (error.message.startsWith('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: 'PERMISSION_DENIED',
          message: error.message
        });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/reactivate',
  requirePermission('exception:reactivate'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.reactivateRecord({
        recordId: req.params.id,
        operatorId: req.user!.id,
        operatorName: req.user!.name,
        operatorRole: req.user!.role,
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/archive',
  requirePermission('exception:archive'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.archiveRecord({
        recordId: req.params.id,
        operatorId: req.user!.id,
        operatorName: req.user!.name,
        operatorRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id/transitions',
  requirePermission('exception:read'),
  async (req: AuthRequest, res) => {
    try {
      const transitions = await exceptionRecordService.getStateTransitions(req.params.id);
      res.json(transitions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id/diff',
  requirePermission('exception:read'),
  async (req: AuthRequest, res) => {
    try {
      const { from, to } = req.query;
      const diff = await exceptionRecordService.getDiffBetweenTransitions(
        req.params.id,
        parseInt(from as string),
        parseInt(to as string)
      );
      res.json(diff);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id/original-evidence',
  requirePermission('exception:read'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.getRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'RECORD_NOT_FOUND' });
      }
      res.json({
        importSource: record.importSource,
        originalEvidence: record.originalEvidence
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id/valid-transitions',
  requirePermission('exception:read'),
  async (req: AuthRequest, res) => {
    try {
      const record = await exceptionRecordService.getRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'RECORD_NOT_FOUND' });
      }

      const validTransitions = stateMachine.getValidTransitions(
        record.status,
        req.user!.role
      );

      res.json(validTransitions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
