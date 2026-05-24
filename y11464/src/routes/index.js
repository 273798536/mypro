const express = require('express');
const LedgerController = require('../controllers/LedgerController');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '口腔门诊材料权限追责台账API运行正常',
    timestamp: new Date().toISOString()
  });
});

router.post('/ledgers', LedgerController.createLedger);
router.get('/ledgers', LedgerController.listLedgers);
router.get('/ledgers/detailed', LedgerController.getDetailedLedgers);
router.get('/ledgers/:id', LedgerController.getLedger);
router.post('/ledgers/:id/submit', LedgerController.submitLedger);
router.post('/ledgers/:id/reject', LedgerController.rejectLedger);
router.post('/ledgers/:id/confirm', LedgerController.confirmLedger);
router.post('/ledgers/:id/readonly', LedgerController.markReadonly);
router.get('/ledgers/:id/audit-logs', LedgerController.getAuditLogs);

router.get('/summary', LedgerController.getSummary);
router.post('/export', LedgerController.exportLedgers);
router.get('/export/files', LedgerController.getExportFiles);

router.get('/audit-logs', LedgerController.getAllAuditLogs);

router.get('/failed-records', LedgerController.getFailedRecords);
router.get('/failed-records/stats', LedgerController.getFailedStats);
router.post('/failed-records/:id/resolve', LedgerController.resolveFailedRecord);

router.get('/director/views/recent', LedgerController.getRecentDirectorViews);
router.get('/director/views/:date', LedgerController.getDirectorView);
router.post('/director/views/:date/generate', LedgerController.generateDirectorView);
router.get('/director/sensitive-report', LedgerController.getSensitiveFieldReport);
router.get('/director/audit-trail', LedgerController.getAuditTrailSummary);

router.post('/implants', LedgerController.createImplant);
router.get('/implants', LedgerController.listImplants);

router.post('/appointments', LedgerController.createAppointment);
router.get('/appointments', LedgerController.listAppointments);

router.post('/invoices', LedgerController.createInvoice);
router.get('/invoices', LedgerController.listInvoices);

module.exports = router;
