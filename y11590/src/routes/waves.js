const express = require('express');
const router = express.Router();
const waveController = require('../controllers/waveController');
const idempotentMiddleware = require('../middleware/idempotent');

router.post('/', idempotentMiddleware, waveController.createWave);
router.get('/', waveController.listWaves);
router.get('/no/:waveNo', waveController.getWaveByNo);
router.get('/report/variance', waveController.getVarianceReport);
router.get('/report/variance/export', waveController.exportVarianceReport);
router.get('/performance/summary', waveController.getPerformanceSummary);
router.get('/appeals', waveController.listAppeals);
router.get('/:waveId', waveController.getWave);
router.get('/:waveId/full', waveController.getWaveFullDetail);
router.get('/:waveId/history', waveController.getWaveHistory);
router.patch('/:waveId/status', waveController.updateWaveStatus);
router.post('/:waveId/picking', waveController.recordPicking);
router.post('/:waveId/shortage', idempotentMiddleware, waveController.markShortage);
router.post('/:waveId/replenishment', idempotentMiddleware, waveController.createReplenishmentTask);
router.get('/:waveId/replenishment', waveController.getReplenishmentTasks);
router.get('/:waveId/occupations', waveController.getLocationOccupations);
router.post('/:waveId/performance/recalculate', idempotentMiddleware, waveController.recalculatePerformance);
router.get('/:waveId/performance', waveController.getWavePerformance);
router.post('/:waveId/appeals', waveController.createAppeal);
router.patch('/:waveId/items/:waveItemId/shortage-reason', idempotentMiddleware, waveController.correctShortageReason);

router.post('/replenishment/:taskId/confirm', idempotentMiddleware, waveController.confirmReplenishment);
router.patch('/occupations/:occupationId/release', waveController.releaseOccupation);
router.patch('/appeals/:appealId/review', waveController.reviewAppeal);

module.exports = router;
