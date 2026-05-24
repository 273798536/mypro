"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRegistration = submitRegistration;
exports.submitSignin = submitSignin;
exports.submitHomework = submitHomework;
exports.submitPriceAdjustment = submitPriceAdjustment;
exports.submitHistoryArchive = submitHistoryArchive;
const models_1 = require("../models");
const types_1 = require("../models/types");
const compensationQueueService_1 = require("../services/compensationQueueService");
const auditService_1 = require("../services/auditService");
const failedRecordService_1 = require("../services/failedRecordService");
const permissions_1 = require("../config/permissions");
async function submitRegistration(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        const registrationNo = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const registration = await models_1.TrainingRegistration.create({
            ...data,
            registrationNo,
            source: types_1.DataSource.REGISTRATION_FORM,
            createdBy: user.id
        });
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.SUBMIT,
            source: types_1.DataSource.REGISTRATION_FORM,
            recordType: 'training_registration',
            recordId: registration.id,
            recordNo: registration.registrationNo,
            afterData: registration.toJSON(),
            changeReason: '提交报名表',
            operatorId: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(registration.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('提交报名表错误:', error);
        const retryCategory = (0, failedRecordService_1.classifyError)(error);
        await (0, failedRecordService_1.createFailedRecord)({
            source: types_1.DataSource.REGISTRATION_FORM,
            recordType: 'training_registration',
            retryCategory,
            errorMessage: error.message,
            errorDetail: error.stack,
            originalData: req.body,
            createdBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            error: error.message,
            retryCategory
        });
    }
}
async function submitSignin(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        const existingSignin = await models_1.SigninRecord.findOne({
            where: {
                employeeId: data.employeeId,
                trainingId: data.trainingId,
                trainingDate: data.trainingDate
            }
        });
        if (existingSignin) {
            const retryCategory = types_1.RetryCategory.DUPLICATE_RECORD;
            const queueItem = await (0, compensationQueueService_1.addToCompensationQueue)({
                source: types_1.DataSource.SIGNIN_QRCODE,
                sourceRecordNo: existingSignin.signinNo,
                signinType: types_1.SigninType.NORMAL,
                employeeId: data.employeeId,
                employeeName: data.employeeName,
                department: data.department,
                trainingId: data.trainingId,
                trainingName: data.trainingName,
                trainingDate: data.trainingDate,
                signinTime: data.signinTime,
                retryCategory,
                errorMessage: '检测到重复签到记录，已加入补偿队列',
                originalData: data,
                isProxy: data.isProxy,
                proxyEmployeeId: data.proxyEmployeeId,
                proxyEmployeeName: data.proxyEmployeeName,
                createdBy: user.id,
                operatorName: user.realName,
                operatorRole: user.role,
                ipAddress: req.ip
            });
            return res.json({
                success: true,
                warning: '检测到重复签到，已加入补偿队列等待处理',
                queueNo: queueItem.queueNo,
                data: (0, permissions_1.filterFieldsByRole)(queueItem.toJSON(), user.role)
            });
        }
        const signinNo = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const signin = await models_1.SigninRecord.create({
            ...data,
            signinNo,
            source: types_1.DataSource.SIGNIN_QRCODE,
            signinType: types_1.SigninType.NORMAL,
            createdBy: user.id
        });
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.SUBMIT,
            source: types_1.DataSource.SIGNIN_QRCODE,
            recordType: 'signin_record',
            recordId: signin.id,
            recordNo: signin.signinNo,
            afterData: signin.toJSON(),
            changeReason: '提交签到记录',
            operatorId: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(signin.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('提交签到错误:', error);
        const retryCategory = (0, failedRecordService_1.classifyError)(error);
        const queueItem = await (0, compensationQueueService_1.addToCompensationQueue)({
            source: types_1.DataSource.SIGNIN_QRCODE,
            signinType: types_1.SigninType.NORMAL,
            employeeId: req.body.employeeId,
            employeeName: req.body.employeeName,
            department: req.body.department,
            trainingId: req.body.trainingId,
            trainingName: req.body.trainingName,
            trainingDate: req.body.trainingDate,
            signinTime: req.body.signinTime,
            retryCategory,
            errorMessage: error.message,
            errorStack: error.stack,
            originalData: req.body,
            isProxy: req.body.isProxy,
            proxyEmployeeId: req.body.proxyEmployeeId,
            proxyEmployeeName: req.body.proxyEmployeeName,
            createdBy: req.user?.id,
            operatorName: req.user?.realName,
            operatorRole: req.user?.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            warning: '签到处理异常，已加入补偿队列',
            queueNo: queueItem.queueNo,
            error: error.message
        });
    }
}
async function submitHomework(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        const homeworkNo = `HW-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const homework = await models_1.Homework.create({
            ...data,
            homeworkNo,
            source: types_1.DataSource.HOMEWORK,
            createdBy: user.id
        });
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.SUBMIT,
            source: types_1.DataSource.HOMEWORK,
            recordType: 'homework',
            recordId: homework.id,
            recordNo: homework.homeworkNo,
            afterData: homework.toJSON(),
            changeReason: '提交课后作业',
            operatorId: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(homework.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('提交作业错误:', error);
        const retryCategory = (0, failedRecordService_1.classifyError)(error);
        await (0, failedRecordService_1.createFailedRecord)({
            source: types_1.DataSource.HOMEWORK,
            recordType: 'homework',
            retryCategory,
            errorMessage: error.message,
            errorDetail: error.stack,
            originalData: req.body,
            createdBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            error: error.message,
            retryCategory
        });
    }
}
async function submitPriceAdjustment(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        const adjustmentNo = `PRC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const adjustment = await models_1.ManualPriceAdjustment.create({
            ...data,
            adjustmentNo,
            source: types_1.DataSource.MANUAL_PRICE,
            isApproved: false,
            createdBy: user.id
        });
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.SUBMIT,
            source: types_1.DataSource.MANUAL_PRICE,
            recordType: 'manual_price_adjustment',
            recordId: adjustment.id,
            recordNo: adjustment.adjustmentNo,
            afterData: adjustment.toJSON(),
            changeReason: '提交手工改价申请',
            operatorId: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            data: (0, permissions_1.filterFieldsByRole)(adjustment.toJSON(), user.role)
        });
    }
    catch (error) {
        console.error('提交改价错误:', error);
        const retryCategory = (0, failedRecordService_1.classifyError)(error);
        await (0, failedRecordService_1.createFailedRecord)({
            source: types_1.DataSource.MANUAL_PRICE,
            recordType: 'manual_price_adjustment',
            retryCategory,
            errorMessage: error.message,
            errorDetail: error.stack,
            originalData: req.body,
            createdBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            error: error.message,
            retryCategory
        });
    }
}
async function submitHistoryArchive(req, res) {
    try {
        const data = req.body;
        const user = req.user;
        const results = [];
        if (data.registrations) {
            for (const reg of data.registrations) {
                const registrationNo = `REG-ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                const registration = await models_1.TrainingRegistration.create({
                    ...reg,
                    registrationNo,
                    source: types_1.DataSource.HISTORY_ARCHIVE,
                    createdBy: user.id
                });
                results.push({ type: 'registration', id: registration.id, no: registrationNo });
            }
        }
        if (data.signins) {
            for (const sig of data.signins) {
                try {
                    const signinNo = `SIG-ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                    const signin = await models_1.SigninRecord.create({
                        ...sig,
                        signinNo,
                        source: types_1.DataSource.HISTORY_ARCHIVE,
                        signinType: types_1.SigninType.MANUAL,
                        createdBy: user.id
                    });
                    results.push({ type: 'signin', id: signin.id, no: signinNo });
                }
                catch (signinError) {
                    const retryCategory = (0, failedRecordService_1.classifyError)(signinError);
                    await (0, compensationQueueService_1.addToCompensationQueue)({
                        source: types_1.DataSource.HISTORY_ARCHIVE,
                        signinType: types_1.SigninType.MANUAL,
                        employeeId: sig.employeeId,
                        employeeName: sig.employeeName,
                        department: sig.department,
                        trainingId: sig.trainingId,
                        trainingName: sig.trainingName,
                        trainingDate: sig.trainingDate,
                        signinTime: sig.signinTime,
                        retryCategory,
                        errorMessage: signinError.message,
                        originalData: sig,
                        createdBy: user.id,
                        operatorName: user.realName,
                        operatorRole: user.role,
                        ipAddress: req.ip
                    });
                    results.push({ type: 'signin', status: 'queued', error: signinError.message });
                }
            }
        }
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.SUBMIT,
            source: types_1.DataSource.HISTORY_ARCHIVE,
            recordType: 'history_archive',
            afterData: { results, count: results.length },
            changeReason: '导入历史压缩包数据',
            operatorId: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            imported: results.length,
            results
        });
    }
    catch (error) {
        console.error('导入历史数据错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
//# sourceMappingURL=dataController.js.map