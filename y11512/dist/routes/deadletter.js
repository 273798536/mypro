"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const DeadLetter_1 = require("../entities/DeadLetter");
const QueueService_1 = require("../services/QueueService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const repository = database_1.AppDataSource.getRepository(DeadLetter_1.DeadLetter);
router.get('/', (0, auth_1.requirePermission)('deadletter:view'), async (req, res) => {
    try {
        const status = req.query.status;
        const limit = parseInt(req.query.limit) || 50;
        const where = {};
        if (status) {
            where.status = status;
        }
        const deadLetters = await repository.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit
        });
        res.json({
            success: true,
            data: deadLetters
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/:deadLetterId', (0, auth_1.requirePermission)('deadletter:view'), async (req, res) => {
    try {
        const deadLetter = await repository.findOne({
            where: { deadLetterId: req.params.deadLetterId }
        });
        if (!deadLetter) {
            res.status(404).json({
                success: false,
                error: '死信记录不存在'
            });
            return;
        }
        res.json({
            success: true,
            data: deadLetter
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:deadLetterId/requeue', (0, auth_1.requirePermission)('deadletter:requeue'), async (req, res) => {
    try {
        const { note } = req.body;
        const task = await QueueService_1.QueueService.requeueFromDeadLetter(req.params.deadLetterId, req.user.userId, req.user.userName, note);
        res.json({
            success: true,
            data: {
                message: '死信已重新入队',
                taskId: task.taskId
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
router.post('/:deadLetterId/resolve', (0, auth_1.requirePermission)('deadletter:requeue'), async (req, res) => {
    try {
        const { note } = req.body;
        const deadLetter = await QueueService_1.QueueService.resolveDeadLetter(req.params.deadLetterId, req.user.userId, req.user.userName, note);
        res.json({
            success: true,
            data: deadLetter
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:deadLetterId/discard', (0, auth_1.requirePermission)('deadletter:requeue'), async (req, res) => {
    try {
        const { note } = req.body;
        const deadLetter = await QueueService_1.QueueService.discardDeadLetter(req.params.deadLetterId, req.user.userId, req.user.userName, note);
        res.json({
            success: true,
            data: deadLetter
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
