"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReceiptService_1 = require("../services/ReceiptService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const { applicationNo, receiptType, externalReference, timestamp, data } = req.body;
        if (!applicationNo || !receiptType || !externalReference) {
            res.status(400).json({
                success: false,
                error: '缺少必要参数: applicationNo, receiptType, externalReference'
            });
            return;
        }
        const result = await ReceiptService_1.ReceiptService.submitExternalReceipt({
            applicationNo,
            receiptType,
            externalReference,
            timestamp: timestamp || new Date().toISOString(),
            data: data || {},
            operatorId: req.user?.userId,
            operatorName: req.user?.userName
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/process/:applicationId', (0, auth_1.requirePermission)('application:close'), async (req, res) => {
    try {
        const { payload } = req.body;
        if (!payload || !payload.receiptType) {
            res.status(400).json({
                success: false,
                error: '缺少必要参数: payload.receiptType'
            });
            return;
        }
        const result = await ReceiptService_1.ReceiptService.processReceiptPayload(req.params.applicationId, payload, req.user?.userId, req.user?.userName);
        res.json({
            success: result.success,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/calculate-fees/:applicationId', (0, auth_1.requirePermission)('application:close'), async (req, res) => {
    try {
        const result = await ReceiptService_1.ReceiptService.calculateAndRecordFees(req.params.applicationId, req.user.userId, req.user.userName);
        res.json({
            success: result.success,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
