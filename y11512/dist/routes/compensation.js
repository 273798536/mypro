"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CompensationService_1 = require("../services/CompensationService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const { applicationId, compensationType, amount, reason, evidence } = req.body;
        if (!applicationId || !compensationType || amount === undefined) {
            res.status(400).json({
                success: false,
                error: '缺少必要参数: applicationId, compensationType, amount'
            });
            return;
        }
        const record = await CompensationService_1.CompensationService.createCompensationRecord({
            applicationId,
            compensationType: compensationType,
            amount: parseFloat(amount),
            reason,
            evidence
        }, req.user?.userId, req.user?.userName);
        res.json({
            success: true,
            data: record
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/application/:applicationId', (0, auth_1.requirePermission)('application:view'), async (req, res) => {
    try {
        const records = await CompensationService_1.CompensationService.getCompensationRecordsByApplication(req.params.applicationId);
        res.json({
            success: true,
            data: records
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/:id', (0, auth_1.requirePermission)('application:view'), async (req, res) => {
    try {
        const record = await CompensationService_1.CompensationService.getCompensationRecordById(req.params.id);
        res.json({
            success: true,
            data: record
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/confirm', (0, auth_1.requirePermission)('application:close'), async (req, res) => {
    try {
        const record = await CompensationService_1.CompensationService.confirmCompensation(req.params.id, req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: record
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/pay', (0, auth_1.requirePermission)('application:close'), async (req, res) => {
    try {
        const { amount, paymentMethod, paymentReference } = req.body;
        if (!amount || !paymentMethod) {
            res.status(400).json({
                success: false,
                error: '缺少必要参数: amount, paymentMethod'
            });
            return;
        }
        const record = await CompensationService_1.CompensationService.processPayment({
            recordId: req.params.id,
            amount: parseFloat(amount),
            paymentMethod,
            paymentReference
        }, req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: record
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/waive', (0, auth_1.requirePermission)('application:close'), async (req, res) => {
    try {
        const { reason } = req.body;
        const record = await CompensationService_1.CompensationService.waiveCompensation(req.params.id, reason || '主管豁免', req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: record
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
