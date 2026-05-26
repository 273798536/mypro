"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supervisorRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const config_1 = require("../config");
const json2csv_1 = require("json2csv");
const router = (0, express_1.Router)();
exports.supervisorRouter = router;
router.use(auth_1.authMiddleware);
router.use((0, auth_1.requirePermission)('export:*'));
router.get('/freeze-summary', async (req, res) => {
    try {
        const { startDate, endDate, storeId } = req.query;
        const where = { status: config_1.CONFIG.BATCH_STATUS.FROZEN };
        if (storeId)
            where.storeId = storeId;
        if (startDate || endDate) {
            where.frozenAt = {};
            if (startDate)
                where.frozenAt.gte = new Date(startDate);
            if (endDate)
                where.frozenAt.lte = new Date(endDate);
        }
        const frozenBatches = await prisma_1.prisma.batch.findMany({
            where,
            orderBy: { frozenAt: 'desc' },
            include: {
                records: {
                    select: {
                        id: true,
                        memberId: true,
                        memberName: true,
                        amount: true,
                        status: true,
                        dirtyType: true,
                        dirtyRemark: true
                    }
                },
                statusHistories: {
                    orderBy: { operatedAt: 'asc' },
                    take: 10
                }
            }
        });
        const result = frozenBatches.map(batch => ({
            batchNo: batch.batchNo,
            title: batch.title,
            recordType: batch.recordType,
            storeId: batch.storeId,
            beforeFreezeStatus: batch.statusHistories.find(h => h.toStatus === config_1.CONFIG.BATCH_STATUS.FROZEN)?.fromStatus || 'unknown',
            frozenAt: batch.frozenAt,
            frozenBy: batch.frozenBy,
            frozenRemark: batch.frozenRemark,
            totalAmount: batch.totalAmount.toString(),
            totalCount: batch.totalCount,
            dirtyCount: batch.dirtyCount,
            records: batch.records.map(r => ({
                memberId: r.memberId,
                memberName: r.memberName,
                amount: r.amount.toString(),
                status: r.status,
                dirtyType: r.dirtyType,
                dirtyRemark: r.dirtyRemark
            }))
        }));
        res.json({
            total: result.length,
            totalAmount: result.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0).toFixed(2),
            data: result
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/export/frozen-batches', async (req, res) => {
    try {
        const { startDate, endDate, storeId } = req.query;
        const where = { status: config_1.CONFIG.BATCH_STATUS.FROZEN };
        if (storeId)
            where.storeId = storeId;
        if (startDate || endDate) {
            where.frozenAt = {};
            if (startDate)
                where.frozenAt.gte = new Date(startDate);
            if (endDate)
                where.frozenAt.lte = new Date(endDate);
        }
        const frozenBatches = await prisma_1.prisma.batch.findMany({
            where,
            include: {
                records: true,
                statusHistories: {
                    orderBy: { operatedAt: 'asc' }
                }
            }
        });
        const exportData = frozenBatches.flatMap(batch => {
            const freezeHistory = batch.statusHistories.find(h => h.toStatus === config_1.CONFIG.BATCH_STATUS.FROZEN);
            return batch.records.map(record => ({
                批次编号: batch.batchNo,
                批次标题: batch.title,
                记录类型: batch.recordType,
                门店ID: batch.storeId,
                冻结前状态: freezeHistory?.fromStatus || '',
                冻结时间: batch.frozenAt?.toISOString() || '',
                冻结操作人: batch.frozenBy || '',
                冻结原因: batch.frozenRemark || '',
                人工理由: freezeHistory?.reason || '',
                会员ID: record.memberId || '',
                会员姓名: record.memberName || '',
                手机号: record.phone || '',
                金额: record.amount.toString(),
                数量: record.quantity || '',
                交易日期: record.transactionDate?.toISOString() || '',
                记录状态: record.status,
                脏数据类型: record.dirtyType || '',
                脏数据备注: record.dirtyRemark || '',
                数据来源: record.source
            }));
        });
        const parser = new json2csv_1.Parser();
        const csv = parser.parse(exportData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="frozen-batches-${Date.now()}.csv"`);
        res.send('\uFEFF' + csv);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/export/settlement-summary', async (req, res) => {
    try {
        const { startDate, endDate, storeId } = req.query;
        const where = { status: { in: [config_1.CONFIG.BATCH_STATUS.SETTLED, config_1.CONFIG.BATCH_STATUS.REVOKED] } };
        if (storeId)
            where.storeId = storeId;
        if (startDate || endDate) {
            where.settledAt = {};
            if (startDate)
                where.settledAt.gte = new Date(startDate);
            if (endDate)
                where.settledAt.lte = new Date(endDate);
        }
        const batches = await prisma_1.prisma.batch.findMany({
            where,
            include: {
                records: true,
                statusHistories: true
            }
        });
        const exportData = batches.map(batch => {
            const histories = batch.statusHistories;
            const beforeFrozen = histories.find(h => h.toStatus === config_1.CONFIG.BATCH_STATUS.FROZEN)?.fromStatus;
            const afterFrozen = batch.status;
            return {
                批次编号: batch.batchNo,
                批次标题: batch.title,
                记录类型: batch.recordType,
                门店ID: batch.storeId,
                总金额: batch.totalAmount.toString(),
                总记录数: batch.totalCount,
                有效记录数: batch.validCount,
                异常记录数: batch.dirtyCount,
                冻结前状态: beforeFrozen || '',
                当前状态: afterFrozen,
                冻结时间: batch.frozenAt?.toISOString() || '',
                冻结原因: batch.frozenRemark || '',
                结算时间: batch.settledAt?.toISOString() || '',
                结算备注: batch.settleRemark || '',
                创建人: batch.createdBy,
                复核人: batch.reviewedBy || ''
            };
        });
        const parser = new json2csv_1.Parser();
        const csv = parser.parse(exportData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="settlement-summary-${Date.now()}.csv"`);
        res.send('\uFEFF' + csv);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, action, userId } = req.query;
        const where = {};
        if (action)
            where.action = action;
        if (userId)
            where.userId = userId;
        const logs = await prisma_1.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
                user: { select: { username: true, role: true } }
            }
        });
        const total = await prisma_1.prisma.auditLog.count({ where });
        res.json({
            data: logs,
            total,
            page: Number(page),
            limit: Number(limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const [byStatus, byType, byStore] = await Promise.all([
            prisma_1.prisma.batch.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
            prisma_1.prisma.batch.groupBy({ by: ['recordType'], _count: true, _sum: { totalAmount: true } }),
            prisma_1.prisma.batch.groupBy({ by: ['storeId'], _count: true, _sum: { totalAmount: true } })
        ]);
        const dirtyRecords = await prisma_1.prisma.record.groupBy({
            by: ['dirtyType'],
            where: { status: config_1.CONFIG.RECORD_STATUS.DIRTY },
            _count: true
        });
        res.json({
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count, amount: s._sum.totalAmount?.toString() || '0' })),
            byType: byType.map(t => ({ type: t.recordType, count: t._count, amount: t._sum.totalAmount?.toString() || '0' })),
            byStore: byStore.map(s => ({ storeId: s.storeId, count: s._count, amount: s._sum.totalAmount?.toString() || '0' })),
            dirtyRecords: dirtyRecords.map(d => ({ type: d.dirtyType, count: d._count }))
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
//# sourceMappingURL=supervisor.js.map