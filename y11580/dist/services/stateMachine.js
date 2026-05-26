"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransitionBatch = canTransitionBatch;
exports.canTransitionRecord = canTransitionRecord;
exports.transitionBatch = transitionBatch;
exports.transitionRecord = transitionRecord;
exports.recalculateBatchStats = recalculateBatchStats;
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
const BATCH_TRANSITIONS = [
    { from: null, to: config_1.CONFIG.BATCH_STATUS.DRAFT, allowedRoles: [config_1.CONFIG.ROLES.DATA_ENTRY] },
    { from: config_1.CONFIG.BATCH_STATUS.DRAFT, to: config_1.CONFIG.BATCH_STATUS.SUBMITTED, allowedRoles: [config_1.CONFIG.ROLES.DATA_ENTRY] },
    { from: config_1.CONFIG.BATCH_STATUS.SUBMITTED, to: config_1.CONFIG.BATCH_STATUS.REVIEWING, allowedRoles: [config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: config_1.CONFIG.BATCH_STATUS.REVIEWING, to: config_1.CONFIG.BATCH_STATUS.REVIEWED, allowedRoles: [config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: [config_1.CONFIG.BATCH_STATUS.SUBMITTED, config_1.CONFIG.BATCH_STATUS.REVIEWING, config_1.CONFIG.BATCH_STATUS.REVIEWED], to: config_1.CONFIG.BATCH_STATUS.FROZEN, allowedRoles: [config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: config_1.CONFIG.BATCH_STATUS.FROZEN, to: config_1.CONFIG.BATCH_STATUS.SETTLED, allowedRoles: [config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: [config_1.CONFIG.BATCH_STATUS.REVIEWED, config_1.CONFIG.BATCH_STATUS.FROZEN], to: config_1.CONFIG.BATCH_STATUS.REVOKED, allowedRoles: [config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: config_1.CONFIG.BATCH_STATUS.SETTLED, to: config_1.CONFIG.BATCH_STATUS.ARCHIVED, allowedRoles: [config_1.CONFIG.ROLES.SUPERVISOR] },
];
const RECORD_TRANSITIONS = [
    { from: null, to: config_1.CONFIG.RECORD_STATUS.PENDING, allowedRoles: [config_1.CONFIG.ROLES.DATA_ENTRY] },
    { from: config_1.CONFIG.RECORD_STATUS.PENDING, to: config_1.CONFIG.RECORD_STATUS.VALID, allowedRoles: [config_1.CONFIG.ROLES.DATA_ENTRY, config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: config_1.CONFIG.RECORD_STATUS.PENDING, to: config_1.CONFIG.RECORD_STATUS.DIRTY, allowedRoles: [config_1.CONFIG.ROLES.DATA_ENTRY, config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: config_1.CONFIG.RECORD_STATUS.DIRTY, to: config_1.CONFIG.RECORD_STATUS.RESOLVED, allowedRoles: [config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: [config_1.CONFIG.RECORD_STATUS.VALID, config_1.CONFIG.RECORD_STATUS.RESOLVED], to: config_1.CONFIG.RECORD_STATUS.REVIEWED, allowedRoles: [config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
    { from: [config_1.CONFIG.RECORD_STATUS.VALID, config_1.CONFIG.RECORD_STATUS.REVIEWED, config_1.CONFIG.RECORD_STATUS.RESOLVED], to: config_1.CONFIG.RECORD_STATUS.FROZEN, allowedRoles: [config_1.CONFIG.ROLES.REVIEWER, config_1.CONFIG.ROLES.SUPERVISOR] },
];
function canTransitionBatch(currentStatus, targetStatus, userRole) {
    for (const transition of BATCH_TRANSITIONS) {
        const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
        if (fromStates.includes(currentStatus) && transition.to === targetStatus) {
            return transition.allowedRoles.includes(userRole);
        }
    }
    return false;
}
function canTransitionRecord(currentStatus, targetStatus, userRole) {
    for (const transition of RECORD_TRANSITIONS) {
        const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
        if (fromStates.includes(currentStatus) && transition.to === targetStatus) {
            return transition.allowedRoles.includes(userRole);
        }
    }
    return false;
}
async function transitionBatch(batchId, targetStatus, userId, userRole, reason) {
    const batch = await prisma_1.prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch)
        throw new Error('批次不存在');
    const currentStatus = batch.status;
    if (!canTransitionBatch(currentStatus, targetStatus, userRole)) {
        throw new Error(`不允许从 ${currentStatus} 转换到 ${targetStatus}`);
    }
    return await prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.batch.update({
            where: { id: batchId },
            data: {
                status: targetStatus,
                ...(targetStatus === config_1.CONFIG.BATCH_STATUS.FROZEN && {
                    frozenAt: new Date(),
                    frozenBy: userId,
                    frozenRemark: reason
                }),
                ...(targetStatus === config_1.CONFIG.BATCH_STATUS.REVIEWED && {
                    reviewedAt: new Date(),
                    reviewedBy: userId
                }),
                ...(targetStatus === config_1.CONFIG.BATCH_STATUS.SETTLED && {
                    settledAt: new Date(),
                    settledBy: userId,
                    settleRemark: reason
                })
            }
        });
        await tx.statusHistory.create({
            data: {
                batchId,
                fromStatus: currentStatus,
                toStatus: targetStatus,
                reason,
                operatorRole: userRole,
                operatedBy: userId
            }
        });
        return updated;
    });
}
async function transitionRecord(recordId, targetStatus, userId, userRole, reason) {
    const record = await prisma_1.prisma.record.findUnique({ where: { id: recordId } });
    if (!record)
        throw new Error('记录不存在');
    const currentStatus = record.status;
    if (!canTransitionRecord(currentStatus, targetStatus, userRole)) {
        throw new Error(`不允许从 ${currentStatus} 转换到 ${targetStatus}`);
    }
    return await prisma_1.prisma.$transaction(async (tx) => {
        const updated = await tx.record.update({
            where: { id: recordId },
            data: {
                status: targetStatus,
                ...(targetStatus === config_1.CONFIG.RECORD_STATUS.RESOLVED && {
                    resolvedAt: new Date(),
                    resolvedBy: userId,
                    resolveRemark: reason
                })
            }
        });
        await tx.statusHistory.create({
            data: {
                recordId,
                fromStatus: currentStatus,
                toStatus: targetStatus,
                reason,
                operatorRole: userRole,
                operatedBy: userId
            }
        });
        return updated;
    });
}
async function recalculateBatchStats(batchId) {
    const stats = await prisma_1.prisma.record.groupBy({
        by: ['status'],
        where: { batchId },
        _count: true,
        _sum: { amount: true }
    });
    const statusCounts = {};
    let totalAmount = 0;
    let totalCount = 0;
    for (const stat of stats) {
        statusCounts[stat.status] = stat._count;
        totalCount += stat._count;
        totalAmount += stat._sum.amount?.toNumber() || 0;
    }
    await prisma_1.prisma.batch.update({
        where: { id: batchId },
        data: {
            totalCount,
            totalAmount,
            validCount: statusCounts[config_1.CONFIG.RECORD_STATUS.VALID] || 0,
            dirtyCount: statusCounts[config_1.CONFIG.RECORD_STATUS.DIRTY] || 0
        }
    });
}
//# sourceMappingURL=stateMachine.js.map