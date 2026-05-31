const express = require('express');
const router = express.Router();
const DowngradeController = require('../controllers/downgradeController');

router.post('/', DowngradeController.createRequest);
router.get('/', DowngradeController.getRequestList);
router.get('/:id/affected-usages', DowngradeController.getAffectedUsages);
router.post('/:id/approve', DowngradeController.approveRequest);
router.post('/:id/execute', DowngradeController.executeRequest);

module.exports = router;
