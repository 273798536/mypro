const reviewDao = require('../dao/reviewDao');
const materialDao = require('../dao/materialDao');
const migrationDao = require('../dao/migrationDao');
const auditDao = require('../dao/auditDao');
const { ENTITY_TYPES, ACTIONS } = auditDao;
const { ITEM_STATUS, ITEM_TYPES, ROUND_STATUS } = reviewDao;

async function addReviewItem(roundId, materialId, itemType, initialConclusion = '', operator) {
  const round = await reviewDao.getReviewRoundById(roundId);
  if (!round) throw new Error('复核轮次不存在');
  if (round.status === ROUND_STATUS.COMPLETED) throw new Error('复核轮次已完成，不能添加复核项');

  const material = await materialDao.getMaterialById(materialId);
  if (!material) throw new Error('材料不存在');

  const item = await reviewDao.createReviewItem({
    review_round_id: roundId,
    material_id: materialId,
    item_type: itemType,
    initial_conclusion: initialConclusion
  });

  await reviewDao.createConclusionSnapshot({
    review_item_id: item.id,
    snapshot_version: 1,
    conclusion_text: initialConclusion,
    status: ITEM_STATUS.PENDING,
    snapshot_by: operator
  });

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.REVIEW_ITEM,
    entity_id: item.id,
    action: ACTIONS.CREATE,
    reason: `添加复核项: ${getItemTypeLabel(itemType)}`,
    operator
  });

  return item;
}

async function reviewItem(itemId, conclusion, status, operator, reason = '') {
  const item = await reviewDao.getReviewItemById(itemId);
  if (!item) throw new Error('复核项不存在');

  const oldConclusion = item.final_conclusion || item.initial_conclusion;
  const oldStatus = item.status;

  const updatedItem = await reviewDao.updateReviewItemConclusion(
    itemId,
    conclusion,
    status,
    operator,
    reason
  );

  const snapshots = await reviewDao.getSnapshotsByReviewItem(itemId);
  const nextVersion = snapshots.length + 1;

  await reviewDao.createConclusionSnapshot({
    review_item_id: itemId,
    snapshot_version: nextVersion,
    conclusion_text: conclusion,
    status: status,
    snapshot_by: operator
  });

  if (oldConclusion !== conclusion) {
    await auditDao.createAuditLog({
      entity_type: ENTITY_TYPES.CONCLUSION,
      entity_id: itemId,
      action: ACTIONS.UPDATE,
      field_name: 'conclusion',
      old_value: oldConclusion,
      new_value: conclusion,
      reason: reason || '结论变更',
      operator
    });
  }

  if (oldStatus !== status) {
    await auditDao.createAuditLog({
      entity_type: ENTITY_TYPES.REVIEW_ITEM,
      entity_id: itemId,
      action: getStatusChangeAction(status),
      field_name: 'status',
      old_value: oldStatus,
      new_value: status,
      reason: reason || '状态变更',
      operator
    });
  }

  return updatedItem;
}

async function reevaluateItem(itemId, newConclusion, operator, reason = '') {
  const item = await reviewDao.getReviewItemById(itemId);
  if (!item) throw new Error('复核项不存在');

  const oldConclusion = item.final_conclusion || item.initial_conclusion;
  const oldStatus = item.status;

  const updatedItem = await reviewDao.updateReviewItemConclusion(
    itemId,
    newConclusion,
    ITEM_STATUS.REEVALUATED,
    operator,
    reason
  );

  const snapshots = await reviewDao.getSnapshotsByReviewItem(itemId);
  const nextVersion = snapshots.length + 1;

  await reviewDao.createConclusionSnapshot({
    review_item_id: itemId,
    snapshot_version: nextVersion,
    conclusion_text: newConclusion,
    status: ITEM_STATUS.REEVALUATED,
    snapshot_by: operator
  });

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.CONCLUSION,
    entity_id: itemId,
    action: ACTIONS.REEVALUATE,
    field_name: 'conclusion',
    old_value: oldConclusion,
    new_value: newConclusion,
    reason: reason || '慢查询归因改变判断',
    operator
  });

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.REVIEW_ITEM,
    entity_id: itemId,
    action: ACTIONS.REEVALUATE,
    field_name: 'status',
    old_value: oldStatus,
    new_value: ITEM_STATUS.REEVALUATED,
    reason: reason || '重新评估结论',
    operator
  });

  return updatedItem;
}

async function getReviewRound(roundId) {
  const round = await reviewDao.getReviewRoundById(roundId);
  if (!round) return null;

  const items = await reviewDao.getReviewItemsByRound(roundId);
  const itemsWithDetails = [];

  for (const item of items) {
    const material = await materialDao.getMaterialById(item.material_id);
    const snapshots = await reviewDao.getSnapshotsByReviewItem(item.id);
    itemsWithDetails.push({
      ...item,
      material,
      snapshots
    });
  }

  return {
    ...round,
    review_items: itemsWithDetails
  };
}

async function getReviewItem(itemId) {
  const item = await reviewDao.getReviewItemById(itemId);
  if (!item) return null;

  const material = await materialDao.getMaterialById(item.material_id);
  const snapshots = await reviewDao.getSnapshotsByReviewItem(item.id);

  return {
    ...item,
    material,
    snapshots
  };
}

async function getConclusionComparison(itemId) {
  const item = await reviewDao.getReviewItemById(itemId);
  if (!item) throw new Error('复核项不存在');

  const snapshots = await reviewDao.getSnapshotsByReviewItem(item.id);
  const material = await materialDao.getMaterialById(item.material_id);

  return {
    review_item_id: itemId,
    item_type: item.item_type,
    material_title: material.title,
    versions: snapshots.map(s => ({
      version: s.snapshot_version,
      conclusion: s.conclusion_text,
      status: s.status,
      operator: s.snapshot_by,
      at: s.snapshot_at
    })),
    side_by_side: {
      old: snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null,
      new: snapshots.length >= 1 ? snapshots[snapshots.length - 1] : null
    }
  };
}

async function completeReviewRound(roundId, conclusionSummary, operator) {
  const round = await reviewDao.getReviewRoundById(roundId);
  if (!round) throw new Error('复核轮次不存在');
  if (round.status === ROUND_STATUS.COMPLETED) throw new Error('复核轮次已完成');

  const items = await reviewDao.getReviewItemsByRound(roundId);
  const allReviewed = items.every(item => item.status !== ITEM_STATUS.PENDING);

  if (!allReviewed) {
    throw new Error('存在未复核的项目，请先完成所有复核项');
  }

  const completedRound = await reviewDao.completeReviewRound(roundId, conclusionSummary);

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.REVIEW_ROUND,
    entity_id: roundId,
    action: ACTIONS.COMPLETE,
    reason: conclusionSummary || '复核轮次完成',
    operator
  });

  return completedRound;
}

async function getReviewRoundsByMigration(migrationId) {
  return reviewDao.getReviewRoundsByMigration(migrationId);
}

function getStatusChangeAction(status) {
  const actions = {
    approved: ACTIONS.APPROVE,
    rejected: ACTIONS.REJECT,
    reevaluated: ACTIONS.REEVALUATE
  };
  return actions[status] || ACTIONS.UPDATE;
}

function getItemTypeLabel(type) {
  const labels = {
    pagination_order: '分页顺序不稳定',
    slow_query_attribution: '慢查询归因',
    permission_check: '权限检查',
    table_structure: '表结构检查'
  };
  return labels[type] || type;
}

module.exports = {
  addReviewItem,
  reviewItem,
  reevaluateItem,
  getReviewRound,
  getReviewItem,
  getConclusionComparison,
  completeReviewRound,
  getReviewRoundsByMigration,
  ITEM_STATUS,
  ITEM_TYPES,
  ROUND_STATUS,
  getItemTypeLabel
};
