const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const travelController = require('../controllers/travelController');
const invoiceController = require('../controllers/invoiceController');
const paymentController = require('../controllers/paymentController');
const inventoryController = require('../controllers/inventoryController');
const auditEngineService = require('../services/auditEngineService');
const dirtyRecordService = require('../services/dirtyRecordService');
const auditTrailService = require('../services/auditTrailService');
const exportService = require('../services/exportService');
const replayService = require('../services/replayService');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

router.get('/health', (req, res) => {
  res.json({ success: true, message: '财务报销稽核验收回放链路服务运行正常', timestamp: new Date().toISOString() });
});

router.post('/travel/applications', travelController.createApplication);
router.get('/travel/applications', travelController.getApplications);
router.get('/travel/applications/:no', travelController.getApplicationById);
router.put('/travel/applications/:no', travelController.updateApplication);
router.get('/travel/shared/:group_id', travelController.getSharedTripGroup);

router.post('/invoices', invoiceController.createInvoice);
router.post('/invoices/upload', upload.single('pdf'), invoiceController.uploadInvoicePdf);
router.get('/invoices', invoiceController.getInvoices);
router.get('/invoices/:no', invoiceController.getInvoiceById);
router.put('/invoices/:no', invoiceController.updateInvoice);
router.post('/invoices/mark-duplicate', invoiceController.markDuplicate);
router.get('/duplicate-groups', invoiceController.getDuplicateGroups);

router.post('/payments', paymentController.createPayment);
router.get('/payments', paymentController.getPayments);
router.get('/payments/:no', paymentController.getPaymentById);

router.post('/refunds', paymentController.createRefund);
router.get('/refunds', paymentController.getRefunds);
router.get('/refunds/:no', paymentController.getRefundById);

router.post('/inventory/diffs', inventoryController.createDiff);
router.get('/inventory/diffs', inventoryController.getDiffs);
router.get('/inventory/diffs/:no', inventoryController.getDiffById);
router.put('/inventory/diffs/:no', inventoryController.updateDiff);

router.post('/audit/run', async (req, res) => {
  try {
    const result = await auditEngineService.runFullAudit({
      startDate: req.body.start_date,
      endDate: req.body.end_date,
      createdBy: req.body.created_by
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit/history', async (req, res) => {
  try {
    const results = await auditEngineService.getAuditHistory({
      auditType: req.query.audit_type,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      limit: parseInt(req.query.limit) || 100
    });
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit/:no', async (req, res) => {
  try {
    const result = await auditEngineService.getAuditById(req.params.no);
    if (!result) {
      return res.status(404).json({ success: false, error: '稽核记录不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dirty-records', async (req, res) => {
  try {
    const records = await dirtyRecordService.getDirtyRecords({
      dirtyType: req.query.dirty_type,
      sourceTable: req.query.source_table,
      isCorrected: req.query.is_corrected,
      sourceNo: req.query.source_no
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dirty-records/:id', async (req, res) => {
  try {
    const record = await dirtyRecordService.getDirtyRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: '脏记录不存在' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/dirty-records/:id/correct', async (req, res) => {
  try {
    const result = await dirtyRecordService.correctDirtyRecord(
      req.params.id,
      req.body.correction_note,
      req.body.corrected_by
    );
    res.json({ success: true, data: result, message: '脏记录已标记为已修正' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dirty-records/stats/summary', async (req, res) => {
  try {
    const stats = await dirtyRecordService.getDirtyStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit-trails', async (req, res) => {
  try {
    const trails = await auditTrailService.getTrails({
      operationType: req.query.operation_type,
      operationModule: req.query.operation_module,
      sourceNo: req.query.source_no,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      limit: parseInt(req.query.limit) || 100
    });
    res.json({ success: true, data: trails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit-trails/:id', async (req, res) => {
  try {
    const trail = await auditTrailService.getTrailById(req.params.id);
    if (!trail) {
      return res.status(404).json({ success: false, error: '审计轨迹不存在' });
    }
    res.json({ success: true, data: trail });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/export/invoices', async (req, res) => {
  try {
    const result = await exportService.exportInvoices({
      startDate: req.body.start_date,
      endDate: req.body.end_date,
      expenseCategory: req.body.expense_category,
      isDuplicate: req.body.is_duplicate
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/export/dirty-records', async (req, res) => {
  try {
    const result = await exportService.exportDirtyRecords({
      dirtyType: req.body.dirty_type,
      isCorrected: req.body.is_corrected,
      sourceTable: req.body.source_table
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/export/duplicate-groups', async (req, res) => {
  try {
    const result = await exportService.exportDuplicateGroups();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/export/audit-report/:auditNo', async (req, res) => {
  try {
    const result = await exportService.exportAuditReport(req.params.auditNo);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/exports', (req, res) => {
  try {
    const files = exportService.listExports();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/exports/:filename', (req, res) => {
  try {
    const filepath = exportService.getExportFilePath(req.params.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    res.download(filepath);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/replay/start', async (req, res) => {
  try {
    const result = await replayService.startReplaySession({
      sessionName: req.body.session_name,
      startDate: req.body.start_date,
      endDate: req.body.end_date,
      createdBy: req.body.created_by
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/replay/sessions', async (req, res) => {
  try {
    const sessions = await replayService.getReplaySessions({
      status: req.query.status,
      limit: parseInt(req.query.limit) || 100
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/replay/:sessionId', async (req, res) => {
  try {
    const session = await replayService.getReplaySession(req.params.sessionId);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/replay/:sessionId/anomalies', async (req, res) => {
  try {
    const anomalies = await replayService.getReplayAnomalies(req.params.sessionId);
    res.json({ success: true, data: anomalies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/recalculate', async (req, res) => {
  try {
    const result = await replayService.recalculateAfterCorrection();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
