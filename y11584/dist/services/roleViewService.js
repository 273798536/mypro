"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleBasedView = getRoleBasedView;
const schema_1 = require("../database/schema");
const rechargeService_1 = require("./rechargeService");
const refundService_1 = require("./refundService");
const handoverService_1 = require("./handoverService");
const receiptService_1 = require("./receiptService");
const auditService_1 = require("./auditService");
const failedRecordService_1 = require("./failedRecordService");
function maskSensitiveData(data, role) {
    if (role === schema_1.RoleType.FINANCE || role === schema_1.RoleType.AUDITOR) {
        return data;
    }
    const masked = { ...data };
    if (masked.member_phone) {
        masked.member_phone = masked.member_phone.slice(0, 3) + '****' + masked.member_phone.slice(7);
    }
    if (masked.member_id && role !== schema_1.RoleType.STORE_MANAGER) {
        masked.member_id = '***';
    }
    return masked;
}
async function getRoleBasedView(role, options) {
    const baseView = {
        role,
        queryTime: Date.now(),
        timeRange: {
            startTime: options?.startTime,
            endTime: options?.endTime
        }
    };
    switch (role) {
        case schema_1.RoleType.STORE_STAFF:
            return {
                ...baseView,
                permissions: ['create_draft', 'view_own_records'],
                data: await getStoreStaffView(options)
            };
        case schema_1.RoleType.STORE_MANAGER:
            return {
                ...baseView,
                permissions: ['create', 'submit', 'reject', 'view_store_records'],
                data: await getStoreManagerView(options)
            };
        case schema_1.RoleType.FINANCE:
            return {
                ...baseView,
                permissions: ['confirm', 'audit', 'view_all', 'export', 'view_change_history'],
                data: await getFinanceView(options)
            };
        case schema_1.RoleType.AUDITOR:
            return {
                ...baseView,
                permissions: ['view_all', 'audit', 'export', 'view_change_history', 'view_failed_records'],
                data: await getAuditorView(options)
            };
        default:
            throw new Error('无效的角色类型');
    }
}
async function getStoreStaffView(options) {
    return {
        rechargeRecords: (await (0, rechargeService_1.getRechargeList)({
            ...options,
            limit: 50
        })).map(r => maskSensitiveData(r, schema_1.RoleType.STORE_STAFF)),
        myPendingCount: 0
    };
}
async function getStoreManagerView(options) {
    const [rechargeSummary, refundSummary, recharges, refunds] = await Promise.all([
        (0, rechargeService_1.getRechargeSummary)(options),
        (0, refundService_1.getRefundSummary)(options),
        (0, rechargeService_1.getRechargeList)({ ...options, limit: 100 }),
        (0, refundService_1.getRefundList)({ ...options, limit: 100 })
    ]);
    return {
        summary: {
            recharge: rechargeSummary,
            refund: refundSummary
        },
        pendingApprovals: {
            recharges: recharges.filter(r => r.status === schema_1.RecordStatus.SUBMITTED),
            refunds: refunds.filter(r => r.status === schema_1.RecordStatus.SUBMITTED)
        },
        recentRecords: {
            recharges: recharges.map(r => maskSensitiveData(r, schema_1.RoleType.STORE_MANAGER)),
            refunds: refunds.map(r => maskSensitiveData(r, schema_1.RoleType.STORE_MANAGER))
        }
    };
}
async function getFinanceView(options) {
    const [rechargeSummary, refundSummary, auditTrails, recharges, refunds, handovers, receipts] = await Promise.all([
        (0, rechargeService_1.getRechargeSummary)(options),
        (0, refundService_1.getRefundSummary)(options),
        (0, auditService_1.getAllAuditTrails)({ ...options, limit: 100 }),
        (0, rechargeService_1.getRechargeList)({ ...options, limit: 200 }),
        (0, refundService_1.getRefundList)({ ...options, limit: 200 }),
        (0, handoverService_1.getHandoverList)({ ...options, limit: 50 }),
        (0, receiptService_1.getReceiptList)({ ...options, limit: 100 })
    ]);
    return {
        financialSummary: {
            totalRechargeAmount: rechargeSummary.verified_amount || 0,
            totalRefundAmount: refundSummary.verified_amount || 0,
            netRecharge: (rechargeSummary.verified_amount || 0) - (refundSummary.verified_amount || 0),
            pendingRechargeCount: rechargeSummary.pending_count || 0,
            pendingRefundCount: refundSummary.pending_count || 0
        },
        breakdown: {
            byStatus: {
                recharges: {
                    draft: recharges.filter(r => r.status === schema_1.RecordStatus.DRAFT).length,
                    submitted: recharges.filter(r => r.status === schema_1.RecordStatus.SUBMITTED).length,
                    confirmed: recharges.filter(r => r.status === schema_1.RecordStatus.CONFIRMED).length,
                    audited: recharges.filter(r => r.status === schema_1.RecordStatus.AUDITED).length,
                    rejected: recharges.filter(r => r.status === schema_1.RecordStatus.REJECTED).length
                },
                refunds: {
                    draft: refunds.filter(r => r.status === schema_1.RecordStatus.DRAFT).length,
                    submitted: refunds.filter(r => r.status === schema_1.RecordStatus.SUBMITTED).length,
                    confirmed: refunds.filter(r => r.status === schema_1.RecordStatus.CONFIRMED).length,
                    audited: refunds.filter(r => r.status === schema_1.RecordStatus.AUDITED).length,
                    rejected: refunds.filter(r => r.status === schema_1.RecordStatus.REJECTED).length
                }
            },
            byStore: groupByStore(recharges, refunds)
        },
        changeHistory: auditTrails.map(t => ({
            ...t,
            change_reason: t.change_reason,
            changed_fields: t.changed_fields ? JSON.parse(t.changed_fields) : null
        })),
        pendingConfirmations: {
            recharges: recharges.filter(r => r.status === schema_1.RecordStatus.CONFIRMED),
            refunds: refunds.filter(r => r.status === schema_1.RecordStatus.CONFIRMED)
        },
        handoverRecords: handovers,
        externalReceipts: receipts
    };
}
async function getAuditorView(options) {
    const [financeView, failedRecords, failedStats] = await Promise.all([
        getFinanceView(options),
        (0, failedRecordService_1.getFailedRecords)({ limit: 100 }),
        (0, failedRecordService_1.getFailedRecordStats)()
    ]);
    return {
        ...financeView,
        dataQuality: {
            failedRecords,
            failedStats,
            totalFailed: failedRecords.length
        }
    };
}
function groupByStore(recharges, refunds) {
    const storeMap = new Map();
    recharges.forEach(r => {
        if (!storeMap.has(r.store_id)) {
            storeMap.set(r.store_id, {
                storeId: r.store_id,
                storeName: r.store_name,
                rechargeAmount: 0,
                refundAmount: 0,
                rechargeCount: 0,
                refundCount: 0
            });
        }
        const store = storeMap.get(r.store_id);
        if (r.status === schema_1.RecordStatus.AUDITED) {
            store.rechargeAmount += r.amount;
            store.rechargeCount++;
        }
    });
    refunds.forEach(r => {
        if (!storeMap.has(r.store_id)) {
            storeMap.set(r.store_id, {
                storeId: r.store_id,
                storeName: r.store_name,
                rechargeAmount: 0,
                refundAmount: 0,
                rechargeCount: 0,
                refundCount: 0
            });
        }
        const store = storeMap.get(r.store_id);
        if (r.status === schema_1.RecordStatus.AUDITED) {
            store.refundAmount += r.refund_amount;
            store.refundCount++;
        }
    });
    return Array.from(storeMap.values());
}
