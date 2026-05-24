const { Ledger, LEDGER_STATUS, STOCK_DIFF_TYPE } = require('../models/Ledger');
const { DirtyRecord, DIRTY_TYPES } = require('../models/DirtyRecord');
const RefundRecord = require('../models/RefundRecord');
const RestockPhoto = require('../models/RestockPhoto');
const CabinetInventory = require('../models/CabinetInventory');
const { logOperation, OPERATION_TYPES } = require('./auditService');

const calculateInventoryDiff = (inventoryBefore, inventoryAfter) => {
  const diffs = [];
  let totalDiff = 0;
  let hasDuplicateDeduction = false;
  let hasHotSaleFull = false;

  const beforeMap = new Map(inventoryBefore.map(item => [item.compartmentId, item]));
  const afterMap = new Map(inventoryAfter.map(item => [item.compartmentId, item]));

  const allCompartmentIds = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  allCompartmentIds.forEach(compartmentId => {
    const before = beforeMap.get(compartmentId);
    const after = afterMap.get(compartmentId);

    const expectedQty = before?.quantity || 0;
    const actualQty = after?.quantity || 0;
    const diffQty = actualQty - expectedQty;
    const isHot = before?.isHot || after?.isHot || false;

    let diffType = STOCK_DIFF_TYPE.NORMAL;

    if (diffQty !== 0) {
      totalDiff += diffQty;
    }

    if (diffQty < 0) {
      diffType = STOCK_DIFF_TYPE.MISSING;
      hasDuplicateDeduction = true;
    } else if (diffQty > 0 && Math.abs(diffQty) > 5) {
      diffType = STOCK_DIFF_TYPE.OVERSTOCK;
    }

    if (isHot && actualQty > 0 && actualQty >= (after?.maxCapacity || 10) * 0.9) {
      diffType = STOCK_DIFF_TYPE.HOT_SALE_FULL;
      hasHotSaleFull = true;
    }

    diffs.push({
      compartmentId,
      productId: after?.productId || before?.productId,
      productName: after?.productName || before?.productName,
      expectedQuantity: expectedQty,
      actualQuantity: actualQty,
      diffQuantity: diffQty,
      diffType,
      isHot,
      remark: ''
    });
  });

  return {
    diffs,
    totalDiff,
    hasDuplicateDeduction,
    hasHotSaleFull
  };
};

const createLedger = async (user, data, ip) => {
  const ledger = new Ledger({
    ...data,
    createdBy: user._id,
    status: LEDGER_STATUS.DRAFT,
    city: user.city
  });

  if (data.inventoryBefore && data.inventoryAfter) {
    const diffResult = calculateInventoryDiff(data.inventoryBefore, data.inventoryAfter);
    ledger.inventoryDiffs = diffResult.diffs;
    ledger.totalDiffQuantity = diffResult.totalDiff;
    ledger.hasDuplicateDeduction = diffResult.hasDuplicateDeduction;
    ledger.hasHotSaleFull = diffResult.hasHotSaleFull;
  }

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.CREATE,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    afterData: ledger.toObject(),
    ip,
    changeReason: '创建台账草稿'
  });

  return ledger;
};

const updateLedger = async (ledgerId, user, updateData, ip, changeReason) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.DRAFT && ledger.status !== LEDGER_STATUS.REJECTED) {
    throw new Error('只能编辑草稿或被驳回的台账');
  }

  const beforeData = ledger.toObject();

  ledger.previousVersions.push({
    version: ledger.version,
    snapshot: beforeData,
    changedBy: user._id,
    changedAt: new Date(),
    changeReason
  });

  Object.assign(ledger, updateData);
  ledger.version += 1;

  if (updateData.inventoryBefore && updateData.inventoryAfter) {
    const diffResult = calculateInventoryDiff(updateData.inventoryBefore, updateData.inventoryAfter);
    ledger.inventoryDiffs = diffResult.diffs;
    ledger.totalDiffQuantity = diffResult.totalDiff;
    ledger.hasDuplicateDeduction = diffResult.hasDuplicateDeduction;
    ledger.hasHotSaleFull = diffResult.hasHotSaleFull;
  }

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.UPDATE,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason
  });

  return ledger;
};

const submitLedger = async (ledgerId, user, ip) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.DRAFT && ledger.status !== LEDGER_STATUS.REJECTED) {
    throw new Error('当前状态不能提交');
  }

  const beforeData = ledger.toObject();

  ledger.status = LEDGER_STATUS.SUBMITTED;
  ledger.submittedBy = user._id;
  ledger.submittedAt = new Date();

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.SUBMIT,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason: '提交台账审核'
  });

  return ledger;
};

const rejectLedger = async (ledgerId, user, rejectReason, ip) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.SUBMITTED && ledger.status !== LEDGER_STATUS.REVIEWING) {
    throw new Error('当前状态不能驳回');
  }

  const beforeData = ledger.toObject();

  ledger.status = LEDGER_STATUS.REJECTED;
  ledger.rejectedBy = user._id;
  ledger.rejectedAt = new Date();
  ledger.rejectReason = rejectReason;

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.REJECT,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason: `驳回台账: ${rejectReason}`
  });

  return ledger;
};

const reviewLedger = async (ledgerId, user, reviewRemark, ip) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.SUBMITTED) {
    throw new Error('当前状态不能审核');
  }

  const beforeData = ledger.toObject();

  ledger.status = LEDGER_STATUS.REVIEWING;
  ledger.reviewedBy = user._id;
  ledger.reviewedAt = new Date();
  ledger.reviewRemark = reviewRemark;

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.REVIEW,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason: '审核台账'
  });

  return ledger;
};

const confirmLedger = async (ledgerId, user, ip) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.REVIEWING) {
    throw new Error('当前状态不能确认');
  }

  const beforeData = ledger.toObject();

  ledger.status = LEDGER_STATUS.CONFIRMED;

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.CONFIRM,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason: '确认台账'
  });

  return ledger;
};

const secondConfirmLedger = async (ledgerId, user, secondConfirmRemark, ip) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.CONFIRMED) {
    throw new Error('当前状态不能二次确认');
  }

  const beforeData = ledger.toObject();

  ledger.status = LEDGER_STATUS.SECOND_CONFIRM;
  ledger.secondConfirmedBy = user._id;
  ledger.secondConfirmedAt = new Date();
  ledger.secondConfirmRemark = secondConfirmRemark;

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.SECOND_CONFIRM,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason: '二次确认台账'
  });

  return ledger;
};

const finalizeLedger = async (ledgerId, user, ip) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (ledger.status !== LEDGER_STATUS.SECOND_CONFIRM) {
    throw new Error('当前状态不能结案');
  }

  const beforeData = ledger.toObject();

  ledger.status = LEDGER_STATUS.FINALIZED;
  ledger.finalizedBy = user._id;
  ledger.finalizedAt = new Date();

  await ledger.save();

  await logOperation({
    operationType: OPERATION_TYPES.FINALIZE,
    operator: user,
    targetType: 'ledger',
    targetId: ledger._id,
    targetNo: ledger.ledgerNo,
    beforeData,
    afterData: ledger.toObject(),
    ip,
    changeReason: '结案台账'
  });

  return ledger;
};

const addRefundToLedger = async (ledgerId, refundRecordId, user) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  const refundRecord = await RefundRecord.findById(refundRecordId);
  if (!refundRecord) {
    throw new Error('退款记录不存在');
  }

  if (!ledger.refundRecordIds.includes(refundRecordId)) {
    ledger.refundRecordIds.push(refundRecordId);
    ledger.totalRefundCount += 1;
    ledger.totalRefundAmount += refundRecord.refundAmount;

    if (refundRecord.isDuplicateDeduction) {
      ledger.hasDuplicateDeduction = true;
      ledger.duplicateDeductionCount += 1;
    }

    await ledger.save();
  }

  return ledger;
};

const addPhotoToLedger = async (ledgerId, photoId, user) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  if (!ledger.photoIds.includes(photoId)) {
    ledger.photoIds.push(photoId);
    await ledger.save();
  }

  return ledger;
};

const getLedgerList = async (filters = {}, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.cabinetId) query.cabinetId = filters.cabinetId;
  if (filters.city) query.city = filters.city;
  if (filters.createdBy) query.createdBy = filters.createdBy;
  if (filters.startDate && filters.endDate) {
    query.restockDate = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  const ledgers = await Ledger.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name role')
    .populate('submittedBy', 'name role');

  const total = await Ledger.countDocuments(query);

  return {
    ledgers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const getLedgerDetail = async (ledgerId) => {
  return Ledger.findById(ledgerId)
    .populate('createdBy', 'name role')
    .populate('submittedBy', 'name role')
    .populate('reviewedBy', 'name role')
    .populate('secondConfirmedBy', 'name role')
    .populate('finalizedBy', 'name role')
    .populate('photoIds')
    .populate('refundRecordIds')
    .populate('dirtyRecordIds');
};

const getLedgerVersionHistory = async (ledgerId) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    throw new Error('台账不存在');
  }

  return ledger.previousVersions.sort((a, b) => b.version - a.version);
};

module.exports = {
  createLedger,
  updateLedger,
  submitLedger,
  rejectLedger,
  reviewLedger,
  confirmLedger,
  secondConfirmLedger,
  finalizeLedger,
  addRefundToLedger,
  addPhotoToLedger,
  getLedgerList,
  getLedgerDetail,
  getLedgerVersionHistory,
  calculateInventoryDiff,
  LEDGER_STATUS
};
