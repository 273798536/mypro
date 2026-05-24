import { RoleType, RecordStatus, RecordType } from '../database/schema';
import { getRechargeList, getRechargeSummary } from './rechargeService';
import { getRefundList, getRefundSummary } from './refundService';
import { getHandoverList } from './handoverService';
import { getReceiptList } from './receiptService';
import { getAllAuditTrails } from './auditService';
import { getFailedRecords, getFailedRecordStats } from './failedRecordService';

function maskSensitiveData(data: any, role: RoleType): any {
  if (role === RoleType.FINANCE || role === RoleType.AUDITOR) {
    return data;
  }

  const masked = { ...data };
  
  if (masked.member_phone) {
    masked.member_phone = masked.member_phone.slice(0, 3) + '****' + masked.member_phone.slice(7);
  }
  if (masked.member_id && role !== RoleType.STORE_MANAGER) {
    masked.member_id = '***';
  }
  
  return masked;
}

export async function getRoleBasedView(
  role: RoleType,
  options?: {
    storeId?: string;
    startTime?: number;
    endTime?: number;
  }
): Promise<any> {
  const baseView = {
    role,
    queryTime: Date.now(),
    timeRange: {
      startTime: options?.startTime,
      endTime: options?.endTime
    }
  };

  switch (role) {
    case RoleType.STORE_STAFF:
      return {
        ...baseView,
        permissions: ['create_draft', 'view_own_records'],
        data: await getStoreStaffView(options)
      };

    case RoleType.STORE_MANAGER:
      return {
        ...baseView,
        permissions: ['create', 'submit', 'reject', 'view_store_records'],
        data: await getStoreManagerView(options)
      };

    case RoleType.FINANCE:
      return {
        ...baseView,
        permissions: ['confirm', 'audit', 'view_all', 'export', 'view_change_history'],
        data: await getFinanceView(options)
      };

    case RoleType.AUDITOR:
      return {
        ...baseView,
        permissions: ['view_all', 'audit', 'export', 'view_change_history', 'view_failed_records'],
        data: await getAuditorView(options)
      };

    default:
      throw new Error('无效的角色类型');
  }
}

async function getStoreStaffView(options?: any): Promise<any> {
  return {
    rechargeRecords: (await getRechargeList({
      ...options,
      limit: 50
    })).map(r => maskSensitiveData(r, RoleType.STORE_STAFF)),
    myPendingCount: 0
  };
}

async function getStoreManagerView(options?: any): Promise<any> {
  const [rechargeSummary, refundSummary, recharges, refunds] = await Promise.all([
    getRechargeSummary(options),
    getRefundSummary(options),
    getRechargeList({ ...options, limit: 100 }),
    getRefundList({ ...options, limit: 100 })
  ]);

  return {
    summary: {
      recharge: rechargeSummary,
      refund: refundSummary
    },
    pendingApprovals: {
      recharges: recharges.filter(r => r.status === RecordStatus.SUBMITTED),
      refunds: refunds.filter(r => r.status === RecordStatus.SUBMITTED)
    },
    recentRecords: {
      recharges: recharges.map(r => maskSensitiveData(r, RoleType.STORE_MANAGER)),
      refunds: refunds.map(r => maskSensitiveData(r, RoleType.STORE_MANAGER))
    }
  };
}

async function getFinanceView(options?: any): Promise<any> {
  const [rechargeSummary, refundSummary, auditTrails, recharges, refunds, handovers, receipts] = await Promise.all([
    getRechargeSummary(options),
    getRefundSummary(options),
    getAllAuditTrails({ ...options, limit: 100 }),
    getRechargeList({ ...options, limit: 200 }),
    getRefundList({ ...options, limit: 200 }),
    getHandoverList({ ...options, limit: 50 }),
    getReceiptList({ ...options, limit: 100 })
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
          draft: recharges.filter(r => r.status === RecordStatus.DRAFT).length,
          submitted: recharges.filter(r => r.status === RecordStatus.SUBMITTED).length,
          confirmed: recharges.filter(r => r.status === RecordStatus.CONFIRMED).length,
          audited: recharges.filter(r => r.status === RecordStatus.AUDITED).length,
          rejected: recharges.filter(r => r.status === RecordStatus.REJECTED).length
        },
        refunds: {
          draft: refunds.filter(r => r.status === RecordStatus.DRAFT).length,
          submitted: refunds.filter(r => r.status === RecordStatus.SUBMITTED).length,
          confirmed: refunds.filter(r => r.status === RecordStatus.CONFIRMED).length,
          audited: refunds.filter(r => r.status === RecordStatus.AUDITED).length,
          rejected: refunds.filter(r => r.status === RecordStatus.REJECTED).length
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
      recharges: recharges.filter(r => r.status === RecordStatus.CONFIRMED),
      refunds: refunds.filter(r => r.status === RecordStatus.CONFIRMED)
    },
    handoverRecords: handovers,
    externalReceipts: receipts
  };
}

async function getAuditorView(options?: any): Promise<any> {
  const [financeView, failedRecords, failedStats] = await Promise.all([
    getFinanceView(options),
    getFailedRecords({ limit: 100 }),
    getFailedRecordStats()
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

function groupByStore(recharges: any[], refunds: any[]): any[] {
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
    if (r.status === RecordStatus.AUDITED) {
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
    if (r.status === RecordStatus.AUDITED) {
      store.refundAmount += r.refund_amount;
      store.refundCount++;
    }
  });

  return Array.from(storeMap.values());
}
