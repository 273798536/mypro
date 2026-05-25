"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExpressOrderService_1 = require("../services/ExpressOrderService");
const ExpressOrder_1 = require("../entities/ExpressOrder");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const data = req.body;
        if (!data.expressNo || !data.applicationId || !data.courierCompany) {
            res.status(400).json({
                success: false,
                error: '缺少必要参数: expressNo, applicationId, courierCompany'
            });
            return;
        }
        const order = await ExpressOrderService_1.ExpressOrderService.createExpressOrder({
            ...data,
            expressType: data.expressType || ExpressOrder_1.ExpressType.FORWARD
        }, req.user?.userId, req.user?.userName);
        res.json({
            success: true,
            data: order
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
        const orders = await ExpressOrderService_1.ExpressOrderService.getExpressOrdersByApplication(req.params.applicationId);
        res.json({
            success: true,
            data: orders
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
        const order = await ExpressOrderService_1.ExpressOrderService.getExpressOrderById(req.params.id);
        res.json({
            success: true,
            data: order
        });
    }
    catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:id/status', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const { status, trackingInfo } = req.body;
        if (!status) {
            res.status(400).json({
                success: false,
                error: '缺少状态参数'
            });
            return;
        }
        const order = await ExpressOrderService_1.ExpressOrderService.updateExpressStatus(req.params.id, status, trackingInfo, req.user?.userId, req.user?.userName);
        res.json({
            success: true,
            data: order
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
