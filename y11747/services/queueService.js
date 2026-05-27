const store = require('../models/store');
const alertService = require('./alertService');

const RELEASE_STATUS = {
  PENDING: 'pending',
  LOCKED: 'locked',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

function buildQueue(db) {
  const queue = [];

  for (const order of db.orders) {
    const preAuthFlows = db.depositFlows.filter(
      f => f.orderId === order.id && f.type === 'pre_authorize'
    );

    if (preAuthFlows.length === 0) continue;

    for (const flow of preAuthFlows) {
      const existingRelease = db.releaseRecords.find(
        r => r.depositFlowId === flow.id && r.status !== RELEASE_STATUS.CANCELLED
      );

      if (existingRelease) continue;

      const damages = db.damageReports.filter(d => d.orderId === order.id);
      const totalDamage = damages.reduce((sum, d) => sum + d.amount, 0);
      const lateFee = order.lateCheckout ? order.lateCheckout.totalFee : 0;
      const totalDeductions = totalDamage + lateFee;
      const releaseAmount = Math.max(0, order.depositAmount - totalDeductions);

      const receipt = db.channelReceipts.find(
        r => r.orderId === order.id && r.channelRef === flow.channelRef
      );

      const issues = [];
      if (damages.some(d => d.status === 'pending')) {
        issues.push('damage_pending');
      }
      if (order.channel !== 'direct' && (!receipt || receipt.status !== 'confirmed')) {
        issues.push('channel_receipt_pending');
      }
      if (totalDeductions > order.depositAmount) {
        issues.push('deposit_shortage');
      }

      queue.push({
        orderId: order.id,
        customerName: order.customerName,
        roomNo: order.roomNo,
        channel: order.channel,
        depositFlowId: flow.id,
        channelRef: flow.channelRef,
        depositAmount: order.depositAmount,
        totalDamage,
        lateFee,
        totalDeductions,
        releaseAmount,
        checkOutDate: order.checkOutDate,
        damageIds: damages.map(d => d.id),
        receiptStatus: receipt ? receipt.status : 'not_received',
        issues,
        canRelease: issues.length === 0,
        status: RELEASE_STATUS.PENDING
      });
    }
  }

  return queue;
}

function lockDeposit(db, depositFlowId) {
  const flow = db.depositFlows.find(f => f.id === depositFlowId);
  if (!flow) throw new Error(`押金流水 ${depositFlowId} 不存在`);

  const activeRelease = db.releaseRecords.find(
    r => r.depositFlowId === depositFlowId && r.status !== RELEASE_STATUS.CANCELLED
  );
  if (activeRelease) {
    throw new Error(`押金流水 ${depositFlowId} 已有释放记录 ${activeRelease.id}，无法锁定`);
  }

  const lockId = store.genId('LOCK');
  db.releaseRecords.push({
    id: store.genId('REL'),
    depositFlowId,
    orderId: flow.orderId,
    amount: 0,
    status: RELEASE_STATUS.LOCKED,
    lockedBy: 'system',
    lockedAt: store.nowIso(),
    lockId,
    releaseHistory: [{
      action: 'lock',
      timestamp: store.nowIso(),
      by: 'system'
    }]
  });

  store.audit(db, 'release', lockId, 'lock', { depositFlowId });
  return { lockId, depositFlowId, orderId: flow.orderId };
}

function deductDamage(db, orderId, damageId) {
  const order = db.orders.find(o => o.id === orderId);
  if (!order) throw new Error(`订单 ${orderId} 不存在`);

  const damage = db.damageReports.find(d => d.id === damageId && d.orderId === orderId);
  if (!damage) throw new Error(`客损单 ${damageId} 不存在`);
  if (damage.status === 'deducted') throw new Error(`客损单 ${damageId} 已抵扣`);

  damage.status = 'deducted';
  damage.deductedAt = store.nowIso();
  damage.deductedFrom = 'deposit';

  store.audit(db, 'damage', damageId, 'deduct', { orderId, amount: damage.amount });
  return damage;
}

function processRelease(db, queueItem) {
  const { orderId, depositFlowId, releaseAmount } = queueItem;

  const lockedRelease = db.releaseRecords.find(
    r => r.depositFlowId === depositFlowId && r.status === RELEASE_STATUS.LOCKED
  );

  let releaseRecord;
  if (lockedRelease) {
    releaseRecord = lockedRelease;
    releaseRecord.amount = releaseAmount;
    releaseRecord.status = RELEASE_STATUS.PROCESSING;
  } else {
    releaseRecord = {
      id: store.genId('REL'),
      depositFlowId,
      orderId,
      amount: releaseAmount,
      status: RELEASE_STATUS.PROCESSING,
      lockedBy: 'system',
      lockedAt: store.nowIso(),
      releaseHistory: [{
        action: 'lock',
        timestamp: store.nowIso(),
        by: 'system'
      }]
    };
    db.releaseRecords.push(releaseRecord);
  }

  releaseRecord.releaseHistory.push({
    action: 'process',
    timestamp: store.nowIso(),
    releaseAmount,
    source: 'queue_processor'
  });

  store.audit(db, 'release', releaseRecord.id, 'process', { orderId, amount: releaseAmount });
  return releaseRecord;
}

function completeRelease(db, releaseId, channelReceiptData) {
  const release = db.releaseRecords.find(r => r.id === releaseId);
  if (!release) throw new Error(`释放记录 ${releaseId} 不存在`);

  release.status = RELEASE_STATUS.COMPLETED;
  release.completedAt = store.nowIso();
  release.channelReceipt = channelReceiptData || null;
  release.releaseHistory.push({
    action: 'complete',
    timestamp: store.nowIso(),
    channelReceipt: channelReceiptData || null
  });

  store.audit(db, 'release', releaseId, 'complete', {});
  return release;
}

function failRelease(db, releaseId, reason) {
  const release = db.releaseRecords.find(r => r.id === releaseId);
  if (!release) throw new Error(`释放记录 ${releaseId} 不存在`);

  release.status = RELEASE_STATUS.FAILED;
  release.failedAt = store.nowIso();
  release.failureReason = reason;
  release.releaseHistory.push({
    action: 'fail',
    timestamp: store.nowIso(),
    reason
  });

  store.audit(db, 'release', releaseId, 'fail', { reason });
  return release;
}

function retryRelease(db, releaseId) {
  const release = db.releaseRecords.find(r => r.id === releaseId);
  if (!release) throw new Error(`释放记录 ${releaseId} 不存在`);
  if (release.status !== RELEASE_STATUS.FAILED) throw new Error(`释放记录 ${releaseId} 非失败状态，无需重试`);

  release.status = RELEASE_STATUS.PROCESSING;
  release.retryCount = (release.retryCount || 0) + 1;
  release.releaseHistory.push({
    action: 'retry',
    timestamp: store.nowIso(),
    attempt: release.retryCount
  });

  store.audit(db, 'release', releaseId, 'retry', { attempt: release.retryCount });
  return release;
}

function cancelRelease(db, releaseId, reason) {
  const release = db.releaseRecords.find(r => r.id === releaseId);
  if (!release) throw new Error(`释放记录 ${releaseId} 不存在`);

  release.status = RELEASE_STATUS.CANCELLED;
  release.cancelledAt = store.nowIso();
  release.cancellationReason = reason;
  release.releaseHistory.push({
    action: 'cancel',
    timestamp: store.nowIso(),
    reason
  });

  store.audit(db, 'release', releaseId, 'cancel', { reason });
  return release;
}

function getOrderReleaseSummary(db, orderId) {
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return null;

  const flows = db.depositFlows.filter(f => f.orderId === orderId);
  const damages = db.damageReports.filter(d => d.orderId === orderId);
  const releases = db.releaseRecords.filter(r => r.orderId === orderId);
  const receipts = db.channelReceipts.filter(r => r.orderId === orderId);

  return {
    order,
    depositFlows: flows,
    damageReports: damages,
    releaseRecords: releases,
    channelReceipts: receipts,
    totalDeposit: flows.filter(f => f.type === 'pre_authorize').reduce((s, f) => s + f.amount, 0),
    totalDamage: damages.reduce((s, d) => s + d.amount, 0),
    lateFee: order.lateCheckout ? order.lateCheckout.totalFee : 0,
    totalReleased: releases.filter(r => r.status === RELEASE_STATUS.COMPLETED).reduce((s, r) => s + r.amount, 0)
  };
}

function processAllReady(db) {
  const queue = buildQueue(db);
  const ready = queue.filter(q => q.canRelease);
  const results = [];

  for (const item of ready) {
    try {
      lockDeposit(db, item.depositFlowId);
      const release = processRelease(db, item);
      const simulatedReceipt = {
        orderId: item.orderId,
        channel: item.channel,
        channelRef: item.channelRef,
        receiptTime: store.nowIso(),
        status: 'confirmed',
        rawResponse: JSON.stringify({ code: '0', msg: 'ok', amount: item.releaseAmount })
      };

      if (item.channel === 'direct') {
        completeRelease(db, release.id, simulatedReceipt);
      } else {
        completeRelease(db, release.id, simulatedReceipt);
        db.channelReceipts.push({
          id: store.genId('REC'),
          ...simulatedReceipt
        });
      }
      results.push({ orderId: item.orderId, status: 'completed', releaseAmount: item.releaseAmount });
    } catch (e) {
      results.push({ orderId: item.orderId, status: 'error', error: e.message });
    }
  }

  alertService.mergeAndSaveAlerts(db);
  return { processed: results, skipped: queue.filter(q => !q.canRelease) };
}

module.exports = {
  RELEASE_STATUS,
  buildQueue,
  lockDeposit,
  deductDamage,
  processRelease,
  completeRelease,
  failRelease,
  retryRelease,
  cancelRelease,
  getOrderReleaseSummary,
  processAllReady
};