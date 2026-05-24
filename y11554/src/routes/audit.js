const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const { getAuditTrail } = require('../services/auditService');
const { getDirtyRecords, processDirtyRecord, resolveDirtyRecord, ignoreDirtyRecord, getDirtyStats, DIRTY_TYPES, PROCESS_STATUS } = require('../services/dirtyRecordService');
const { getCheckStats } = require('../services/autoCheckService');

const router = express.Router();

router.use(authenticate);

router.get('/dirty-records', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { page = 1, limit = 50, ...filters } = req.query;
    const result = await getDirtyRecords(filters, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dirty-records/stats', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const stats = await getDirtyStats(req.query);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dirty-records/types', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), (req, res) => {
  res.json({
    dirtyTypes: DIRTY_TYPES,
    processStatus: PROCESS_STATUS
  });
});

router.put('/dirty-records/:id/process', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { processOpinion, correctionData, correctionRemark } = req.body;
    const result = await processDirtyRecord(
      req.params.id,
      req.user._id,
      processOpinion,
      correctionData,
      correctionRemark
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/dirty-records/:id/resolve', authorize(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { resummarize } = req.body;
    const result = await resolveDirtyRecord(req.params.id, resummarize);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/dirty-records/:id/ignore', authorize(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await ignoreDirtyRecord(req.params.id, req.user._id, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/trail/:targetType/:targetId', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await getAuditTrail(
      req.params.targetType,
      req.params.targetId,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-stats', authorize(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const stats = await getCheckStats(req.query);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
