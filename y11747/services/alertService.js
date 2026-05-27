const store = require('../models/store');

const ALERT_TYPES = {
  DAMAGE_NOT_DEDUCTED: 'damage_not_deducted',
  CHANNEL_RECEIPT_DELAYED: 'channel_receipt_delayed',
  DUPLICATE_RELEASE: 'duplicate_release',
  DEPOSIT_SHORTAGE: 'deposit_shortage',
  RELEASE_EXCEEDS_DEPOSIT: 'release_exceeds_deposit'
};

const SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

function detectAllAlerts(db) {
  const alerts = [];

  alerts.push(...detectDamageNotDeducted(db));
  alerts.push(...detectChannelReceiptDelayed(db));
  alerts.push(...detectDuplicateRelease(db));
  alerts.push(...detectDepositShortage(db));

  return alerts;
}

function detectDamageNotDeducted(db) {
  const alerts = [];
  for (const dmg of db.damageReports) {
    if (dmg.status !== 'pending') continue;
    if (dmg.deducted) continue;

    const order = db.orders.find(o => o.id === dmg.orderId);
    if (!order) continue;

    const hasRelease = db.releaseRecords.some(
      r => r.orderId === dmg.orderId && r.status !== 'cancelled'
    );

    if (hasRelease) {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.DAMAGE_NOT_DEDUCTED,
        orderId: dmg.orderId,
        severity: SEVERITY.HIGH,
        message: `订单 ${order.id} 存在客损单 ${dmg.id}（¥${dmg.amount}）未抵扣，但已有释放记录`,
        damageId: dmg.id,
        damageAmount: dmg.amount,
        timestamp: store.nowIso(),
        resolved: false
      });
    } else {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.DAMAGE_NOT_DEDUCTED,
        orderId: dmg.orderId,
        severity: SEVERITY.MEDIUM,
        message: `订单 ${order.id} 存在待处理客损单 ${dmg.id}（¥${dmg.amount}），释放前需确认抵扣`,
        damageId: dmg.id,
        damageAmount: dmg.amount,
        timestamp: store.nowIso(),
        resolved: false
      });
    }
  }
  return alerts;
}

function detectChannelReceiptDelayed(db) {
  const alerts = [];
  const now = Date.now();

  for (const order of db.orders) {
    if (order.channel === 'direct') continue;

    const preAuthFlow = db.depositFlows.find(
      f => f.orderId === order.id && f.type === 'pre_authorize'
    );
    if (!preAuthFlow) continue;

    const receipt = db.channelReceipts.find(
      r => r.orderId === order.id && r.channelRef === preAuthFlow.channelRef
    );

    const hasRelease = db.releaseRecords.some(
      r => r.orderId === order.id && r.status !== 'cancelled'
    );

    if (!receipt && hasRelease) {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.CHANNEL_RECEIPT_DELAYED,
        orderId: order.id,
        severity: SEVERITY.HIGH,
        message: `订单 ${order.id}（${order.channel}）已释放押金但渠道回执缺失，释放金额可能未实际到账`,
        channel: order.channel,
        channelRef: preAuthFlow.channelRef,
        timestamp: store.nowIso(),
        resolved: false
      });
    } else if (!receipt) {
      const checkOutDate = new Date(order.checkOutDate);
      const hoursSinceCheckout = (now - checkOutDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheckout > 0) {
        alerts.push({
          id: store.genId('ALT'),
          type: ALERT_TYPES.CHANNEL_RECEIPT_DELAYED,
          orderId: order.id,
          severity: SEVERITY.MEDIUM,
          message: `订单 ${order.id}（${order.channel}）退房已超过 ${Math.floor(hoursSinceCheckout)} 小时，渠道回执仍未收到`,
          channel: order.channel,
          channelRef: preAuthFlow.channelRef,
          hoursSinceCheckout: Math.floor(hoursSinceCheckout),
          timestamp: store.nowIso(),
          resolved: false
        });
      }
    } else if (receipt.status === 'pending') {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.CHANNEL_RECEIPT_DELAYED,
        orderId: order.id,
        severity: SEVERITY.MEDIUM,
        message: `订单 ${order.id}（${order.channel}）渠道回执状态为 pending，请确认渠道处理进度`,
        channel: order.channel,
        channelRef: preAuthFlow.channelRef,
        timestamp: store.nowIso(),
        resolved: false
      });
    }
  }
  return alerts;
}

function detectDuplicateRelease(db) {
  const alerts = [];

  for (const flow of db.depositFlows) {
    if (flow.type !== 'pre_authorize') continue;

    const releases = db.releaseRecords.filter(
      r => r.depositFlowId === flow.id && r.status !== 'cancelled'
    );

    if (releases.length > 1) {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.DUPLICATE_RELEASE,
        orderId: flow.orderId,
        severity: SEVERITY.HIGH,
        message: `押金流水 ${flow.id} 存在 ${releases.length} 条释放记录，疑似重复释放`,
        depositFlowId: flow.id,
        releaseCount: releases.length,
        releaseIds: releases.map(r => r.id),
        timestamp: store.nowIso(),
        resolved: false
      });
    }
  }

  const seenRefs = {};
  for (const flow of db.depositFlows) {
    if (flow.type !== 'pre_authorize') continue;
    if (!flow.channelRef) continue;

    if (seenRefs[flow.channelRef]) {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.DUPLICATE_RELEASE,
        orderId: flow.orderId,
        severity: SEVERITY.HIGH,
        message: `渠道参考号 ${flow.channelRef} 在多条押金流水中出现，疑似重复记录`,
        channelRef: flow.channelRef,
        duplicateFlowIds: [seenRefs[flow.channelRef], flow.id],
        timestamp: store.nowIso(),
        resolved: false
      });
    } else {
      seenRefs[flow.channelRef] = flow.id;
    }
  }

  return alerts;
}

function detectDepositShortage(db) {
  const alerts = [];
  for (const dmg of db.damageReports) {
    if (dmg.status !== 'pending') continue;

    const order = db.orders.find(o => o.id === dmg.orderId);
    if (!order) continue;

    if (dmg.amount > order.depositAmount) {
      alerts.push({
        id: store.genId('ALT'),
        type: ALERT_TYPES.DEPOSIT_SHORTAGE,
        orderId: order.id,
        severity: SEVERITY.HIGH,
        message: `订单 ${order.id} 客损 ¥${dmg.amount} 超过押金 ¥${order.depositAmount}，缺口 ¥${dmg.amount - order.depositAmount}`,
        damageId: dmg.id,
        damageAmount: dmg.amount,
        depositAmount: order.depositAmount,
        shortage: dmg.amount - order.depositAmount,
        timestamp: store.nowIso(),
        resolved: false
      });
    }
  }
  return alerts;
}

function isAlertStillValid(db, alert) {
  if (alert.resolved) return false;

  if (alert.type === ALERT_TYPES.DAMAGE_NOT_DEDUCTED) {
    const dmg = db.damageReports.find(d => d.id === alert.damageId);
    if (!dmg) return false;
    if (dmg.status === 'deducted' || dmg.status === 'waived') return false;
    return true;
  }

  if (alert.type === ALERT_TYPES.CHANNEL_RECEIPT_DELAYED) {
    const order = db.orders.find(o => o.id === alert.orderId);
    if (!order) return false;
    if (order.channel === 'direct') return false;
    const receipt = db.channelReceipts.find(
      r => r.orderId === alert.orderId && r.channelRef === alert.channelRef && r.status === 'confirmed'
    );
    if (receipt) return false;
    return true;
  }

  if (alert.type === ALERT_TYPES.DUPLICATE_RELEASE) {
    if (alert.depositFlowId) {
      const releases = db.releaseRecords.filter(
        r => r.depositFlowId === alert.depositFlowId && r.status !== 'cancelled'
      );
      if (releases.length <= 1) return false;
    }
    if (alert.channelRef) {
      const matchingFlows = db.depositFlows.filter(
        f => f.type === 'pre_authorize' && f.channelRef === alert.channelRef
      );
      if (matchingFlows.length <= 1) return false;
    }
    return true;
  }

  if (alert.type === ALERT_TYPES.DEPOSIT_SHORTAGE) {
    const dmg = db.damageReports.find(d => d.id === alert.damageId);
    if (!dmg) return false;
    if (dmg.status === 'deducted' || dmg.status === 'waived') return false;
    const order = db.orders.find(o => o.id === alert.orderId);
    if (!order) return false;
    if (dmg.amount <= order.depositAmount) return false;
    return true;
  }

  return true;
}

function mergeAndSaveAlerts(db) {
  const newAlerts = detectAllAlerts(db);
  const existingUnresolved = db.alerts.filter(a => !a.resolved);

  const stillValid = [];
  const autoResolved = [];
  for (const alert of existingUnresolved) {
    if (isAlertStillValid(db, alert)) {
      stillValid.push(alert);
    } else {
      alert.resolved = true;
      alert.resolvedAt = store.nowIso();
      alert.autoResolved = true;
      autoResolved.push(alert.id);
    }
  }

  const merged = [...stillValid, ...db.alerts.filter(a => a.resolved)];
  for (const na of newAlerts) {
    const dup = merged.find(
      a => !a.resolved && a.type === na.type && a.orderId === na.orderId &&
        (a.damageId === na.damageId || a.depositFlowId === na.depositFlowId || a.channelRef === na.channelRef)
    );
    if (!dup) {
      merged.push(na);
    }
  }

  db.alerts = merged;
  store.audit(db, 'alerts', 'batch', 'detect', {
    newCount: newAlerts.length,
    autoResolvedCount: autoResolved.length
  });
  return db.alerts;
}

function resolveAlert(db, alertId) {
  const alert = db.alerts.find(a => a.id === alertId);
  if (!alert) return null;
  alert.resolved = true;
  alert.resolvedAt = store.nowIso();
  store.audit(db, 'alerts', alertId, 'resolve', {});
  return alert;
}

module.exports = {
  ALERT_TYPES,
  SEVERITY,
  detectAllAlerts,
  detectDamageNotDeducted,
  detectChannelReceiptDelayed,
  detectDuplicateRelease,
  detectDepositShortage,
  mergeAndSaveAlerts,
  resolveAlert
};