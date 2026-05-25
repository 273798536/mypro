"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSigninReport = getSigninReport;
exports.getFailedRecords = getFailedRecords;
exports.getHrbpDashboard = getHrbpDashboard;
exports.exportSigninReport = exportSigninReport;
exports.exportFailedRecords = exportFailedRecords;
exports.getRecordDiff = getRecordDiff;
exports.resolveFailedRecord = resolveFailedRecord;
const models_1 = require("../models");
const types_1 = require("../models/types");
const auditService_1 = require("../services/auditService");
const permissions_1 = require("../config/permissions");
const sequelize_1 = require("sequelize");
const exceljs_1 = __importDefault(require("exceljs"));
async function getSigninReport(req, res) {
    try {
        const user = req.user;
        const { startDate, endDate, department, trainingId, source, page = 1, pageSize = 50 } = req.query;
        const where = {
            isValid: true
        };
        if (startDate && endDate) {
            where.trainingDate = {
                [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        if (department)
            where.department = department;
        if (trainingId)
            where.trainingId = trainingId;
        if (source)
            where.source = source;
        const { count, rows } = await models_1.SigninRecord.findAndCountAll({
            where,
            order: [['trainingDate', 'DESC'], ['signinTime', 'DESC']],
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
        console.error('获取签到报表错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function getFailedRecords(req, res) {
    try {
        const user = req.user;
        const { source, retryCategory, isResolved, startDate, endDate, page = 1, pageSize = 50 } = req.query;
        const where = {};
        if (source)
            where.source = source;
        if (retryCategory)
            where.retryCategory = retryCategory;
        if (isResolved !== undefined)
            where.isResolved = isResolved === 'true';
        if (startDate && endDate) {
            where.createdAt = {
                [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        const { count, rows } = await models_1.FailedRecord.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(pageSize),
            offset: (parseInt(page) - 1) * parseInt(pageSize)
        });
        res.json({
            success: true,
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            data: rows
        });
    }
    catch (error) {
        console.error('获取失败记录错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function getHrbpDashboard(req, res) {
    try {
        const user = req.user;
        const queueStats = await models_1.CompensationQueue.findAll({
            attributes: [
                'retryCategory',
                'status',
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
            ],
            where: {
                status: {
                    [sequelize_1.Op.in]: [
                        types_1.QueueStatus.PENDING,
                        types_1.QueueStatus.PROCESSING,
                        types_1.QueueStatus.RETRYING,
                        types_1.QueueStatus.DEAD_LETTER,
                        types_1.QueueStatus.MANUAL_REVIEW
                    ]
                }
            },
            group: ['retryCategory', 'status'],
            order: [['retryCategory', 'ASC']]
        });
        const statusBreakdown = await models_1.CompensationQueue.findAll({
            attributes: [
                'status',
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
            ],
            group: ['status']
        });
        const today = new Date();
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dailyTrend = await models_1.CompensationQueue.findAll({
            attributes: [
                [(0, sequelize_1.fn)('DATE', (0, sequelize_1.col)('created_at')), 'date'],
                'status',
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
            ],
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: last7Days
                }
            },
            group: [(0, sequelize_1.fn)('DATE', (0, sequelize_1.col)('created_at')), 'status'],
            order: [[(0, sequelize_1.fn)('DATE', (0, sequelize_1.col)('created_at')), 'DESC']]
        });
        const recentDeadLetters = await models_1.CompensationQueue.findAll({
            where: { status: types_1.QueueStatus.DEAD_LETTER },
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        const recentManualReviews = await models_1.CompensationQueue.findAll({
            where: { status: types_1.QueueStatus.MANUAL_REVIEW },
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        res.json({
            success: true,
            focusFields: permissions_1.hrbpFocusFields,
            data: {
                byCategoryAndStatus: queueStats.map(s => ({
                    retryCategory: s.retryCategory,
                    status: s.status,
                    count: parseInt(s.getDataValue('count'))
                })),
                statusBreakdown: statusBreakdown.map(s => ({
                    status: s.status,
                    count: parseInt(s.getDataValue('count'))
                })),
                dailyTrend: dailyTrend.map(t => ({
                    date: t.getDataValue('date'),
                    status: t.status,
                    count: parseInt(t.getDataValue('count'))
                })),
                recentDeadLetters: recentDeadLetters.map(r => (0, permissions_1.filterFieldsByRole)(r.toJSON(), user.role)),
                recentManualReviews: recentManualReviews.map(r => (0, permissions_1.filterFieldsByRole)(r.toJSON(), user.role))
            }
        });
    }
    catch (error) {
        console.error('获取HRBP仪表盘错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function exportSigninReport(req, res) {
    try {
        const user = req.user;
        const { startDate, endDate, department, trainingId, source } = req.query;
        const where = { isValid: true };
        if (startDate && endDate) {
            where.trainingDate = { [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)] };
        }
        if (department)
            where.department = department;
        if (trainingId)
            where.trainingId = trainingId;
        if (source)
            where.source = source;
        const records = await models_1.SigninRecord.findAll({
            where,
            order: [['trainingDate', 'DESC'], ['signinTime', 'DESC']]
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('签到报表');
        worksheet.columns = [
            { header: '签到编号', key: 'signinNo', width: 20 },
            { header: '员工ID', key: 'employeeId', width: 15 },
            { header: '员工姓名', key: 'employeeName', width: 15 },
            { header: '部门', key: 'department', width: 20 },
            { header: '培训ID', key: 'trainingId', width: 15 },
            { header: '培训名称', key: 'trainingName', width: 30 },
            { header: '培训日期', key: 'trainingDate', width: 12 },
            { header: '签到时间', key: 'signinTime', width: 20 },
            { header: '签到类型', key: 'signinType', width: 12 },
            { header: '数据来源', key: 'source', width: 15 },
            { header: '是否代签', key: 'isProxy', width: 10 },
            { header: '是否补偿', key: 'isCompensated', width: 12 },
            { header: '是否有效', key: 'isValid', width: 10 },
            { header: '创建时间', key: 'createdAt', width: 20 }
        ];
        records.forEach(record => {
            worksheet.addRow({
                signinNo: record.signinNo,
                employeeId: record.employeeId,
                employeeName: record.employeeName,
                department: record.department,
                trainingId: record.trainingId,
                trainingName: record.trainingName,
                trainingDate: record.trainingDate,
                signinTime: record.signinTime,
                signinType: record.signinType,
                source: record.source,
                isProxy: record.isProxy ? '是' : '否',
                isCompensated: record.isCompensated ? '是' : '否',
                isValid: record.isValid ? '是' : '否',
                createdAt: record.createdAt
            });
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=signin-report-${new Date().toISOString().split('T')[0]}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error('导出签到报表错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function exportFailedRecords(req, res) {
    try {
        const { source, retryCategory, isResolved, startDate, endDate } = req.query;
        const where = {};
        if (source)
            where.source = source;
        if (retryCategory)
            where.retryCategory = retryCategory;
        if (isResolved !== undefined)
            where.isResolved = isResolved === 'true';
        if (startDate && endDate) {
            where.createdAt = { [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)] };
        }
        const records = await models_1.FailedRecord.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('失败记录');
        worksheet.columns = [
            { header: '失败编号', key: 'failureNo', width: 20 },
            { header: '数据来源', key: 'source', width: 15 },
            { header: '记录类型', key: 'recordType', width: 15 },
            { header: '错误分类', key: 'retryCategory', width: 20 },
            { header: '错误信息', key: 'errorMessage', width: 40 },
            { header: '原始数据', key: 'originalData', width: 50 },
            { header: '是否已解决', key: 'isResolved', width: 12 },
            { header: '解决方式', key: 'resolutionMethod', width: 20 },
            { header: '解决备注', key: 'resolutionRemark', width: 40 },
            { header: '创建时间', key: 'createdAt', width: 20 }
        ];
        records.forEach(record => {
            worksheet.addRow({
                failureNo: record.failureNo,
                source: record.source,
                recordType: record.recordType,
                retryCategory: record.retryCategory,
                errorMessage: record.errorMessage,
                originalData: JSON.stringify(record.originalData).substring(0, 100),
                isResolved: record.isResolved ? '是' : '否',
                resolutionMethod: record.resolutionMethod || '',
                resolutionRemark: record.resolutionRemark || '',
                createdAt: record.createdAt
            });
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=failed-records-${new Date().toISOString().split('T')[0]}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error('导出失败记录错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function getRecordDiff(req, res) {
    try {
        const user = req.user;
        const { recordType, recordId } = req.params;
        const auditLogs = await (0, auditService_1.getAuditLogs)({
            recordId: parseInt(recordId),
            startTime: new Date(0)
        });
        const beforeAfterPairs = auditLogs
            .filter(log => log.beforeData || log.afterData)
            .map(log => ({
            logId: log.id,
            action: log.action,
            operator: log.operatorName,
            changeReason: log.changeReason,
            beforeData: log.beforeData,
            afterData: log.afterData,
            createdAt: log.createdAt
        }));
        res.json({
            success: true,
            data: beforeAfterPairs
        });
    }
    catch (error) {
        console.error('获取记录差异错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
async function resolveFailedRecord(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const { resolutionMethod, resolutionRemark } = req.body;
        if (!resolutionRemark) {
            return res.status(400).json({
                success: false,
                error: '解决备注不能为空'
            });
        }
        const failedRecord = await models_1.FailedRecord.findByPk(parseInt(id));
        if (!failedRecord) {
            return res.status(404).json({
                success: false,
                error: '失败记录不存在'
            });
        }
        if (failedRecord.isResolved) {
            return res.status(400).json({
                success: false,
                error: '该记录已被解决'
            });
        }
        const beforeData = failedRecord.toJSON();
        await failedRecord.update({
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: user.id,
            resolutionMethod: resolutionMethod || 'manual_fix',
            resolutionRemark
        });
        await (0, auditService_1.createAuditLog)({
            action: types_1.AuditAction.UPDATE,
            source: failedRecord.source,
            recordType: 'failed_record',
            recordId: failedRecord.id,
            recordNo: failedRecord.failureNo,
            beforeData,
            afterData: failedRecord.toJSON(),
            changeReason: resolutionRemark,
            operatorId: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
        });
        res.json({
            success: true,
            message: '失败记录已标记为解决',
            data: failedRecord
        });
    }
    catch (error) {
        console.error('解决失败记录错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
//# sourceMappingURL=reportController.js.map