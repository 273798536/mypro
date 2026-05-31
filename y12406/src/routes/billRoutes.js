const express = require('express');
const router = express.Router();
const BillController = require('../controllers/billController');

router.post('/', BillController.generateBill);
router.get('/', BillController.getBillList);
router.post('/red-flush', BillController.createRedFlushBill);
router.get('/exports/:filename', BillController.downloadExport);
router.get('/:id', BillController.getBillDetail);
router.post('/:id/confirm', BillController.confirmBill);
router.get('/:id/export', BillController.exportBill);
router.post('/:id/status', BillController.updateBillStatus);

module.exports = router;
