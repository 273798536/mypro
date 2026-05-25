const express = require('express');
const { authenticate, authorize, filterFieldsByRole, cityDataFilter } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const {
  createLedger,
  updateLedger,
  submitLedger,
  rejectLedger,
  reviewLedger,
  confirmLedger,
  secondConfirmLedger,
  finalizeLedger,
  getLedgerList,
  getLedgerDetail,
  getLedgerVersionHistory,
  addRefundToLedger,
  addPhotoToLedger,
  LEDGER_STATUS
} = require('../services/ledgerService');
const { getAuditTrail, compareVersions } = require('../services/auditService');
const { getDirtyRecords, getDirtyStats } = require('../services/dirtyRecordService');
const { runAllChecks } = require('../services/autoCheckService');

const router = express.Router();

router.use(authenticate, cityDataFilter);

const WRITE_ROLES = [ROLES.DATA_ENTRY, ROLES.REVIEWER, ROLES.SUPERVISOR];

router.post('/', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const ledger = await createLedger(req.user, req.body, req.ip);
    res.status(201).json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, ...filters } = req.query;
    const result = await getLedgerList(filters, parseInt(page), parseInt(limit));
    
    const filteredLedgers = filterFieldsByRole(result.ledgers, req.user.role);
    
    res.json({
      ...result,
      ledgers: filteredLedgers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/statuses', (req, res) => {
  res.json(LEDGER_STATUS);
});

router.get('/:id', async (req, res) => {
  try {
    const ledger = await getLedgerDetail(req.params.id);
    if (!ledger) {
      return res.status(404).json({ error: '台账不存在' });
    }
    
    const filteredLedger = filterFieldsByRole(ledger.toObject(), req.user.role);
    res.json(filteredLedger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const { changeReason, ...updateData } = req.body;
    const ledger = await updateLedger(
      req.params.id,
      req.user,
      updateData,
      req.ip,
      changeReason || '更新台账'
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/submit', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const ledger = await submitLedger(req.params.id, req.user, req.ip);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/reject', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { rejectReason } = req.body;
    const ledger = await rejectLedger(req.params.id, req.user, rejectReason, req.ip);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/review', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { reviewRemark } = req.body;
    const ledger = await reviewLedger(req.params.id, req.user, reviewRemark, req.ip);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/confirm', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const ledger = await confirmLedger(req.params.id, req.user, req.ip);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/second-confirm', authorize(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { secondConfirmRemark } = req.body;
    const ledger = await secondConfirmLedger(req.params.id, req.user, secondConfirmRemark, req.ip);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/finalize', authorize(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const ledger = await finalizeLedger(req.params.id, req.user, req.ip);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await getLedgerVersionHistory(req.params.id);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/versions/compare', async (req, res) => {
  try {
    const { v1, v2 } = req.query;
    const versions = await getLedgerVersionHistory(req.params.id);
    
    const version1 = versions.find(v => v.version === parseInt(v1));
    const version2 = versions.find(v => v.version === parseInt(v2));
    
    if (!version1 || !version2) {
      return res.status(404).json({ error: '版本不存在' });
    }
    
    const changes = compareVersions(version1.snapshot, version2.snapshot);
    res.json({ changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/audit-trail', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await getAuditTrail('ledger', req.params.id, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/dirty-records', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await getDirtyRecords(
      { ledgerId: req.params.id },
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/add-refund', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const { refundRecordId } = req.body;
    const ledger = await addRefundToLedger(req.params.id, refundRecordId, req.user);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/add-photo', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const { photoId } = req.body;
    const ledger = await addPhotoToLedger(req.params.id, photoId, req.user);
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/auto-checks', authorize(ROLES.SUPERVISOR), async (req, res) => {
  try {
    const result = await runAllChecks(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
