"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const QueueService_1 = require("../services/QueueService");
const TaskProcessorService_1 = require("../services/TaskProcessorService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/stats', (0, auth_1.requirePermission)('queue:view'), async (req, res) => {
    try {
        const stats = await QueueService_1.QueueService.getTaskStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/pending', (0, auth_1.requirePermission)('queue:view'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const tasks = await QueueService_1.QueueService.getPendingTasks(limit);
        res.json({
            success: true,
            data: tasks
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/enqueue', (0, auth_1.requirePermission)('application:submit'), async (req, res) => {
    try {
        const { applicationId, payloadType, payload, maxRetryCount, retryIntervalSeconds } = req.body;
        if (!applicationId || !payloadType || !payload) {
            res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
            return;
        }
        const task = await QueueService_1.QueueService.enqueue({
            applicationId,
            payloadType: payloadType,
            payload,
            maxRetryCount,
            retryIntervalSeconds,
            operatorId: req.user?.userId,
            operatorName: req.user?.userName
        });
        res.json({
            success: true,
            data: task
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:taskId/freeze', (0, auth_1.requirePermission)('queue:freeze'), async (req, res) => {
    try {
        const { reason } = req.body;
        const task = await QueueService_1.QueueService.freezeTask(req.params.taskId, req.user.userId, req.user.userName, reason || '导出前冻结');
        res.json({
            success: true,
            data: task
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:taskId/unfreeze', (0, auth_1.requirePermission)('queue:freeze'), async (req, res) => {
    try {
        const task = await QueueService_1.QueueService.unfreezeTask(req.params.taskId, req.user.userId, req.user.userName);
        res.json({
            success: true,
            data: task
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:taskId/manual', (0, auth_1.requirePermission)('queue:manual'), async (req, res) => {
    try {
        const { note, markAsSuccess = false } = req.body;
        const task = await QueueService_1.QueueService.manualOverride(req.params.taskId, req.user.userId, req.user.userName, note || '人工改判', markAsSuccess);
        res.json({
            success: true,
            data: task
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.post('/:taskId/process', (0, auth_1.requirePermission)('queue:manual'), async (req, res) => {
    try {
        const task = await QueueService_1.QueueService.getTaskById(req.params.taskId);
        if (!task) {
            res.status(404).json({
                success: false,
                error: '任务不存在'
            });
            return;
        }
        const result = await QueueService_1.QueueService.processTask(req.params.taskId, async (payload) => {
            return await TaskProcessorService_1.TaskProcessorService.processTask(task.payloadType, payload, task.applicationId, req.user?.userId, req.user?.userName);
        }, req.user?.userId);
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
router.post('/process-batch', (0, auth_1.requirePermission)('queue:manual'), async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 10;
        const tasks = await QueueService_1.QueueService.getPendingTasks(limit);
        const results = [];
        for (const task of tasks) {
            try {
                const result = await QueueService_1.QueueService.processTask(task.taskId, async (payload) => {
                    return await TaskProcessorService_1.TaskProcessorService.processTask(task.payloadType, payload, task.applicationId, req.user?.userId, req.user?.userName);
                }, req.user?.userId);
                results.push({
                    taskId: task.taskId,
                    success: true,
                    result
                });
            }
            catch (error) {
                results.push({
                    taskId: task.taskId,
                    success: false,
                    error: error.message
                });
            }
        }
        res.json({
            success: true,
            data: {
                processed: results.length,
                results
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
exports.default = router;
