"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BorrowApplicationService_1 = require("../services/BorrowApplicationService");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
router.post('/submit', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const { data, duplicateStrategy = 'append' } = req.body;
        if (!data || !data.applicationNo) {
            res.status(400).json({
                success: false,
                error: '缺少申请编号'
            });
            return;
        }
        const duplicateHandling = {
            strategy: duplicateStrategy
        };
        const result = await BorrowApplicationService_1.BorrowApplicationService.submitApplication(data, duplicateHandling, req.user?.userId, req.user?.userName);
        res.json({
            success: true,
            data: {
                application: result.application,
                isNew: result.isNew,
                action: result.action
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/batch-submit', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const { applications, duplicateStrategy = 'append' } = req.body;
        if (!Array.isArray(applications)) {
            res.status(400).json({
                success: false,
                error: '申请列表格式错误'
            });
            return;
        }
        const batchId = (0, uuid_1.v4)();
        const duplicateHandling = {
            strategy: duplicateStrategy
        };
        const result = await BorrowApplicationService_1.BorrowApplicationService.batchSubmit(applications, duplicateHandling, batchId, req.user?.userId, req.user?.userName);
        res.json({
            success: true,
            data: {
                batchId,
                total: applications.length,
                ...result
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/withdraw', (0, auth_1.requirePermission)('application:withdraw'), async (req, res) => {
    try {
        const { reason } = req.body;
        const application = await BorrowApplicationService_1.BorrowApplicationService.withdrawApplication(req.params.id, reason || '用户撤回', req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: application
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/resubmit', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const application = await BorrowApplicationService_1.BorrowApplicationService.resubmitAfterWithdraw(req.params.id, req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: application
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/close', (0, auth_1.requirePermission)('application:close'), async (req, res) => {
    try {
        const { reason } = req.body;
        const application = await BorrowApplicationService_1.BorrowApplicationService.closeApplication(req.params.id, reason || '正常关闭', req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: application
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
        const details = await BorrowApplicationService_1.BorrowApplicationService.getApplicationWithDetails(req.params.id);
        res.json({
            success: true,
            data: details
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/comments', (0, auth_1.requirePermission)('comment:add'), async (req, res) => {
    try {
        const { commentType, content, isDecision = false, changes } = req.body;
        const comment = await BorrowApplicationService_1.BorrowApplicationService.addSupervisorComment(req.params.id, commentType, content, req.user.userId, req.user.userName, isDecision, changes);
        res.json({
            success: true,
            data: comment
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
