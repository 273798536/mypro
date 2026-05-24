const express = require('express');
const { authenticateToken, requireRole, filterFieldsByRole, createAuditLog } = require('../middleware/auth');
const config = require('../config/config');
const compensationService = require('../services/compensationService');

const router = express.Router();

router.get('/report', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const { start_date, end_date, include_unverified } = req.query;

  const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0] + 'T23:59:59.999Z';

  const report = await compensationService.getCompensationReport(
    startDate + 'T00:00:00.000Z',
    endDate,
    include_unverified === 'true'
  );

  const filteredRecords = filterFieldsByRole(req.user.role, 'compensation_records', report.records);

  res.json({
    ...report,
    records: filteredRecords
  });
});

router.get('/export', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const { start_date, end_date } = req.query;

  const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0] + 'T23:59:59.999Z';

  const report = await compensationService.getCompensationReport(
    startDate + 'T00:00:00.000Z',
    endDate,
    false
  );

  const csv = compensationService.exportToCSV(report.records);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="compensation_report_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send('\ufeff' + csv);
});

router.post('/:id/verify', authenticateToken, requireRole(config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const success = await compensationService.verifyCompensation(parseInt(req.params.id), req.user.id);

  if (success) {
    await createAuditLog(req.user.id, 'verify', 'compensation_records', req.params.id, {}, req.ip);
    res.json({ message: '复核成功' });
  } else {
    res.status(404).json({ error: '补偿记录不存在' });
  }
});

router.get('/workorder/:workOrderId', authenticateToken, async (req, res) => {
  const records = await compensationService.getCompensationByWorkOrder(req.params.workOrderId);
  const filtered = filterFieldsByRole(req.user.role, 'compensation_records', records);
  res.json(filtered);
});

module.exports = router;
