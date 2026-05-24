const { getDb, runInTransaction } = require('../database');
const stateMachine = require('../state-machine');
const { ACTIONS } = require('../database/schema');
const logger = require('../utils/logger');

function recordStatusHistory({ batchId, fromStatus, toStatus, action, operator, reason, remark }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO status_history 
    (batch_id, from_status, to_status, action, operator, reason, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(batchId, fromStatus, toStatus, action, operator, reason, remark);
}

function updateBatchStatus(batchId, newStatus, previousStatus, operator) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE batches 
    SET status = ?, previous_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(newStatus, previousStatus, batchId);
}

function transitionState(batchId, action, operator, reason, remark) {
  return runInTransaction(() => {
    const db = getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    const currentStatus = batch.status;
    
    if (batch.is_frozen && action !== ACTIONS.UNFREEZE) {
      throw new Error(`Batch is frozen, only UNFREEZE action is allowed`);
    }

    stateMachine.validateTransition(currentStatus, action);
    
    const nextState = stateMachine.getNextState(currentStatus, action);
    
    if (nextState) {
      updateBatchStatus(batchId, nextState, currentStatus, operator);
      recordStatusHistory({
        batchId,
        fromStatus: currentStatus,
        toStatus: nextState,
        action,
        operator,
        reason,
        remark
      });
      
      logger.info(`State transition: batch ${batchId} ${currentStatus} -> ${nextState} via ${action}`);
      
      return {
        batchId,
        fromStatus: currentStatus,
        toStatus: nextState,
        action,
        operator
      };
    }
    
    return {
      batchId,
      status: currentStatus,
      action,
      operator,
      noStateChange: true
    };
  });
}

function freezeBatch(batchId, operator, reason) {
  return runInTransaction(() => {
    const db = getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }
    
    if (batch.is_frozen) {
      throw new Error(`Batch is already frozen`);
    }

    const previousStatus = batch.status;
    
    db.prepare(`
      UPDATE batches 
      SET is_frozen = 1, 
          frozen_at = CURRENT_TIMESTAMP, 
          frozen_by = ?,
          freeze_reason = ?,
          previous_status = ?,
          status = 'FROZEN',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(operator, reason, previousStatus, batchId);

    recordStatusHistory({
      batchId,
      fromStatus: previousStatus,
      toStatus: 'FROZEN',
      action: ACTIONS.FREEZE,
      operator,
      reason
    });

    logger.info(`Batch ${batchId} frozen by ${operator}: ${reason}`);
    
    return {
      batchId,
      frozen: true,
      previousStatus,
      frozenBy: operator,
      reason
    };
  });
}

function unfreezeBatch(batchId, operator, reason) {
  return runInTransaction(() => {
    const db = getDb();
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }
    
    if (!batch.is_frozen) {
      throw new Error(`Batch is not frozen`);
    }

    const restoreStatus = batch.previous_status || 'DRAFT';
    
    db.prepare(`
      UPDATE batches 
      SET is_frozen = 0, 
          frozen_at = NULL, 
          frozen_by = NULL,
          freeze_reason = NULL,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(restoreStatus, batchId);

    recordStatusHistory({
      batchId,
      fromStatus: 'FROZEN',
      toStatus: restoreStatus,
      action: ACTIONS.UNFREEZE,
      operator,
      reason
    });

    logger.info(`Batch ${batchId} unfrozen by ${operator}, restored to ${restoreStatus}`);
    
    return {
      batchId,
      unfrozen: true,
      restoredStatus: restoreStatus,
      unfrozenBy: operator
    };
  });
}

function getStatusHistory(batchId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM status_history 
    WHERE batch_id = ? 
    ORDER BY created_at DESC
  `).all(batchId);
}

module.exports = {
  transitionState,
  freezeBatch,
  unfreezeBatch,
  getStatusHistory,
  recordStatusHistory
};
