const express = require('express');
const router = express.Router();
const ManualCorrectionController = require('../controllers/manualCorrectionController');

router.post('/', ManualCorrectionController.createCorrection);
router.get('/', ManualCorrectionController.getCorrectionList);
router.get('/history', ManualCorrectionController.getCorrectionHistory);
router.get('/:id', ManualCorrectionController.getCorrectionDetail);
router.post('/:id/approve', ManualCorrectionController.approveCorrection);
router.post('/:id/execute', ManualCorrectionController.executeCorrection);

module.exports = router;
