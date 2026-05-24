"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToCompensationQueue = addToCompensationQueue;
exports.processQueueItem = processQueueItem;
exports.manualTakeover = manualTakeover;
exports.compensateAndClose = compensateAndClose;
exports.closeQueueItem = closeQueueItem;
exports.getQueueStats = getQueueStats;
const models_1 = require("../models");
const types_1 = require("../models/types");
const queue_1 = require("../config/queue");
const auditService_1 = require("./auditService");
const failedRecordService_1 = require("./failedRecordService");
const sequelize_1 = require("sequelize");
async function addToCompensationQueue(params) {
    const queueNo = `QUE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const queueItem = await models_1.CompensationQueue.create({
        queueNo,
        source: params.source,
        sourceRecordId: params.sourceRecordId,
        sourceRecordNo: params.sourceRecordNo,
        signinType: params.signinType,
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        department: params.department,
        trainingId: params.trainingId,
        trainingName: params.trainingName,
        trainingDate: params.trainingDate,
        signinTime: params.signinTime,
        status: types_1.QueueStatus.PENDING,
        retryCategory: params.retryCategory,
        retryCount: 0,
        maxRetryCount: params.maxRetryCount || parseInt(process.env.MAX_RETRY_ATTEMPTS || '5'),
        errorMessage: params.errorMessage,
        errorStack: params.errorStack,
        originalData: params.originalData,
        isProxy: params.isProxy || false,
        proxyEmployeeId: params.proxyEmployeeId,
        proxyEmployeeName: params.proxyEmployeeName,
        createdBy: params.createdBy
    });
    await (0, auditService_1.createAuditLog)({
        action: types_1.AuditAction.QUEUE,
        source: params.source,
        recordType: 'compensation_queue',
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        newStatus: types_1.QueueStatus.PENDING,
        retryCategory: params.retryCategory,
        afterData: queueItem.toJSON(),
        changeReason: '加入补偿队列',
        operatorId: params.createdBy,
        operatorName: params.operatorName,
        operatorRole: params.operatorRole,
        ipAddress: params.ipAddress
    });
    await queue_1.signinQueue.add('process-signin', { queueId: queueItem.id }, {
        jobId: queueItem.queueNo,
        delay: params.retryCategory === types_1.RetryCategory.NETWORK_ERROR ? 60000 : 300000
    });
    return queueItem;
}
async function processQueueItem(queueId) {
    const queueItem = await models_1.CompensationQueue.findByPk(queueId);
    if (!queueItem) {
        throw new Error(`队列项 ${queueId} 不存在`);
    }
    if (queueItem.status === types_1.QueueStatus.SUCCESS ||
        queueItem.status === types_1.QueueStatus.COMPENSATED ||
        queueItem.status === types_1.QueueStatus.CLOSED) {
        return;
    }
    const oldStatus = queueItem.status;
    try {
        await queueItem.update({
            status: types_1.QueueStatus.PROCESSING,
            lastRetryTime: new Date(),
            retryCount: queueItem.retryCount + 1
        });
        const existingSignin = await models_1.SigninRecord.findOne({
            where: {
                employeeId: queueItem.employeeId,
                trainingId: queueItem.trainingId,
                trainingDate: queueItem.trainingDate
            }
        });
        if (existingSignin) {
            throw new Error(`该员工在本次培训中已有签到记录，可能存在重复签到`);
        }
        const signinNo = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const signinRecord = await models_1.SigninRecord.create({
            signinNo,
            employeeId: queueItem.employeeId,
            employeeName: queueItem.employeeName,
            department: queueItem.department,
            trainingId: queueItem.trainingId,
            trainingName: queueItem.trainingName,
            trainingDate: queueItem.trainingDate,
            signinTime: queueItem.signinTime || new Date(),
            signinType: queueItem.retryCount > 0 ? types_1.SigninType.RETRY : queueItem.signinType,
            source: queueItem.source,
            qrcodeId: queueItem.originalData?.qrcodeId,
            location: queueItem.originalData?.location,
            latitude: queueItem.originalData?.latitude,
            longitude: queueItem.originalData?.longitude,
            isProxy: queueItem.isProxy,
            proxyEmployeeId: queueItem.proxyEmployeeId,
            proxyEmployeeName: queueItem.proxyEmployeeName,
            isCompensated: queueItem.status === types_1.QueueStatus.MANUAL_REVIEW,
            compensationSource: queueItem.status === types_1.QueueStatus.MANUAL_REVIEW ? 'manual_review' : undefined,
            isValid: true
        });
        await queueItem.update({
            status: types_1.QueueStatus.SUCCESS,
            compensatedRecordId: signinRecord.id,
            correctedData: signinRecord.toJSON()
        });
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.COMPENSATE,
            source: queueItem.source,
            recordType: 'signin_record',
            recordId: signinRecord.id,
            recordNo: signinRecord.signinNo,
            queueId: queueItem.id,
            queueNo: queueItem.queueNo,
            oldStatus,
            newStatus: types_1.QueueStatus.SUCCESS,
            retryCategory: queueItem.retryCategory,
            beforeData: { oldStatus },
            afterData: signinRecord.toJSON(),
            changeReason: '签到补偿成功'
        });
    }
    catch (error) {
        const retryCategory = (0, failedRecordService_1.classifyError)(error);
        if (queueItem.retryCount >= queueItem.maxRetryCount) {
            await queueItem.update({
                status: types_1.QueueStatus.DEAD_LETTER,
                errorMessage: error.message,
                errorStack: error.stack
            });
            await (0, failedRecordService_1.createFailedRecord)({
                source: queueItem.source,
                recordType: 'compensation_queue',
                queueId: queueItem.id,
                queueNo: queueItem.queueNo,
                retryCategory,
                errorMessage: error.message,
                errorDetail: error.stack,
                originalData: queueItem.originalData,
                affectedReportFields: ['signinCount', 'attendanceRate'],
                createdBy: queueItem.createdBy
            });
            await (0, auditService_1.createAuditLog)({
                action: types_1.AuditAction.CLOSE,
                source: queueItem.source,
                recordType: 'compensation_queue',
                queueId: queueItem.id,
                queueNo: queueItem.queueNo,
                oldStatus,
                newStatus: types_1.QueueStatus.DEAD_LETTER,
                retryCategory,
                afterData: queueItem.toJSON(),
                changeReason: `重试${queueItem.maxRetryCount}次失败，进入死信队列`
            });
        }
        else {
            const nextRetryDelay = Math.pow(2, queueItem.retryCount) * 300000;
            const nextRetryTime = new Date(Date.now() + nextRetryDelay);
            await queueItem.update({
                status: types_1.QueueStatus.RETRYING,
                retryCategory,
                errorMessage: error.message,
                errorStack: error.stack,
                nextRetryTime
            });
            await queue_1.signinQueue.add('process-signin', { queueId: queueItem.id }, {
                jobId: `${queueItem.queueNo}-retry-${queueItem.retryCount}`,
                delay: nextRetryDelay
            });
            await (0, auditService_1.createAuditLog)({
                action: types_1.AuditAction.RETRY,
                source: queueItem.source,
                recordType: 'compensation_queue',
                queueId: queueItem.id,
                queueNo: queueItem.queueNo,
                oldStatus,
                newStatus: types_1.QueueStatus.RETRYING,
                retryCategory,
                afterData: queueItem.toJSON(),
                changeReason: `第${queueItem.retryCount}次重试失败，下次重试时间: ${nextRetryTime.toISOString()}`
            });
        }
        throw error;
    }
}
async function manualTakeover(queueId, params) {
    const queueItem = await models_1.CompensationQueue.findByPk(queueId);
    if (!queueItem)
        return null;
    const oldStatus = queueItem.status;
    await queueItem.update({
        status: types_1.QueueStatus.MANUAL_REVIEW,
        correctedData: params.correctedData,
        handledBy: params.handledBy,
        handledAt: new Date(),
        handleRemark: params.handleRemark
    });
    await (0, auditService_1.createAuditLog)({
        action: types_1.AuditAction.MANUAL_TAKEOVER,
        source: queueItem.source,
        recordType: 'compensation_queue',
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        oldStatus,
        newStatus: types_1.QueueStatus.MANUAL_REVIEW,
        retryCategory: queueItem.retryCategory,
        beforeData: { oldStatus },
        afterData: queueItem.toJSON(),
        changeReason: params.handleRemark,
        operatorId: params.handledBy,
        operatorName: params.handledByName,
        operatorRole: params.handledByRole,
        ipAddress: params.ipAddress
    });
    return queueItem;
}
async function compensateAndClose(queueId, params) {
    const queueItem = await models_1.CompensationQueue.findByPk(queueId);
    if (!queueItem)
        return null;
    if (queueItem.status !== types_1.QueueStatus.MANUAL_REVIEW) {
        throw new Error('只有人工审核状态的队列项才能补偿入账');
    }
    const oldStatus = queueItem.status;
    const signinNo = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const data = queueItem.correctedData || queueItem.originalData || {};
    const signinRecord = await models_1.SigninRecord.create({
        signinNo,
        employeeId: queueItem.employeeId,
        employeeName: queueItem.employeeName,
        department: queueItem.department,
        trainingId: queueItem.trainingId,
        trainingName: queueItem.trainingName,
        trainingDate: queueItem.trainingDate,
        signinTime: queueItem.signinTime || data.signinTime || new Date(),
        signinType: types_1.SigninType.COMPENSATION,
        source: queueItem.source,
        qrcodeId: data.qrcodeId,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        isProxy: queueItem.isProxy,
        proxyEmployeeId: queueItem.proxyEmployeeId,
        proxyEmployeeName: queueItem.proxyEmployeeName,
        isCompensated: true,
        compensationSource: 'manual_compensation',
        isValid: true
    });
    await queueItem.update({
        status: types_1.QueueStatus.COMPENSATED,
        compensatedRecordId: signinRecord.id,
        closedBy: params.closedBy,
        closedAt: new Date(),
        closeReason: params.closeReason
    });
    await (0, auditService_1.createAuditLog)({
        action: types_1.AuditAction.COMPENSATE,
        source: queueItem.source,
        recordType: 'signin_record',
        recordId: signinRecord.id,
        recordNo: signinRecord.signinNo,
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        oldStatus,
        newStatus: types_1.QueueStatus.COMPENSATED,
        retryCategory: queueItem.retryCategory,
        beforeData: { oldStatus },
        afterData: signinRecord.toJSON(),
        changeReason: params.closeReason,
        operatorId: params.closedBy,
        operatorName: params.closedByName,
        operatorRole: params.closedByRole,
        ipAddress: params.ipAddress
    });
    return queueItem;
}
async function closeQueueItem(queueId, params) {
    const queueItem = await models_1.CompensationQueue.findByPk(queueId);
    if (!queueItem)
        return null;
    const oldStatus = queueItem.status;
    await queueItem.update({
        status: types_1.QueueStatus.CLOSED,
        closedBy: params.closedBy,
        closedAt: new Date(),
        closeReason: params.closeReason
    });
    await (0, auditService_1.createAuditLog)({
        action: types_1.AuditAction.CLOSE,
        source: queueItem.source,
        recordType: 'compensation_queue',
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        oldStatus,
        newStatus: types_1.QueueStatus.CLOSED,
        retryCategory: queueItem.retryCategory,
        beforeData: { oldStatus },
        afterData: queueItem.toJSON(),
        changeReason: params.closeReason,
        operatorId: params.closedBy,
        operatorName: params.closedByName,
        operatorRole: params.closedByRole,
        ipAddress: params.ipAddress
    });
    return queueItem;
}
async function getQueueStats() {
    const [pending, processing, retrying, success, failed, deadLetter, manualReview, compensated, closed] = await Promise.all([
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.PENDING } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.PROCESSING } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.RETRYING } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.SUCCESS } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.FAILED } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.DEAD_LETTER } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.MANUAL_REVIEW } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.COMPENSATED } }),
        models_1.CompensationQueue.count({ where: { status: types_1.QueueStatus.CLOSED } })
    ]);
    const categoryStats = await models_1.CompensationQueue.findAll({
        attributes: ['retryCategory', [models_1.CompensationQueue.sequelize.fn('COUNT', models_1.CompensationQueue.sequelize.col('id')), 'count']],
        group: ['retryCategory'],
        where: {
            status: {
                [sequelize_1.Op.in]: [types_1.QueueStatus.PENDING, types_1.QueueStatus.RETRYING, types_1.QueueStatus.DEAD_LETTER, types_1.QueueStatus.MANUAL_REVIEW]
            }
        }
    });
    return {
        byStatus: {
            pending,
            processing,
            retrying,
            success,
            failed,
            deadLetter,
            manualReview,
            compensated,
            closed
        },
        byCategory: categoryStats.map((item) => ({
            category: item.retryCategory,
            count: parseInt(item.getDataValue('count'))
        })),
        totalAwaiting: pending + processing + retrying + manualReview
    };
}
//# sourceMappingURL=compensationQueueService.js.map