const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const batchService = require('../services/batchService');
const attachmentService = require('../services/attachmentService');
const stateService = require('../services/stateService');
const validationService = require('../services/validationService');
const reportService = require('../services/reportService');
const auditService = require('../services/auditService');
const { ACTIONS, ATTACHMENT_TYPES } = require('../database/schema');
const logger = require('../utils/logger');

if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxSize
  }
});

const getOperator = (req) => req.headers['x-operator'] || 'system';

router.post('/', (req, res, next) => {
  try {
    const { projectName, bidNo, manualRemark } = req.body;
    const operator = getOperator(req);

    if (!projectName) {
      return res.status(400).json({
        success: false,
        error: 'projectName is required'
      });
    }

    const batch = batchService.createBatch({
      projectName,
      bidNo,
      operator,
      manualRemark
    });

    res.json({
      success: true,
      data: batch
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    const { status, page, pageSize, operator, projectName } = req.query;
    
    const result = batchService.listBatches({
      status,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      operator,
      projectName
    });

    res.json({
      success: true,
      data: result.list,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const batch = batchService.getBatchById(batchId);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const attachments = attachmentService.getLatestAttachmentsByBatchId(batchId);
    const validation = validationService.getValidationSummary(batchId);

    res.json({
      success: true,
      data: {
        batch,
        attachments,
        validation
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const operator = getOperator(req);
    
    const batch = batchService.updateBatch(batchId, req.body, operator);

    res.json({
      success: true,
      data: batch
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/manual-remark', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { manualRemark } = req.body;
    const operator = getOperator(req);
    
    const batch = batchService.updateManualRemark(batchId, manualRemark, operator);

    res.json({
      success: true,
      data: batch
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/detail', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const reportData = reportService.getBatchReportData(batchId);

    res.json({
      success: true,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/history', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const statusHistory = stateService.getStatusHistory(batchId);
    const auditTrails = auditService.getAuditTrailsByBatchId(batchId);

    res.json({
      success: true,
      data: {
        statusHistory,
        auditTrails
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/attachments', upload.single('file'), (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { attachmentType, pageCount, pageModified } = req.body;
    const operator = getOperator(req);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!attachmentType || !Object.values(ATTACHMENT_TYPES).includes(attachmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attachmentType'
      });
    }

    const attachment = attachmentService.addAttachment({
      batchId,
      attachmentType,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadBy: operator,
      pageCount: pageCount ? parseInt(pageCount) : null,
      pageModified
    });

    res.json({
      success: true,
      data: attachment
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attachments', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const attachments = attachmentService.getAttachmentsByBatchId(batchId);

    res.json({
      success: true,
      data: attachments
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attachments/:type/history', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const attachmentType = req.params.type;
    
    const history = attachmentService.getAttachmentHistory(batchId, attachmentType);

    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/submit', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { remark } = req.body;
    const operator = getOperator(req);

    const result = stateService.transitionState(batchId, ACTIONS.SUBMIT, operator, null, remark);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/review', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { passed, reason, remark } = req.body;
    const operator = getOperator(req);

    const action = passed ? ACTIONS.REVIEW : ACTIONS.OVERRULE;
    const result = stateService.transitionState(batchId, action, operator, reason, remark);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/freeze', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { reason } = req.body;
    const operator = getOperator(req);

    const result = stateService.freezeBatch(batchId, operator, reason);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/unfreeze', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { reason } = req.body;
    const operator = getOperator(req);

    const result = stateService.unfreezeBatch(batchId, operator, reason);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/settle', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { remark } = req.body;
    const operator = getOperator(req);

    const result = stateService.transitionState(batchId, ACTIONS.SETTLE, operator, null, remark);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/archive', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { remark } = req.body;
    const operator = getOperator(req);

    const result = stateService.transitionState(batchId, ACTIONS.ARCHIVE, operator, null, remark);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/actions/cancel', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { reason } = req.body;
    const operator = getOperator(req);

    const result = stateService.transitionState(batchId, ACTIONS.CANCEL, operator, reason);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/failed-records', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { isResolved, page, pageSize } = req.query;
    
    const result = validationService.getFailedRecords(batchId, {
      isResolved: isResolved ? isResolved === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 50
    });

    res.json({
      success: true,
      data: result.list,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/failed-records/:recordId/resolve', (req, res, next) => {
  try {
    const { recordId } = req.params;
    const { resolutionRemark } = req.body;
    const operator = getOperator(req);

    const result = validationService.resolveFailedRecord(
      parseInt(recordId),
      operator,
      resolutionRemark
    );

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/validation', (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const result = validationService.validateBatchConsistency(batchId);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/export', async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id);
    const { format } = req.body;

    const result = await reportService.exportBatchReport(batchId, format || 'csv');

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
