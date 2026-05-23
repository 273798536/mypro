import { Router } from 'express';
import { batchService } from '../services/BatchService';
import { importService } from '../services/ImportService';
import { matchService } from '../services/MatchService';
import { exportService } from '../services/ExportService';
import { remarkService } from '../services/RemarkService';
import { photoService } from '../services/PhotoService';
import { auditService } from '../services/AuditService';
import { asyncTaskService } from '../services/AsyncTaskService';
import { AuthenticatedRequest } from '../middleware/auth';
import { maskData, maskDataArray } from '../utils/dataMasking';
import * as multer from 'multer';

const router = Router();
const upload = multer();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, pageSize = 20, cityCode, status, startDate, endDate } = req.query;
    const result = await batchService.listBatches({
      cityCode: cityCode as string,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    }, Number(page), Number(pageSize));

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const batch = await batchService.createBatch({
      ...req.body,
      operatorId: req.user?.id,
      operatorName: req.user?.name,
    });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const stats = await batchService.getBatchStatistics(req.params.id);

    res.json({
      success: true,
      data: {
        ...batch,
        statistics: stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/submit', async (req: AuthenticatedRequest, res) => {
  try {
    const batch = await batchService.submitBatch(req.params.id, {
      operatorId: req.user?.id,
      operatorName: req.user?.name,
      operatorRole: req.user?.role,
      reason: req.body.reason,
    });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/reject', async (req: AuthenticatedRequest, res) => {
  try {
    const batch = await batchService.rejectBatch(req.params.id, {
      operatorId: req.user?.id,
      operatorName: req.user?.name,
      operatorRole: req.user?.role,
      reason: req.body.reason,
    });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/confirm', async (req: AuthenticatedRequest, res) => {
  try {
    const batch = await batchService.confirmBatch(req.params.id, {
      operatorId: req.user?.id,
      operatorName: req.user?.name,
      operatorRole: req.user?.role,
      reason: req.body.reason,
    });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/audit', async (req: AuthenticatedRequest, res) => {
  try {
    const batch = await batchService.auditBatch(req.params.id, {
      operatorId: req.user?.id,
      operatorName: req.user?.name,
      operatorRole: req.user?.role,
      reason: req.body.reason,
      remark: req.body.remark,
    });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/import/refunds', async (req: AuthenticatedRequest, res) => {
  try {
    const { data, strategy = 'ignore' } = req.body;
    const result = await importService.importLeaderRefunds(
      req.params.id,
      data,
      strategy,
      req.user?.id,
      req.user?.name
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/import/reviews', async (req: AuthenticatedRequest, res) => {
  try {
    const { data, strategy = 'ignore' } = req.body;
    const result = await importService.importWarehouseReviews(
      req.params.id,
      data,
      strategy,
      req.user?.id,
      req.user?.name
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/match', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await matchService.matchBatch(
      req.params.id,
      req.user?.id,
      req.user?.name
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/refunds', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, pageSize = 50, status, refundType, isMatched } = req.query;
    const result = await matchService.getRefundsByBatch(req.params.id, {
      status: status as string,
      refundType: refundType as string,
      isMatched: isMatched !== undefined ? isMatched === 'true' : undefined,
    }, Number(page), Number(pageSize));

    const maskedData = maskDataArray(result.data, req.user?.role || 'auditor');

    res.json({
      success: true,
      data: maskedData,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/reviews', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, pageSize = 50, reviewResult, isMatched } = req.query;
    const result = await matchService.getReviewsByBatch(req.params.id, {
      reviewResult: reviewResult as string,
      isMatched: isMatched !== undefined ? isMatched === 'true' : undefined,
    }, Number(page), Number(pageSize));

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/refunds/:refundId/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { status, processRemark } = req.body;
    const refund = await matchService.updateRefundStatus(
      req.params.refundId,
      status,
      processRemark,
      req.user?.id,
      req.user?.name
    );

    res.json({ success: true, data: refund });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/export', async (req: AuthenticatedRequest, res) => {
  try {
    const { type = 'full', format = 'csv' } = req.query;
    const result = await exportService.export({
      batchId: req.params.id,
      exportType: type as any,
      format: format as any,
      role: req.user?.role || 'auditor',
      operatorId: req.user?.id,
      operatorName: req.user?.name,
    });

    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.send(result.data);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/remarks', async (req: AuthenticatedRequest, res) => {
  try {
    const remark = await remarkService.createRemark({
      ...req.body,
      batchId: req.params.id,
      operatorId: req.user?.id,
      operatorName: req.user?.name,
    });

    res.json({ success: true, data: remark });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/remarks', async (req: AuthenticatedRequest, res) => {
  try {
    const remarks = await remarkService.getRemarksByBatch(req.params.id);
    res.json({ success: true, data: remarks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/photos', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }

    const photo = await photoService.uploadPhoto({
      file: req.file,
      batchId: req.params.id,
      refundId: req.body.refundId,
      uploadedBy: req.user?.id,
      description: req.body.description,
      photoType: req.body.photoType,
    });

    res.json({ success: true, data: photo });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/photos', async (req: AuthenticatedRequest, res) => {
  try {
    const photos = await photoService.getPhotosByBatch(req.params.id);
    res.json({ success: true, data: photos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/audit-trails', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, pageSize = 50, entityType } = req.query;
    const result = await auditService.getAuditTrails(
      entityType as any,
      undefined,
      req.params.id,
      Number(page),
      Number(pageSize)
    );

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await asyncTaskService.getTasksByBatch(req.params.id);
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
