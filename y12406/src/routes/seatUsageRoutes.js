const express = require('express');
const router = express.Router();
const SeatUsageController = require('../controllers/seatUsageController');

router.post('/', SeatUsageController.createUsage);
router.get('/', SeatUsageController.getUsageList);
router.get('/check-rule', SeatUsageController.checkBillingRule);
router.get('/detect-duplicates', SeatUsageController.detectBatchDuplicates);
router.post('/trigger-duplicate-test', SeatUsageController.triggerDuplicateForTesting);
router.post('/submit-review', SeatUsageController.submitForReview);
router.post('/mark-duplicate', SeatUsageController.markDuplicate);
router.post('/merge-duplicates', SeatUsageController.mergeDuplicates);
router.get('/:id', SeatUsageController.getUsageDetail);
router.post('/:id/review', SeatUsageController.reviewUsage);
router.post('/:id/advance-status', SeatUsageController.advanceStatus);
router.post('/:id/recalculate', SeatUsageController.recalculateUsage);

module.exports = router;
