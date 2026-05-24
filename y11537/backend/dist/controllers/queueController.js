"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueList = getQueueList;
exports.getQueueDetail = getQueueDetail;
exports.handleManualTakeover = handleManualTakeover;
exports.handleCompensateAndClose = handleCompensateAndClose;
exports.handleCloseQueue = handleCloseQueue;
exports.handleRetry = handleRetry;
exports.getQueueStatistics = getQueueStatistics;
const models_1 = require("../models");
const types_1 = require("../models/types");
const compensationQueueService_1 = require("../services/compensationQueueService");
const auditService_1 = require("../services/auditService");
const permissions_1 = require("../config/permissions");
const sequelize_1 = require("sequelize");
async function getQueueList(req, res) {
    try {
        const user = req.user;
        const { status, retryCategory, source, employeeId, trainingId, startDate, endDate, page = 1, pageSize = 20 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (retryCategory)
            where.retryCategory = retryCategory;
        if (source)
            where.source = source;
        if (employeeId)
            where.employeeId = employeeId;
        if (trainingId)
            where.trainingId = trainingId;
        if (startDate && endDate) {
            where.createdAt = {
                [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        const { count, rows } = await models_1.CompensationQueue.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(pageSize),
            offset: (parseInt(page) - 1) * parseInt(pageSize)
        });
        const filteredRows = rows.map(row => (0, permissions_1.filterFieldsByRole)(row.toJSON(), user.role));
        res.json({
            success: true,
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            data: filteredRows
        });
    }
    catch (error) {
        console.error('获取队列列表错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function getQueueDetail(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const queueItem = await models_1.CompensationQueue.findByPk(id);
        if (!queueItem) {
            return res.status(404).json({
                success: false,
                error: '队列项不存在'
            });
        }
        const auditLogs = await (0, auditService_1.getAuditLogs)({ queueId: parseInt(id) });
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(queueItem.toJSON(), user.role),
            auditLogs
        });
    }
    catch (error) {
        console.error('获取队列详情错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function handleManualTakeover(req, res) {
    try {
        const user = req.user;
        if (user.role !== types_1.UserRole.SUPERVISOR && user.role !== types_1.UserRole.REVIEWER) {
            return res.status(403).json({
                success: false,
                error: '只有主管或复核权限才能人工接管'
            });
        }
        const { id } = req.params;
        const { correctedData, handleRemark } = req.body;
        const result = await (0, compensationQueueService_1.manualTakeover)(parseInt(id), {
            correctedData,
            handleRemark,
            handledBy: user.id,
            handledByName: user.realName,
            handledByRole: user.role,
            ipAddress: req.ip
        });
        if (!result) {
            return res.status(404).json({
                success: false,
                error: '队列项不存在'
            });
        }
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(result.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('人工接管错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function handleCompensateAndClose(req, res) {
    try {
        const user = req.user;
        if (user.role !== types_1.UserRole.SUPERVISOR) {
            return res.status(403).json({
                success: false,
                error: '只有主管权限才能补偿入账'
            });
        }
        const { id } = req.params;
        const { closeReason } = req.body;
        const result = await (0, compensationQueueService_1.compensateAndClose)(parseInt(id), {
            closeReason,
            closedBy: user.id,
            closedByName: user.realName,
            closedByRole: user.role,
            ipAddress: req.ip
        });
        if (!result) {
            return res.status(404).json({
                success: false,
                error: '队列项不存在'
            });
        }
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(result.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('补偿入账错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function handleCloseQueue(req, res) {
    try {
        const user = req.user;
        if (user.role !== types_1.UserRole.SUPERVISOR) {
            return res.status(403).json({
                success: false,
                error: '只有主管权限才能关闭队列项'
            });
        }
        const { id } = req.params;
        const { closeReason } = req.body;
        const result = await (0, compensationQueueService_1.closeQueueItem)(parseInt(id), {
            closeReason,
            closedBy: user.id,
            closedByName: user.realName,
            closedByRole: user.role,
            ipAddress: req.ip
        });
        if (!result) {
            return res.status(404).json({
                success: false,
                error: '队列项不存在'
            });
        }
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(result.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('关闭队列项错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function handleRetry(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const queueItem = await models_1.CompensationQueue.findByPk(id);
        if (!queueItem) {
            return res.status(404).json({
                success: false,
                error: '队列项不存在'
            });
        }
        if (queueItem.status === types_1.QueueStatus.SUCCESS ||
            queueItem.status === types_1.QueueStatus.COMPENSATED ||
            queueItem.status === types_1.QueueStatus.CLOSED) {
            return res.status(400).json({
                success: false,
                error: '该队列项已处理完成，无法重试'
            });
        }
        await queueItem.update({
            status: types_1.QueueStatus.PENDING,
            retryCount: 0,
            nextRetryTime: new Date()
        });
        const { signinQueue } = await Promise.resolve().then(() => __importStar(require('../config/queue')));
        await signinQueue.add('process-signin', { queueId: queueItem.id }, {
            jobId: `${queueItem.queueNo}-manual-retry`,
            delay: 0
        });
        res.json({
            success: true,
            message: '已加入重试队列',
            data: (0, permissions_1.filterFieldsByRole)(queueItem.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('手动重试错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function getQueueStatistics(req, res) {
    try {
        const stats = await (0, compensationQueueService_1.getQueueStats)();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('获取队列统计错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
//# sourceMappingURL=queueController.js.map