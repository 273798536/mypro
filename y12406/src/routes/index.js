const express = require('express');
const router = express.Router();

const seatUsageRoutes = require('./seatUsageRoutes');
const downgradeRoutes = require('./downgradeRoutes');
const manualCorrectionRoutes = require('./manualCorrectionRoutes');
const billRoutes = require('./billRoutes');

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SaaS座席超额计费服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.use('/seat-usages', seatUsageRoutes);
router.use('/downgrade-requests', downgradeRoutes);
router.use('/manual-corrections', manualCorrectionRoutes);
router.use('/bills', billRoutes);

module.exports = router;
